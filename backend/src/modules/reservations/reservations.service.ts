import { Injectable, NotFoundException, ConflictException, UnauthorizedException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In, LessThan, MoreThan } from 'typeorm';
import { Reservation, ReservationStatus } from './entities/reservation.entity';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { UpdateReservationDto } from './dto/update-reservation.dto';
import { Space, SpaceStatus } from '../spaces/entities/space.entity';
import { ClientProfile, VehicleTypeEnum } from '../client-profiles/entities/client-profile.entity';
import { Rate } from '../rates/entities/rate.entity';
import { ParkingLot } from '../parking-lots/entities/parking-lot.entity';
import { UserRole } from '../users/entities/user.entity';
import { ParkingEmployee } from '../parking-employees/entities/parking-employee.entity';

@Injectable()
export class ReservationsService {
  constructor(
    @InjectRepository(Reservation)
    private reservationRepository: Repository<Reservation>,
    @InjectRepository(Space)
    private spaceRepository: Repository<Space>,
    @InjectRepository(ClientProfile)
    private clientRepository: Repository<ClientProfile>,
    @InjectRepository(Rate)
    private rateRepository: Repository<Rate>,
    @InjectRepository(ParkingLot)
    private parkingLotRepository: Repository<ParkingLot>,
    @InjectRepository(ParkingEmployee)
    private employeeRepository: Repository<ParkingEmployee>,
    private dataSource: DataSource,
  ) {}

  /**
   * Crear una nueva reserva (cliente)
   */
  async create(createDto: CreateReservationDto, clientUserId?: string): Promise<Reservation> {
    // Si viene de un empleado, clientUserId puede ser diferente
    let clientId = createDto.clientId;
    
    if (clientUserId && !clientId) {
      // Buscar el perfil del cliente por userId
      const clientProfile = await this.clientRepository.findOne({
        where: { userId: clientUserId },
      });
      if (!clientProfile) {
        throw new NotFoundException('Perfil de cliente no encontrado');
      }
      clientId = clientProfile.id;
    }

    if (!clientId) {
      throw new BadRequestException('Se requiere clientId o usuario autenticado');
    }

    // Usar transacción para evitar conflictos
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Bloquear el espacio para evitar doble reserva
      const space = await queryRunner.manager.findOne(Space, {
        where: { id: createDto.spaceId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!space) {
        throw new NotFoundException('Espacio no encontrado');
      }

      // 2. Verificar disponibilidad
      const isAvailable = await this.checkAvailability(
        space.id,
        new Date(createDto.startTime),
        new Date(createDto.endTime),
      );

      if (!isAvailable) {
        throw new ConflictException('El espacio no está disponible en el horario solicitado');
      }

      // 3. Verificar que el espacio permita el tipo de vehículo
      if (!space.allowedVehicleTypes.includes(createDto.vehicleType)) {
        throw new BadRequestException(
          `Este espacio no permite vehículos tipo ${createDto.vehicleType}`,
        );
      }

      // 4. Calcular tarifa
      const rate = await this.findApplicableRate(space.parkingLotId, createDto.vehicleType);
      if (!rate) {
        throw new NotFoundException('No hay tarifa configurada para este tipo de vehículo');
      }

      const startTime = new Date(createDto.startTime);
      const endTime = new Date(createDto.endTime);
      const hours = Math.ceil((endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60));
      const totalAmount = rate.pricePerHour * hours;

      // 5. Crear reserva
      const reservation = queryRunner.manager.create(Reservation, {
        clientId,
        spaceId: space.id,
        vehicleType: createDto.vehicleType,
        vehiclePlate: createDto.vehiclePlate,
        startTime,
        endTime,
        status: ReservationStatus.PENDING_PAYMENT,
        totalAmount,
        appliedRateId: rate.id,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000), // expira en 15 min
      });

      const savedReservation = await queryRunner.manager.save(reservation);

      // 6. Cambiar estado del espacio a reservado
      space.status = SpaceStatus.RESERVED;
      await queryRunner.manager.save(space);

      await queryRunner.commitTransaction();

      return savedReservation;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Verificar disponibilidad de un espacio en un rango horario
   */
  private async checkAvailability(spaceId: string, startTime: Date, endTime: Date): Promise<boolean> {
    const existingReservation = await this.reservationRepository.findOne({
      where: {
        spaceId,
        status: In([ReservationStatus.PENDING_PAYMENT, ReservationStatus.CONFIRMED]),
        startTime: LessThan(endTime),
        endTime: MoreThan(startTime),
      },
    });
    return !existingReservation;
  }

  /**
   * Buscar tarifa aplicable
   */
  private async findApplicableRate(parkingLotId: string, vehicleType: string): Promise<Rate | null> {
    return this.rateRepository.findOne({
      where: {
        parkingLotId:  parkingLotId ,
        vehicleType: VehicleTypeEnum[vehicleType], // Permitir tarifas generales sin tipo específico
        isActive: true,
      },
    });
  }

  /**
   * Obtener todas las reservas (solo admin)
   */
  async findAll(): Promise<Reservation[]> {
    return this.reservationRepository.find({
      relations: ['client', 'space', 'space.parkingLot'],
    });
  }

  /**
   * Obtener una reserva por ID
   */
  async findOne(id: string): Promise<Reservation> {
    const reservation = await this.reservationRepository.findOne({
      where: { id },
      relations: ['client', 'space', 'space.parkingLot', 'appliedRate'],
    });

    if (!reservation) {
      throw new NotFoundException(`Reserva con ID ${id} no encontrada`);
    }

    return reservation;
  }

  /**
   * Convertir string a number para compatibilidad
   */
  async findOneById(id: number): Promise<Reservation> {
    return this.findOne(id.toString());
  }

  /**
   * Actualizar reserva
   */
  async update(id: string, updateDto: UpdateReservationDto): Promise<Reservation> {
    const reservation = await this.findOne(id);
    Object.assign(reservation, updateDto);
    return this.reservationRepository.save(reservation);
  }

  /**
   * Eliminar reserva (solo admin)
   */
  async remove(id: string): Promise<void> {
    const reservation = await this.findOne(id);
    await this.reservationRepository.remove(reservation);
  }

  /**
   * Buscar reservas por estacionamiento (dueño o empleado)
   */
  async findByParkingLot(parkingLotId: string, userId: string, userRole: string): Promise<Reservation[]> {
    // Verificar permisos
    if (userRole === UserRole.PARKING_OWNER) {
      // Verificar que el parking pertenezca al dueño
      const parkingLot = await this.parkingLotRepository.findOne({
        where: { id: parkingLotId, ownerId: userId },
      });
      if (!parkingLot) {
        throw new UnauthorizedException('No tienes acceso a este estacionamiento');
      }
    } else if (userRole === UserRole.PARKING_EMPLOYEE) {
      // Verificar que el empleado trabaje en este parking
      const employee = await this.employeeRepository.findOne({
        where: { userId, parkingLotId },
      });
      if (!employee) {
        throw new UnauthorizedException('No trabajas en este estacionamiento');
      }
    } else {
      throw new ForbiddenException('No tienes permiso para ver reservas de este estacionamiento');
    }

    return this.reservationRepository.find({
      where: {
        space: {
          parkingLotId,
        },
      },
      relations: ['client', 'space', 'appliedRate'],
      order: { startTime: 'DESC' },
    });
  }

  /**
   * Cancelar reserva por el cliente
   */
  async cancelByClient(reservationId: string, userId: string): Promise<Reservation> {
    const reservation = await this.findOne(reservationId);
    
    // Verificar que el cliente sea el dueño de la reserva
    const clientProfile = await this.clientRepository.findOne({
      where: { userId },
    });
    
    if (!clientProfile || reservation.clientId !== clientProfile.id) {
      throw new UnauthorizedException('No puedes cancelar una reserva que no te pertenece');
    }

    if (reservation.status !== ReservationStatus.PENDING_PAYMENT && 
        reservation.status !== ReservationStatus.CONFIRMED) {
      throw new BadRequestException(`No se puede cancelar una reserva en estado ${reservation.status}`);
    }

    return this.cancelReservation(reservation, 'cancelled_by_client');
  }

  /**
   * Cancelar reserva por el estacionamiento (dueño o empleado)
   */
  async cancelByParking(reservationId: string, userId: string, userRole: string): Promise<Reservation> {
    const reservation = await this.findOne(reservationId);
    const space = await this.spaceRepository.findOne({
      where: { id: reservation.spaceId },
      relations: ['parkingLot'],
    });

    if (!space) {
      throw new NotFoundException('Espacio no encontrado');
    }

    // Verificar permisos
    if (userRole === UserRole.PARKING_OWNER) {
      const parkingLot = await this.parkingLotRepository.findOne({
        where: { id: space.parkingLotId, ownerId: userId },
      });
      if (!parkingLot) {
        throw new UnauthorizedException('No tienes permiso para cancelar reservas de este estacionamiento');
      }
    } else if (userRole === UserRole.PARKING_EMPLOYEE) {
      const employee = await this.employeeRepository.findOne({
        where: { userId, parkingLotId: space.parkingLotId },
      });
      if (!employee) {
        throw new UnauthorizedException('No trabajas en este estacionamiento');
      }
    } else {
      throw new ForbiddenException('No tienes permiso para cancelar esta reserva');
    }

    if (reservation.status !== ReservationStatus.CONFIRMED) {
      throw new BadRequestException(`No se puede cancelar una reserva en estado ${reservation.status}`);
    }

    return this.cancelReservation(reservation, 'cancelled_by_parking');
  }

  /**
   * Método interno para cancelar reserva y liberar espacio
   */
  private async cancelReservation(reservation: Reservation, reason: string): Promise<Reservation> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      reservation.status = reason as ReservationStatus;
      reservation.cancelledAt = new Date();
      
      await queryRunner.manager.save(reservation);
      
      // Liberar el espacio
      await queryRunner.manager.update(Space, reservation.spaceId, {
        status: SpaceStatus.AVAILABLE,
      });
      
      await queryRunner.commitTransaction();
      
      return reservation;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}