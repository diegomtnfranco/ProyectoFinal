import { 
  Injectable, 
  NotFoundException, 
  ConflictException, 
  BadRequestException,
  ForbiddenException
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, LessThan, In, MoreThan, EntityManager } from 'typeorm';
import { Occupancy } from './entities/occupancy.entity';
import { Space, SpaceStatus } from '../spaces/entities/space.entity';
import { Reservation, ReservationStatus } from '../reservations/entities/reservation.entity';
import { CheckInDto } from './dto/check-in.dto';
import { CheckOutDto } from './dto/check-out.dto';
import { ActiveOccupancyResponseDto } from './dto/active-occupancy-response.dto';
import { RatesService } from '../rates/rates.service';
import { UserRole } from '../users/entities/user.entity';
import { WebsocketGateway } from '../websocket/websocket.gateway';
import { VehicleType } from '../common/enums/vehicle-type.enum';
import { ParkingLotsService } from '../parking-lots/parking-lots.service';
import { AnonymousCheckInDto } from './dto/anonymous-check-in.dto';
import { AnonymousCheckInResponseDto, AnonymousCheckOutResponseDto } from './dto/anonymous-response.dto';
import { AnonymousCheckOutDto } from './dto/anonymous-check-out.dto';

@Injectable()
export class OccupancyService {
  constructor(
    @InjectRepository(Occupancy)
    private occupancyRepository: Repository<Occupancy>,
    @InjectRepository(Space)
    private spaceRepository: Repository<Space>,
    @InjectRepository(Reservation)
    private reservationRepository: Repository<Reservation>,
    private ratesService: RatesService,
    private dataSource: DataSource,
    private websocketGateway: WebsocketGateway,
      private parkingLotsService: ParkingLotsService, 

  ) {}

  async checkIn(checkInDto: CheckInDto, userId: string, userRole: string): Promise<Occupancy> {
    // Solo empleados o dueños pueden hacer check-in
    if (userRole !== UserRole.PARKING_OWNER && userRole !== UserRole.PARKING_EMPLOYEE && userRole !== UserRole.ADMIN) {
      throw new ForbiddenException('No tienes permiso para realizar check-in');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Obtener el espacio
      const space = await queryRunner.manager.findOne(Space, {
        where: { id: checkInDto.spaceId },
      });

      if (!space) {
        throw new NotFoundException('Espacio no encontrado');
      }

      // 2. Verificar que el espacio esté disponible
      if (space.status !== SpaceStatus.AVAILABLE && space.status !== SpaceStatus.RESERVED) {
        throw new ConflictException(`El espacio ${space.spaceNumber} no está disponible para check-in`);
      }

      // 3. Si viene de una reserva, verificarla
      let reservation: Reservation | null = null;
      if (checkInDto.reservationId) {
        reservation = await queryRunner.manager.findOne(Reservation, {
          where: { id: checkInDto.reservationId },
          relations: ['space'],
        });

        if (!reservation) {
          throw new NotFoundException('Reserva no encontrada');
        }

        if (reservation.status !== ReservationStatus.CONFIRMED) {
          throw new BadRequestException('La reserva no está confirmada');
        }

        if (new Date() > reservation.endTime) {
          throw new BadRequestException('La reserva ya expiró');
        }

        // Verificar que la reserva corresponde al espacio
        if (reservation.spaceId !== space.id) {
          throw new BadRequestException('La reserva no corresponde a este espacio');
        }
      }

      // 4. Crear registro de ocupación
      const occupancy = this.occupancyRepository.create({
        spaceId: space.id,
        reservationId: reservation?.id,
        vehiclePlate: checkInDto.vehiclePlate,
        vehicleType: checkInDto.vehicleType,
        checkInTime: new Date(),
        checkedInBy: userId,
        isCompleted: false,
        createdAt: new Date()
      });
      await queryRunner.manager.save(occupancy);

      // 5. Actualizar el espacio
      space.status = SpaceStatus.OCCUPIED;
      space.occupiedSince = new Date();
      space.occupiedByVehiclePlate = checkInDto.vehiclePlate;
      space.occupiedByVehicleType = checkInDto.vehicleType;
      space.isReserved = false;
      space.reservedUntil = null;

      await queryRunner.manager.save(space);

      // 6. Si tiene reserva, actualizarla
      if (reservation) {
        reservation.status = ReservationStatus.COMPLETED;
        await queryRunner.manager.save(reservation);
      }

      await queryRunner.commitTransaction();


         this.websocketGateway.emitOccupancyUpdate(space.parkingLotId, {
      spaceId: space.id,
      spaceNumber: space.spaceNumber,
      action: 'check-in',
      vehiclePlate: checkInDto.vehiclePlate,
      clientId: reservation?.client?.user?.id,
    });

    // ✅ Emitir actualización de espacio
    this.websocketGateway.emitSpaceUpdate(space.parkingLotId, space.id, SpaceStatus.OCCUPIED);

     this.websocketGateway.emitParkingAvailability(space.parkingLotId);

      return occupancy;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async checkOut(checkOutDto: CheckOutDto, userId: string, userRole: string): Promise<Occupancy> {
    // Solo empleados o dueños pueden hacer check-out
    if (userRole !== UserRole.PARKING_OWNER && userRole !== UserRole.PARKING_EMPLOYEE && userRole !== UserRole.ADMIN) {
      throw new ForbiddenException('No tienes permiso para realizar check-out');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Obtener la ocupación activa del espacio
      const occupancy = await queryRunner.manager.findOne(Occupancy, {
        where: { spaceId: checkOutDto.spaceId, isCompleted: false },
        relations: ['space','space.parkingLot'],
      });

      if (!occupancy) {
        throw new NotFoundException('No hay una ocupación activa en este espacio');
      }

      const space = occupancy.space;

      // 2. Calcular horas ocupadas
      const checkOutTime = new Date();
      const updatedAt = new Date();
      const hours = Math.ceil((checkOutTime.getTime() - new Date(occupancy.checkInTime).getTime()) / (1000 * 60 * 60));
      const hoursDecimal = (checkOutTime.getTime() - new Date(occupancy.checkInTime).getTime()) / (1000 * 60 * 60);

      // 3. Calcular tarifa
      const rate = await this.ratesService.findApplicableRate(
        space.parkingLotId,
        occupancy.vehicleType,
        checkOutTime,
      );

      if (!rate) {
        throw new BadRequestException('No hay tarifa configurada para este tipo de vehículo');
      }

      // 4. Calcular monto (mínimo 1 hora)
      const hoursToCharge = Math.max(1, hours);
      const totalAmount = rate.pricePerHour * hoursToCharge;

      // 5. Actualizar registro de ocupación
      occupancy.checkOutTime = checkOutTime;
      occupancy.checkedOutBy = userId;
      occupancy.totalAmount = totalAmount;
      occupancy.isCompleted = true;
      occupancy.updatedAt = updatedAt;
      await queryRunner.manager.save(occupancy);

      // 6. Liberar el espacio
      space.status = SpaceStatus.AVAILABLE;
      space.occupiedSince = null;
      space.occupiedByVehiclePlate = null;
      space.occupiedByVehicleType = null;

      await queryRunner.manager.save(space);

      await queryRunner.commitTransaction();


      // ✅ Emitir evento WebSocket
      this.websocketGateway.emitOccupancyUpdate(space.parkingLotId, {
        spaceId: space.id,
        spaceNumber: space.spaceNumber,
        action: 'check-out',
        vehiclePlate: occupancy.vehiclePlate,
      });

      // ✅ Emitir actualización de espacio
      this.websocketGateway.emitSpaceUpdate(space.parkingLotId, space.id, SpaceStatus.AVAILABLE);

      // ✅ Calcular y emitir disponibilidad actualizada
      //const availability = await this.calculateAvailability(space.parkingLotId);
      this.websocketGateway.emitParkingAvailability(space.parkingLotId);

      return occupancy;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  private async calculateAvailability(parkingLotId: string) {
    const spaces = await this.spaceRepository.find({ where: { parkingLotId } });
    return {
      totalSpaces: spaces.length,
      availableSpaces: spaces.filter(s => s.status === SpaceStatus.AVAILABLE).length,
      occupiedSpaces: spaces.filter(s => s.status === SpaceStatus.OCCUPIED).length,
      reservedSpaces: spaces.filter(s => s.status === SpaceStatus.RESERVED).length,
    };
  }

  async getActiveOccupancies(parkingLotId: string, userId: string, userRole: string): Promise<ActiveOccupancyResponseDto[]> {
  // Verificar permisos
  if (userRole !== UserRole.PARKING_OWNER && userRole !== UserRole.PARKING_EMPLOYEE && userRole !== UserRole.ADMIN) {
    throw new ForbiddenException('No tienes permiso para ver ocupaciones activas');
  }

  const occupancies = await this.occupancyRepository.find({
    where: { isCompleted: false, space: { parkingLotId } },
    relations: ['space', 'reservation'],
    order: { checkInTime: 'DESC' },
  });

  return occupancies.map(occ => ({
    id: occ.id,
    spaceId: occ.spaceId,
    space: {
      id: occ.space.id,
      spaceNumber: occ.space.spaceNumber,
      status: occ.space.status,
    },
    vehiclePlate: occ.vehiclePlate || occ.reservation?.vehiclePlate || 'Desconocida',
    vehicleType: occ.vehicleType,
    checkInTime: occ.checkInTime,
    checkedInBy: occ.checkedInBy,
    totalAmount: occ.totalAmount,
    isCompleted: occ.isCompleted,  // ← AGREGAR
    hasReservation: !!occ.reservationId,  // ← AGREGAR
    reservationId: occ.reservationId,  
    clientName: occ.reservation?.client?.name,  
  }));
}


  async getSpaceHistory(spaceId: string): Promise<Occupancy[]> {
    return this.occupancyRepository.find({
      where: { spaceId },
      order: { checkInTime: 'DESC' },
      relations: ['space'],
    });
  }

  async getMyActiveOccupancy(userId: string): Promise<Occupancy | null> {
    // Para clientes: obtener su ocupación activa actual
    // Nota: Esto requeriría una relación entre occupancy y client
    // Por ahora, retornamos null
    return null;
  }

  private async findAvailableSpace(
  parkingLotId: string,
  vehicleType: VehicleType,
  manager?: EntityManager,
): Promise<Space | null> {
  const em = manager || this.dataSource.manager;

  // 1. Buscar todos los espacios activos y disponibles
  const allAvailableSpaces = await em.find(Space, {
    where: {
      parkingLotId,
      status: SpaceStatus.AVAILABLE,
      allowsReservations: true,
      isActive: true,
    },
  });

  if (allAvailableSpaces.length === 0) {
    return null;
  }

  // 2. Filtrar por tipo de vehículo permitido
  const compatibleSpaces = allAvailableSpaces.filter(space =>
    space.allowedVehicleTypes.includes(vehicleType),
  );

  if (compatibleSpaces.length === 0) {
    return null;
  }

  // 3. Verificar conflictos con reservas confirmadas/pendientes
  const spaceIds = compatibleSpaces.map(s => s.id);
  const conflictingReservations = await em.find(Reservation, {
    where: {
      spaceId: In(spaceIds),
      status: In([ReservationStatus.PENDING_CONFIRMATION, ReservationStatus.CONFIRMED]),
      startTime: LessThan(new Date()),
      endTime: MoreThan(new Date()),
    },
  });

  const conflictingSpaceIds = new Set(conflictingReservations.map(r => r.spaceId));
  const freeSpaces = compatibleSpaces.filter(space => !conflictingSpaceIds.has(space.id));

  if (freeSpaces.length === 0) {
    return null;
  }

  // 4. Ordenar por número de espacio y devolver el primero
  return freeSpaces.sort((a, b) => {
    const numA = parseInt(a.spaceNumber.match(/\d+/)?.[0] || '0');
    const numB = parseInt(b.spaceNumber.match(/\d+/)?.[0] || '0');
    return numA - numB;
  })[0];
}

/**
 * Check-in anónimo usando QR (sin autenticación)
 */
async anonymousCheckIn(dto: AnonymousCheckInDto): Promise<AnonymousCheckInResponseDto> {
  const queryRunner = this.dataSource.createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction();

  try {
    // 1. Validar QR y obtener estacionamiento
    const parkingLot = await this.parkingLotsService.validateQRToken(dto.token, 'check-in');

    // 2. Buscar espacio disponible
    const availableSpace = await this.findAvailableSpace(parkingLot.id, dto.vehicleType, queryRunner.manager);

    if (!availableSpace) {
      throw new BadRequestException('No hay espacios disponibles en este momento');
    }

    // 3. Obtener tarifa aplicable (para validar)
    const rate = await this.ratesService.findApplicableRate(
      parkingLot.id,
      dto.vehicleType,
      new Date(),
    );

    if (!rate) {
      throw new BadRequestException('No hay tarifa configurada para este tipo de vehículo');
    }

    // 4. Crear ocupación anónima (checkedInBy es undefined para anónimos)
    const occupancy = this.occupancyRepository.create({
      spaceId: availableSpace.id,
      vehicleType: dto.vehicleType,
      vehiclePlate:dto.vehiclePlate.trim().toUpperCase(),
      checkInTime: new Date(),
      isCompleted: false,
      isAnonymous: true,
      checkedInViaQr: true,
      // checkedInBy se queda undefined para anónimos
    });
    await queryRunner.manager.save(occupancy);

    // 5. Actualizar espacio
    availableSpace.status = SpaceStatus.OCCUPIED;
    availableSpace.occupiedSince = new Date();
    availableSpace.occupiedByVehicleType = dto.vehicleType;
    availableSpace.occupiedByVehiclePlate=dto.vehiclePlate.trim().toUpperCase()
    await queryRunner.manager.save(availableSpace);

    await queryRunner.commitTransaction();

    // 6. Emitir eventos WebSocket
    this.websocketGateway.emitSpaceUpdate(parkingLot.id, availableSpace.id, SpaceStatus.OCCUPIED);
    this.websocketGateway.emitParkingAvailability(parkingLot.id);
    this.websocketGateway.emitOccupancyUpdate(parkingLot.id, {
      spaceId: availableSpace.id,
      spaceNumber: availableSpace.spaceNumber,
      vehiclePlate:availableSpace.occupiedByVehiclePlate,
      action: 'check-in',
      vehicleType: dto.vehicleType,
      isAnonymous: true,
    });

    return {
      success: true,
      message: 'Check-in registrado exitosamente',
      spaceNumber: availableSpace.spaceNumber,
      vehiclePlate:occupancy.vehiclePlate?.toUpperCase()!,
      checkInTime: occupancy.checkInTime,
    };
  } catch (error) {
    await queryRunner.rollbackTransaction();
    throw error;
  } finally {
    await queryRunner.release();
  }
}

/**
 * Check-out anónimo usando QR (sin autenticación)
 */
/**
 * Check-out anónimo usando QR (sin autenticación)
 */
async anonymousCheckOut(dto: AnonymousCheckOutDto): Promise<AnonymousCheckOutResponseDto> {
  const queryRunner = this.dataSource.createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction();

  try {
    // 1. Validar QR y obtener estacionamiento
    const parkingLot = await this.parkingLotsService.validateQRToken(dto.token, 'check-out');

    // 2. Buscar ocupación activa más reciente de este estacionamiento
    const occupancy = await queryRunner.manager.findOne(Occupancy, {
      where: {
        space: { parkingLotId: parkingLot.id },
        isCompleted: false,
        isAnonymous: true,
        vehiclePlate:dto.vehiclePlate.trim().toUpperCase()
      },
      relations: ['space','space.parkingLot'],
      order: { checkInTime: 'DESC' },
    });

    if (!occupancy) {
      throw new NotFoundException('No hay una ocupación activa para este QR');
    }

    const space = occupancy.space;
    if (!space) {
      throw new NotFoundException('Espacio no encontrado');
    }

    // 3. Calcular horas y monto
    const checkOutTime = new Date();
    const hours = Math.ceil(
      (checkOutTime.getTime() - occupancy.checkInTime.getTime()) / (1000 * 60 * 60)
    );
    const hoursToCharge = Math.max(1, hours);

    // 4. Obtener tarifa
    const rate = await this.ratesService.findApplicableRate(
      parkingLot.id,
      occupancy.vehicleType,
      checkOutTime,
    );

    if (!rate) {
      throw new BadRequestException('No hay tarifa configurada para este tipo de vehículo');
    }

    const totalAmount = rate.pricePerHour * hoursToCharge;

    // 5. Actualizar ocupación
    occupancy.checkOutTime = checkOutTime;
    occupancy.totalAmount = totalAmount;
    occupancy.isCompleted = true;
    occupancy.checkedOutViaQr = true;
    await queryRunner.manager.save(occupancy);

    // 6. Liberar espacio
    space.status = SpaceStatus.AVAILABLE;
    space.occupiedSince = null;
    space.occupiedByVehiclePlate = null;
    space.occupiedByVehicleType = null;
    await queryRunner.manager.save(space);

    await queryRunner.commitTransaction();

    // 7. Emitir eventos WebSocket
    this.websocketGateway.emitSpaceUpdate(parkingLot.id, space.id, SpaceStatus.AVAILABLE);
    this.websocketGateway.emitParkingAvailability(parkingLot.id);
    this.websocketGateway.emitOccupancyUpdate(parkingLot.id, {
      spaceId: space.id,
      spaceNumber: space.spaceNumber,
      vehiclePlate:occupancy.vehiclePlate?.toUpperCase()!,
      action: 'check-out',
      totalAmount,
      isAnonymous: true,
    });

    return {
      success: true,
      message: 'Check-out registrado exitosamente',
      spaceNumber: space.spaceNumber,
      vehiclePlate:occupancy.vehiclePlate?.toUpperCase()!,
      totalAmount,
      hours: hoursToCharge,
      checkInTime: occupancy.checkInTime,
      checkOutTime,
       parkingLot: {
        id: parkingLot.id,
        name: parkingLot.name,
        address: parkingLot.address,
        phone: parkingLot.phone,
      },
    };
  } catch (error) {
    await queryRunner.rollbackTransaction();
    throw error;
  } finally {
    await queryRunner.release();
  }
}
}