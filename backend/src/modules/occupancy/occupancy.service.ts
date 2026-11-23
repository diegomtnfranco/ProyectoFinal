import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
  Optional,
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
import { CheckOutResponseDto } from './dto/check-out-response.dto';
import { RateHistoryService } from '../rate-history/rate-history.service';
import { NO_RATE_QR_MESSAGE, noRateManualMessage } from '../rate-history/rate-history.constants';
import { OccupancyServicesService } from '../occupancy-services/occupancy-services.service';
import { ClientTrackingService } from '../client-tracking/client-tracking.service';
import type { ChargeBreakdown } from '../occupancy-services/charge-calculator';

/** Tarifa con la que se cobra un egreso (congelada al ingreso o, si no hay, la vigente) */
export interface ChargeRate {
  id: string;
  vehicleType: VehicleType;
  pricePerHour: number;
}

/** Resultado del cálculo único del importe de un egreso */
export interface FinalCharge {
  rate: ChargeRate;
  /** Importe total en pesos (2 decimales) */
  totalAmount: number;
  hoursToCharge: number;
  breakdown?: ChargeBreakdown;
}

export interface CheckOutOptions {
  /**
   * Se ejecuta dentro de la transacción del egreso, después de cerrar la
   * ocupación y antes del commit. Si lanza, se revierte todo el egreso.
   * Lo que devuelve se agrega a la respuesta.
   */
  beforeCommit?: (manager: EntityManager, occupancy: Occupancy, charge: FinalCharge) => Promise<Record<string, unknown> | void>;
}

const formatAr = (date: Date) =>
  new Date(date).toLocaleString('es-AR', {
    timeZone: 'America/Argentina/Buenos_Aires',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

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
    // Opcional para no romper instancias/tests existentes que no lo pasan
    @Optional()
    private readonly rateHistory?: RateHistoryService,
    // Opcional: servicios por ocupación + tarifa nocturna (si falta, cálculo histórico)
    @Optional()
    private readonly occupancyExtras?: OccupancyServicesService,
    // Opcional: seguimiento para clientes con la patente registrada + patente única por estacionamiento
    @Optional()
    private readonly clientTracking?: ClientTrackingService,
  ) { }

  /**
   * Tarifa para cobrar un egreso: la congelada al ingreso (si existe) para que
   * un cambio de tarifa no afecte a vehículos que ya estaban adentro; si no hay
   * snapshot (ocupaciones previas a esta feature), la tarifa vigente.
   */
  private async resolveChargeRate(
    occupancy: Occupancy,
    parkingLotId: string,
    at: Date,
    manager: EntityManager,
  ): Promise<ChargeRate | null> {
    const snapshot = await this.rateHistory?.findSnapshot(occupancy.id, manager);
    if (snapshot) {
      return { id: snapshot.rateId, vehicleType: snapshot.vehicleType, pricePerHour: Number(snapshot.pricePerHour) };
    }
    const rate = await this.ratesService.findApplicableRate(parkingLotId, occupancy.vehicleType, at);
    return rate ? { id: rate.id, vehicleType: rate.vehicleType, pricePerHour: Number(rate.pricePerHour) } : null;
  }

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

      // 1.b Debe existir una tarifa para el tipo de vehículo (se congela al ingreso)
      const rate = await this.ratesService.findApplicableRate(space.parkingLotId, checkInDto.vehicleType, new Date());
      if (!rate) {
        throw new BadRequestException(noRateManualMessage(checkInDto.vehicleType));
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
      await this.rateHistory?.snapshotForOccupancy(queryRunner.manager, occupancy.id, rate);
      const tracking = await this.clientTracking?.onCheckIn(queryRunner.manager, {
        occupancyId: occupancy.id,
        parkingLotId: space.parkingLotId,
        plate: checkInDto.vehiclePlate,
      });
      const extras = await this.occupancyExtras?.onCheckIn(queryRunner.manager, {
        occupancyId: occupancy.id,
        parkingLotId: space.parkingLotId,
        serviceKeys: checkInDto.serviceKeys,
        via: 'manual',
        userId,
      });

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
      void this.clientTracking?.afterCheckIn(tracking);


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

      if (extras) {
        Object.assign(occupancy, { services: extras.selected, ignoredServiceKeys: extras.ignoredServiceKeys });
      }
      return occupancy;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async checkOut(
    checkOutDto: CheckOutDto,
    userId: string,
    userRole: string,
    options?: CheckOutOptions,
  ): Promise<CheckOutResponseDto & { checkout?: unknown }> {
    // Solo empleados o dueños pueden hacer check-out
    if (userRole !== UserRole.PARKING_OWNER && userRole !== UserRole.PARKING_EMPLOYEE && userRole !== UserRole.ADMIN) {
      throw new ForbiddenException('No tienes permiso para realizar check-out');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Bloquear la ocupación activa del espacio: dos egresos simultáneos no pueden
      //    cerrar la misma estadía (el segundo espera y ya no la encuentra activa)
      const locked = await queryRunner.manager.findOne(Occupancy, {
        where: { spaceId: checkOutDto.spaceId, isCompleted: false },
        lock: { mode: 'pessimistic_write' },
      });
      if (!locked) {
        throw new NotFoundException('No hay una ocupación activa en este espacio');
      }
      const occupancy = await queryRunner.manager.findOne(Occupancy, {
        where: { id: locked.id },
        relations: ['space', 'space.parkingLot'],
      });
      if (!occupancy || occupancy.isCompleted) {
        throw new NotFoundException('No hay una ocupación activa en este espacio');
      }

      // 2. Importe final (cálculo único: tarifa congelada, servicios, noche y reserva)
      const checkOutTime = new Date();
      const charge = await this.computeFinalCharge(queryRunner.manager, occupancy, occupancy.space.parkingLotId, checkOutTime);

      // 3. Cerrar la ocupación y liberar el espacio
      this.applyCheckOut(occupancy, charge, checkOutTime, { checkedOutBy: userId, viaQr: false });
      await queryRunner.manager.save(occupancy);
      const space = await this.releaseSpace(queryRunner.manager, occupancy.space);

      // 4. Pasos adicionales en la misma transacción (pago presencial, solicitud de egreso)
      const extra = await options?.beforeCommit?.(queryRunner.manager, occupancy, charge);

      await queryRunner.commitTransaction();
      this.afterCheckOut(occupancy, space, charge.totalAmount, false);

      const response = this.buildCheckOutResponse(occupancy, charge);
      return extra ? Object.assign(response, extra) : response;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  // ------------------------------------------------------------------ egreso: piezas compartidas

  /**
   * Importe final de una estadía. Único cálculo para el egreso manual, el QR,
   * la cotización y los pagos: tarifa congelada al ingreso (o vigente), mínimo
   * 1 hora, servicios y tarifa nocturna (si están configurados) y, si la
   * ocupación viene de una reserva completada con importe, ese importe fija el
   * componente de estacionamiento (los servicios adicionales se suman aparte).
   * No persiste nada.
   */
  async computeFinalCharge(
    manager: EntityManager,
    occupancy: Occupancy,
    parkingLotId: string,
    at: Date,
  ): Promise<FinalCharge> {
    const rate = await this.resolveChargeRate(occupancy, parkingLotId, at, manager);
    if (!rate) {
      throw new BadRequestException('No hay tarifa configurada para este tipo de vehículo');
    }
    const hours = Math.ceil((at.getTime() - new Date(occupancy.checkInTime).getTime()) / (1000 * 60 * 60));
    const hoursToCharge = Math.max(1, hours);

    const breakdown = await this.occupancyExtras?.computeCharge(manager, occupancy, rate.pricePerHour, at);
    let totalAmount = breakdown ? Number(breakdown.parkingAmount) : rate.pricePerHour * hoursToCharge;

    if (occupancy.reservationId) {
      const reservation = await manager.findOne(Reservation, { where: { id: occupancy.reservationId } });
      if (
        reservation &&
        reservation.totalAmount !== undefined &&
        reservation.totalAmount !== null &&
        reservation.status === ReservationStatus.COMPLETED
      ) {
        totalAmount = Number(reservation.totalAmount);
        if (breakdown) {
          breakdown.parkingSource = 'reservation';
          breakdown.parkingAmount = Number(reservation.totalAmount);
        }
      }
    }

    if (breakdown) {
      totalAmount = Math.round((totalAmount + Number(breakdown.servicesAmount)) * 100) / 100;
      breakdown.total = totalAmount;
    }
    totalAmount = Math.round(Number(totalAmount) * 100) / 100;
    return { rate, totalAmount, hoursToCharge, breakdown: breakdown ?? undefined };
  }

  /** Marca la ocupación como finalizada (no guarda) */
  applyCheckOut(
    occupancy: Occupancy,
    charge: FinalCharge,
    at: Date,
    by: { checkedOutBy?: string | null; viaQr: boolean },
  ): void {
    occupancy.checkOutTime = at;
    occupancy.totalAmount = charge.totalAmount;
    occupancy.isCompleted = true;
    occupancy.updatedAt = new Date();
    if (by.checkedOutBy) occupancy.checkedOutBy = by.checkedOutBy;
    if (by.viaQr) occupancy.checkedOutViaQr = true;
  }

  /** Libera el espacio (dentro de la transacción del egreso) */
  async releaseSpace(manager: EntityManager, space: Space): Promise<Space> {
    space.status = SpaceStatus.AVAILABLE;
    space.occupiedSince = null;
    space.occupiedByVehiclePlate = null;
    space.occupiedByVehicleType = null;
    await manager.save(space);
    return space;
  }

  /** Eventos posteriores al commit de un egreso (seguimiento y tiempo real) */
  afterCheckOut(occupancy: Occupancy, space: Space, totalAmount: number, viaQr: boolean): void {
    void this.clientTracking?.afterCheckOut(occupancy.id);
    this.websocketGateway.emitOccupancyUpdate(space.parkingLotId, {
      spaceId: space.id,
      spaceNumber: space.spaceNumber,
      action: 'check-out',
      vehiclePlate: occupancy.vehiclePlate?.toUpperCase(),
      ...(viaQr ? { totalAmount, isAnonymous: occupancy.isAnonymous } : {}),
    });
    this.websocketGateway.emitSpaceUpdate(space.parkingLotId, space.id, SpaceStatus.AVAILABLE);
    this.websocketGateway.emitParkingAvailability(space.parkingLotId);
  }

  buildCheckOutResponse(occupancy: Occupancy, charge: FinalCharge): CheckOutResponseDto {
    return {
      occupancy: {
        id: occupancy.id,
        spaceId: occupancy.spaceId,
        reservationId: occupancy.reservationId || '',
        vehiclePlate: occupancy.vehiclePlate || '',
        vehicleType: occupancy.vehicleType,
        checkInTime: formatAr(occupancy.checkInTime),
        checkOutTime: formatAr(occupancy.checkOutTime!),
        checkedInBy: occupancy.checkedInBy,
        checkedOutBy: occupancy.checkedOutBy!,
        totalAmount: occupancy.totalAmount!,
        isCompleted: occupancy.isCompleted,
        isAnonymous: occupancy.isAnonymous,
        checkedInViaQr: occupancy.checkedInViaQr,
        checkedOutViaQr: occupancy.checkedOutViaQr,
        createdAt: formatAr(occupancy.createdAt),
        updatedAt: formatAr(occupancy.updatedAt),
        space: occupancy.space,
        reservation: occupancy.reservation || undefined,
      },
      rate: {
        id: charge.rate.id,
        VehicleType: charge.rate.vehicleType,
        pricePerHour: charge.rate.pricePerHour,
      },
      ...(charge.breakdown ? { breakdown: charge.breakdown } : {}),
    };
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
  async anonymousCheckIn(
    dto: AnonymousCheckInDto,
    // Ingreso por QR de un cliente autenticado con un vehículo de su perfil (CheckoutService.clientQrCheckIn)
    opts: { isAnonymous?: boolean } = {},
  ): Promise<AnonymousCheckInResponseDto> {
  const queryRunner = this.dataSource.createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction();

  try {
    // 1. Validar QR y obtener estacionamiento
    const parkingLot = await this.parkingLotsService.validateQRToken(dto.token, 'check-in');

    // 1.b Sin tarifa para ese tipo de vehículo no se permite el ingreso por QR
    const rate = await this.ratesService.findApplicableRate(parkingLot.id, dto.vehicleType, new Date());
    if (!rate) {
      throw new BadRequestException(NO_RATE_QR_MESSAGE);
    }

    // 2. Buscar reserva confirmada existente para esta patente
    const existingReservation = await this.findReservationByVehiclePlate(
      dto.vehiclePlate,
      parkingLot.id,
      queryRunner.manager
    );

    // 3. Determinar el espacio a usar
    let targetSpace: Space;
    let isFromReservation = false;

    if (existingReservation) {
      // Si existe reserva, verificar que tenga espacio asignado
      if (!existingReservation.spaceId) {
        throw new BadRequestException('La reserva no tiene un espacio asignado. Contacta al estacionamiento.');
      }

      // Obtener el espacio de la reserva
      const reservedSpace = await queryRunner.manager.findOne(Space, {
        where: { id: existingReservation.spaceId },
      });

      if (!reservedSpace) {
        throw new NotFoundException('El espacio asignado a la reserva no fue encontrado');
      }

      // Verificar que el espacio no esté ocupado
      if (reservedSpace.status === SpaceStatus.OCCUPIED) {
        throw new ConflictException(
          'El espacio asignado a tu reserva ya está ocupado. Por favor, contacta al estacionamiento.'
        );
      }

      targetSpace = reservedSpace;
      isFromReservation = true;
    } else {
      // Si no hay reserva, buscar un espacio disponible
      const availableSpace = await this.findAvailableSpace(
        parkingLot.id,
        dto.vehicleType,
        queryRunner.manager
      );

      if (!availableSpace) {
        throw new BadRequestException('No hay espacios disponibles en este momento');
      }

      targetSpace = availableSpace;
    }

    // 4. La tarifa ya se validó al inicio (paso 1.b)

    // 5. Crear ocupación
    const occupancy = this.occupancyRepository.create({
      spaceId: targetSpace.id,
      vehicleType: dto.vehicleType,
      vehiclePlate: dto.vehiclePlate.trim().toUpperCase(),
      checkInTime: new Date(),
      isCompleted: false,
      isAnonymous: opts.isAnonymous ?? true,
      checkedInViaQr: true,
      reservationId: existingReservation?.id,
    });
    await queryRunner.manager.save(occupancy);
    await this.rateHistory?.snapshotForOccupancy(queryRunner.manager, occupancy.id, rate);
    const tracking = await this.clientTracking?.onCheckIn(queryRunner.manager, {
      occupancyId: occupancy.id,
      parkingLotId: parkingLot.id,
      plate: occupancy.vehiclePlate,
    });
    const extras = await this.occupancyExtras?.onCheckIn(queryRunner.manager, {
      occupancyId: occupancy.id,
      parkingLotId: parkingLot.id,
      serviceKeys: dto.serviceKeys,
      via: 'qr',
      userId: null,
    });

    // 6. Actualizar espacio
    targetSpace.status = SpaceStatus.OCCUPIED;
    targetSpace.occupiedSince = new Date();
    targetSpace.occupiedByVehicleType = dto.vehicleType;
    targetSpace.occupiedByVehiclePlate = dto.vehiclePlate.trim().toUpperCase();
    targetSpace.isReserved = false;
    targetSpace.reservedUntil = null;
    await queryRunner.manager.save(targetSpace);

    // 7. Si existe reserva, actualizarla a COMPLETED
    if (existingReservation) {
      existingReservation.status = ReservationStatus.COMPLETED;
      await queryRunner.manager.save(existingReservation);
    }

    // 8. Commit transacción
    await queryRunner.commitTransaction();
    void this.clientTracking?.afterCheckIn(tracking);

    // 9. Emitir eventos WebSocket
    const message = existingReservation
      ? `Check-in registrado. Se utilizó la reserva confirmada para el vehículo ${existingReservation.vehiclePlate.toUpperCase()}.`
      : 'Check-in registrado exitosamente';

    this.websocketGateway.emitSpaceUpdate(parkingLot.id, targetSpace.id, SpaceStatus.OCCUPIED);
    this.websocketGateway.emitParkingAvailability(parkingLot.id);
    this.websocketGateway.emitOccupancyUpdate(parkingLot.id, {
      spaceId: targetSpace.id,
      spaceNumber: targetSpace.spaceNumber,
      vehiclePlate: targetSpace.occupiedByVehiclePlate,
      action: 'check-in',
      vehicleType: dto.vehicleType,
      isAnonymous: opts.isAnonymous ?? true,
      clientId: existingReservation?.client?.user?.id,
    });

    return {
      success: true,
      message,
      spaceNumber: targetSpace.spaceNumber,
      vehiclePlate: occupancy.vehiclePlate?.toUpperCase()!,
      checkInTime: occupancy.checkInTime,
      ...(extras ? { services: extras.selected, ignoredServiceKeys: extras.ignoredServiceKeys } : {}),
    };

  } catch (error) {
    await queryRunner.rollbackTransaction();
    throw error;
  } finally {
    await queryRunner.release();
  }
}
/**
 * Buscar reserva activa por patente en un estacionamiento
 */
private async findReservationByVehiclePlate(
  vehiclePlate: string,
  parkingLotId: string,
  manager?: EntityManager
): Promise<Reservation | null> {
  const em = manager || this.dataSource.manager;

  const reservation = await em.findOne(Reservation, {
    where: {
      vehiclePlate: vehiclePlate.trim().toUpperCase(),
      status: In([ReservationStatus.CONFIRMED]),
      space: { parkingLotId },
      endTime: MoreThan(new Date()),
    },
    relations: ['space', 'space.parkingLot', 'client', 'client.user'],
  });

  return reservation || null;
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
          vehiclePlate: dto.vehiclePlate.trim().toUpperCase()
        },
        relations: ['space', 'space.parkingLot'],
        order: { checkInTime: 'DESC' },
      });

      if (!occupancy) {
        throw new NotFoundException('No hay una ocupación activa para este QR');
      }

      const space = occupancy.space;
      if (!space) {
        throw new NotFoundException('Espacio no encontrado');
      }

      // 3. Importe final (cálculo único compartido con el egreso manual y los pagos)
      const checkOutTime = new Date();
      const charge = await this.computeFinalCharge(queryRunner.manager, occupancy, parkingLot.id, checkOutTime);
      const { rate, totalAmount, hoursToCharge, breakdown } = charge;

      // 4. Cerrar la ocupación y liberar el espacio
      this.applyCheckOut(occupancy, charge, checkOutTime, { viaQr: true });
      await queryRunner.manager.save(occupancy);
      await this.releaseSpace(queryRunner.manager, space);

      await queryRunner.commitTransaction();
      this.afterCheckOut(occupancy, space, totalAmount, true);

      return {
        success: true,
        message: 'Check-out registrado exitosamente',
        spaceNumber: space.spaceNumber,
        vehiclePlate: occupancy.vehiclePlate?.toUpperCase()!,
        totalAmount,
        hours: hoursToCharge,
        checkInTime: occupancy.checkInTime.toLocaleString('es-AR', {
          timeZone: 'America/Argentina/Buenos_Aires',
          day: '2-digit',      // Fuerza 2 dígitos para el día (dd)
          month: '2-digit',    // Fuerza 2 dígitos para el mes (mm)
          year: 'numeric',     // Año completo (aaaa)
          hour: '2-digit',     // Fuerza 2 dígitos para la hora (hh)
          minute: '2-digit',   // Fuerza 2 dígitos para los minutos (MM)
          hour12: false        // Formato de 24 horas
        }),
        checkOutTime: checkOutTime.toLocaleString('es-AR', {
          timeZone: 'America/Argentina/Buenos_Aires',
          day: '2-digit',      // Fuerza 2 dígitos para el día (dd)
          month: '2-digit',    // Fuerza 2 dígitos para el mes (mm)
          year: 'numeric',     // Año completo (aaaa)
          hour: '2-digit',     // Fuerza 2 dígitos para la hora (hh)
          minute: '2-digit',   // Fuerza 2 dígitos para los minutos (MM)
          hour12: false        // Formato de 24 horas
        }),
        parkingLot: {
          id: parkingLot.id,
          name: parkingLot.name,
          address: parkingLot.address,
          phone: parkingLot.phone,
        },
        rate: {
          id: rate.id,
          VehicleType: rate.vehicleType,
          pricePerHour: rate.pricePerHour,
        },
        ...(breakdown ? { breakdown } : {}),
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}