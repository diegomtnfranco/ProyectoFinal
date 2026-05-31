import { 
  Injectable, 
  NotFoundException, 
  ConflictException, 
  BadRequestException,
  ForbiddenException
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, Between, LessThan, MoreThan, Not, In } from 'typeorm';
import { Reservation, ReservationStatus } from './entities/reservation.entity';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { UpdateReservationDto } from './dto/update-reservation.dto';
import { FilterReservationsDto } from './dto/filter-reservations.dto';
import { ReservationResponseDto } from './dto/reservation-response.dto';
import { Space, SpaceStatus } from '../spaces/entities/space.entity';
import { ClientProfile } from '../client-profiles/entities/client-profile.entity';
import { RatesService } from '../rates/rates.service';
import { UserRole } from '../users/entities/user.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { WebsocketGateway } from '../websocket/websocket.gateway';

@Injectable()
export class ReservationsService {
  constructor(
    @InjectRepository(Reservation)
    private reservationRepository: Repository<Reservation>,
    @InjectRepository(Space)
    private spaceRepository: Repository<Space>,
    @InjectRepository(ClientProfile)
    private clientRepository: Repository<ClientProfile>,
    private ratesService: RatesService,
    private notificationsService: NotificationsService,
    private dataSource: DataSource,
    private websocketGateway: WebsocketGateway,
  ) {}

 async create(createDto: CreateReservationDto, userId: string): Promise<ReservationResponseDto> {
  // 1. Obtener el cliente
  const client = await this.clientRepository.findOne({
    where: { userId },
  });

  if (!client) {
    throw new NotFoundException('Perfil de cliente no encontrado');
  }

  // 2. Buscar un espacio disponible en el parking lot
  const availableSpace = await this.spaceRepository.findOne({
    where: {
      parkingLotId: createDto.parkingLotId,
      status: SpaceStatus.AVAILABLE,
      allowsReservations: true,
      isActive: true,
    },
    relations: ['parkingLot'],
  });

  if (!availableSpace) {
    throw new NotFoundException('No hay espacios disponibles en este estacionamiento');
  }

  // 3. Verificar que el espacio permita el tipo de vehículo
  if (!availableSpace.allowedVehicleTypes.includes(createDto.vehicleType)) {
    throw new BadRequestException(`No hay espacios disponibles para vehículos tipo ${createDto.vehicleType}`);
  }

  // 4. Verificar que el parking permita reservas online
  if (!availableSpace.parkingLot.settings.allowOnlineReservations) {
    throw new BadRequestException('Este estacionamiento no permite reservas online');
  }

  // 5. Verificar disponibilidad en el horario
  const startTime = new Date(createDto.startTime);
  const endTime = new Date(createDto.endTime);

  if (startTime < new Date()) {
    throw new BadRequestException('La fecha de inicio no puede ser en el pasado');
  }

  if (endTime <= startTime) {
    throw new BadRequestException('La fecha de fin debe ser posterior a la fecha de inicio');
  }

  // 6. Verificar que el espacio no tenga otra reserva en el mismo horario
  const existingReservation = await this.reservationRepository.findOne({
    where: {
      spaceId: availableSpace.id,
      status: Not(In([ReservationStatus.CANCELLED_BY_CLIENT, ReservationStatus.CANCELLED_BY_PARKING, ReservationStatus.EXPIRED])),
      startTime: LessThan(endTime),
      endTime: MoreThan(startTime),
    },
  });

  if (existingReservation) {
    throw new ConflictException('El estacionamiento no tiene disponibilidad en el horario seleccionado');
  }

  // 7. Calcular tarifa y monto
  const rate = await this.ratesService.findApplicableRate(
    availableSpace.parkingLotId,
    createDto.vehicleType,
    startTime,
  );

  if (!rate) {
    throw new BadRequestException('No hay tarifa configurada para este tipo de vehículo');
  }

  const hours = Math.ceil((endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60));
  const totalAmount = rate.pricePerHour * Math.max(1, hours);

  // 8. Crear reserva
  const reservation = this.reservationRepository.create({
    clientId: client.id,
    spaceId: availableSpace.id,
    vehicleType: createDto.vehicleType,
    vehiclePlate: createDto.vehiclePlate,
    startTime,
    endTime,
    status: ReservationStatus.PENDING_CONFIRMATION,
    totalAmount,
    appliedRateId: rate.id,
    expiresAt: new Date(Date.now() + 30 * 60 * 1000),
  });

  await this.reservationRepository.save(reservation);

  // 9. Marcar espacio como reservado
  availableSpace.status = SpaceStatus.RESERVED;
  availableSpace.isReserved = true;
  availableSpace.reservedUntil = endTime;
  await this.spaceRepository.save(availableSpace);

  // 10. Enviar notificación al dueño del parking
  await this.notificationsService.sendNewReservationNotification(
    availableSpace.parkingLot.owner.user.email,
    {
      reservationId: reservation.id,
      spaceNumber: availableSpace.spaceNumber,
      startTime,
      endTime,
      vehiclePlate: createDto.vehiclePlate,
    },
  );

      this.websocketGateway.emitNewReservation(availableSpace.parkingLotId, {
      id: reservation.id,
      spaceNumber: availableSpace.spaceNumber,
      startTime: reservation.startTime,
      endTime: reservation.endTime,
      vehiclePlate: reservation.vehiclePlate,
      clientName: client.name,
    });

    // Emitir actualización de espacio a través del WebSocket
    this.websocketGateway.emitSpaceUpdate(availableSpace.parkingLotId, availableSpace.id, SpaceStatus.RESERVED);

  return this.mapToResponseDto(reservation);
}

  async findAll(filters?: FilterReservationsDto): Promise<ReservationResponseDto[]> {
    const where: any = {};

    if (filters?.clientId) where.clientId = filters.clientId;
    if (filters?.spaceId) where.spaceId = filters.spaceId;
    if (filters?.status) where.status = filters.status;
    if (filters?.vehicleType) where.vehicleType = filters.vehicleType;
    if (filters?.startDate && filters?.endDate) {
      where.startTime = Between(new Date(filters.startDate), new Date(filters.endDate));
    }

    const reservations = await this.reservationRepository.find({
      where,
      relations: ['client', 'space', 'space.parkingLot'],
      order: { createdAt: 'DESC' },
    });

    return await Promise.all(reservations.map(r => this.mapToResponseDto(r)));
  }

  async findOne(id: string): Promise<ReservationResponseDto> {
    const reservation = await this.reservationRepository.findOne({
      where: { id },
      relations: ['client', 'space', 'space.parkingLot', 'appliedRate'],
    });

    if (!reservation) {
      throw new NotFoundException(`Reserva con ID ${id} no encontrada`);
    }

    return this.mapToResponseDto(reservation);
  }

  async findMyReservations(userId: string): Promise<ReservationResponseDto[]> {
    const client = await this.clientRepository.findOne({
      where: { userId },
    });

    if (!client) {
      throw new NotFoundException('Perfil de cliente no encontrado');
    }

    const reservations = await this.reservationRepository.find({
      where: { clientId: client.id },
      relations: ['client', 'space', 'space.parkingLot'],
      order: { createdAt: 'DESC' },
    });

    return await Promise.all(reservations.map(r => this.mapToResponseDto(r)));
  }

  async findByParkingLot(parkingLotId: string, userId: string, userRole: string): Promise<ReservationResponseDto[]> {
    // Verificar permisos
    if (userRole === UserRole.PARKING_OWNER) {
      // Verificar que el parking pertenezca al dueño
      // Esto se valida en el servicio de parking-lots
    } else if (userRole !== UserRole.ADMIN && userRole !== UserRole.PARKING_EMPLOYEE) {
      throw new ForbiddenException('No tienes permiso para ver estas reservas');
    }

    const reservations = await this.reservationRepository.find({
      where: { space: { parkingLotId } },
      relations: ['client', 'space', 'space.parkingLot'],
      order: { startTime: 'ASC' },
    });

    return await Promise.all(reservations.map(r => this.mapToResponseDto(r)));
  }

  async confirmReservation(id: string, userId: string, userRole: string): Promise<ReservationResponseDto> {
    const reservation = await this.reservationRepository.findOne({
      where: { id },
      relations: ['space', 'space.parkingLot', 'client'],
    });

    if (!reservation) {
      throw new NotFoundException(`Reserva con ID ${id} no encontrada`);
    }

    // Verificar permisos (solo dueño o empleado)
    if (userRole !== UserRole.PARKING_OWNER && userRole !== UserRole.PARKING_EMPLOYEE && userRole !== UserRole.ADMIN) {
      throw new ForbiddenException('No tienes permiso para confirmar reservas');
    }

    if (reservation.status !== ReservationStatus.PENDING_CONFIRMATION) {
      throw new BadRequestException(`La reserva no puede ser confirmada (estado actual: ${reservation.status})`);
    }

    reservation.status = ReservationStatus.CONFIRMED;
    await this.reservationRepository.save(reservation);

    // Enviar notificación al cliente
    await this.notificationsService.sendReservationConfirmedNotification(
      reservation.client.user.email,
      {
        reservationId: reservation.id,
        spaceNumber: reservation.space.spaceNumber,
        startTime: reservation.startTime,
        endTime: reservation.endTime,
      },
    );

    // ✅ Emitir evento WebSocket al cliente
    this.websocketGateway.emitReservationConfirmed(reservation.client.user.id, {
      id: reservation.id,
      spaceNumber: reservation.space.spaceNumber,
      startTime: reservation.startTime,
      endTime: reservation.endTime,
    });

    return this.mapToResponseDto(reservation);
  }

  async cancelByClient(id: string, userId: string): Promise<ReservationResponseDto> {
    const reservation = await this.reservationRepository.findOne({
      where: { id },
      relations: ['client', 'space', 'space.parkingLot'],
    });

    if (!reservation) {
      throw new NotFoundException(`Reserva con ID ${id} no encontrada`);
    }

    // Verificar que la reserva pertenezca al cliente
    const client = await this.clientRepository.findOne({ where: { userId } });
    if (!client || reservation.clientId !== client.id) {
      throw new ForbiddenException('No puedes cancelar una reserva que no te pertenece');
    }

    if (reservation.status === ReservationStatus.COMPLETED) {
      throw new BadRequestException('No se puede cancelar una reserva ya completada');
    }

    if (reservation.status === ReservationStatus.CANCELLED_BY_CLIENT || 
        reservation.status === ReservationStatus.CANCELLED_BY_PARKING) {
      throw new BadRequestException('La reserva ya fue cancelada');
    }

    reservation.status = ReservationStatus.CANCELLED_BY_CLIENT;
    reservation.cancelledAt = new Date();
    reservation.cancellationReason = 'Cancelado por el cliente';

    // Liberar el espacio
    const space = reservation.space;
    space.status = SpaceStatus.AVAILABLE;
    space.isReserved = false;
    space.reservedUntil = null;

    await this.spaceRepository.save(space);
    await this.reservationRepository.save(reservation);

     // ✅ Emitir evento WebSocket al dueño/empleado
    const parkingLotId = reservation.space.parkingLotId;
    this.websocketGateway.emitReservationCancelled(
      reservation.space.parkingLot.owner.userId,
      {
        id: reservation.id,
        spaceNumber: reservation.space.spaceNumber,
        cancelledBy: 'client',
        reason: 'Cancelado por el cliente',
      }
    );

    // ✅ Emitir actualización de espacio (liberado)
    this.websocketGateway.emitSpaceUpdate(parkingLotId, reservation.spaceId, SpaceStatus.AVAILABLE);

    return this.mapToResponseDto(reservation);
  }

  async cancelByParking(id: string, userId: string, userRole: string, reason?: string): Promise<ReservationResponseDto> {
    const reservation = await this.reservationRepository.findOne({
      where: { id },
      relations: ['client', 'space', 'space.parkingLot'],
    });

    if (!reservation) {
      throw new NotFoundException(`Reserva con ID ${id} no encontrada`);
    }

    // Verificar permisos
    if (userRole !== UserRole.PARKING_OWNER && userRole !== UserRole.PARKING_EMPLOYEE && userRole !== UserRole.ADMIN) {
      throw new ForbiddenException('No tienes permiso para cancelar reservas');
    }

    if (reservation.status === ReservationStatus.COMPLETED) {
      throw new BadRequestException('No se puede cancelar una reserva ya completada');
    }

    reservation.status = ReservationStatus.CANCELLED_BY_PARKING;
    reservation.cancelledAt = new Date();
    reservation.cancellationReason = reason || 'Cancelado por el estacionamiento';

    // Liberar el espacio
    const space = reservation.space;
    space.status = SpaceStatus.AVAILABLE;
    space.isReserved = false;
    space.reservedUntil = null;

    await this.spaceRepository.save(space);
    await this.reservationRepository.save(reservation);

    // Notificar al cliente
    await this.notificationsService.sendReservationCancelledNotification(
      reservation.client.user.email,
      {
        reservationId: reservation.id,
        spaceNumber: reservation.space.spaceNumber,
        reason: reservation.cancellationReason,
      },
    );

     // ✅ Emitir evento WebSocket al cliente
    this.websocketGateway.emitReservationCancelled(
      reservation.client.user.id,
      {
        id: reservation.id,
        spaceNumber: reservation.space.spaceNumber,
        cancelledBy: 'parking',
        reason: reservation.cancellationReason,
      }
    );

    // ✅ Emitir actualización de espacio (liberado)
    this.websocketGateway.emitSpaceUpdate(reservation.space.parkingLotId, reservation.spaceId, SpaceStatus.AVAILABLE);

    return this.mapToResponseDto(reservation);
  }

  async update(id: string, updateDto: UpdateReservationDto, userId: string, userRole: string): Promise<ReservationResponseDto> {
    const reservation = await this.reservationRepository.findOne({
      where: { id },
      relations: ['space'],
    });

    if (!reservation) {
      throw new NotFoundException(`Reserva con ID ${id} no encontrada`);
    }

    // Solo admin puede editar reservas directamente
    if (userRole !== UserRole.ADMIN) {
      throw new ForbiddenException('No tienes permiso para modificar reservas');
    }

    Object.assign(reservation, updateDto);
    await this.reservationRepository.save(reservation);

    return this.mapToResponseDto(reservation);
  }

  async remove(id: string, userId: string, userRole: string): Promise<void> {
    const reservation = await this.reservationRepository.findOne({
      where: { id },
    });

    if (!reservation) {
      throw new NotFoundException(`Reserva con ID ${id} no encontrada`);
    }

    // Solo admin puede eliminar permanentemente
    if (userRole !== UserRole.ADMIN) {
      throw new ForbiddenException('No tienes permiso para eliminar reservas');
    }

    await this.reservationRepository.delete(id);
  }

  private async mapToResponseDto(reservation: Reservation): Promise<ReservationResponseDto> {
    return {
      id: reservation.id,
      spaceId: reservation.spaceId,
      spaceNumber: reservation.space?.spaceNumber || '',
      parkingLotId: reservation.space?.parkingLot?.id || '',
      parkingLotName: reservation.space?.parkingLot?.name || '',
      vehicleType: reservation.vehicleType,
      vehiclePlate: reservation.vehiclePlate,
      startTime: reservation.startTime,
      endTime: reservation.endTime,
      status: reservation.status,
      totalAmount: reservation.totalAmount,
      createdAt: reservation.createdAt,
    };
  }

  async changeSpace(reservationId: string, newSpaceId: string, userId: string, userRole: string): Promise<ReservationResponseDto> {
  const reservation = await this.reservationRepository.findOne({
    where: { id: reservationId },
    relations: ['space', 'space.parkingLot'],
  });

  if (!reservation) {
    throw new NotFoundException('Reserva no encontrada');
  }

  // Verificar permisos
  if (userRole !== UserRole.ADMIN && userRole !== UserRole.PARKING_OWNER && userRole !== UserRole.PARKING_EMPLOYEE) {
    throw new ForbiddenException('No tienes permiso para cambiar el espacio de una reserva');
  }

  // Obtener el nuevo espacio
  const newSpace = await this.spaceRepository.findOne({
    where: { id: newSpaceId, parkingLotId: reservation.space.parkingLotId },
  });

  if (!newSpace) {
    throw new NotFoundException('Espacio no encontrado en este estacionamiento');
  }

  // Verificar que el nuevo espacio admita el tipo de vehículo
  if (!newSpace.allowedVehicleTypes.includes(reservation.vehicleType)) {
    throw new BadRequestException(`El espacio no admite vehículos tipo ${reservation.vehicleType}`);
  }

  // Verificar que el nuevo espacio esté disponible
  if (newSpace.status !== SpaceStatus.AVAILABLE) {
    throw new ConflictException('El espacio no está disponible');
  }

  // Liberar el espacio anterior
  const oldSpace = reservation.space;
  oldSpace.status = SpaceStatus.AVAILABLE;
  oldSpace.isReserved = false;
  oldSpace.reservedUntil = null;
  await this.spaceRepository.save(oldSpace);

  // Asignar el nuevo espacio
  newSpace.status = SpaceStatus.RESERVED;
  newSpace.isReserved = true;
  newSpace.reservedUntil = reservation.endTime;
  await this.spaceRepository.save(newSpace);

  // Actualizar la reserva
  reservation.spaceId = newSpace.id;
  await this.reservationRepository.save(reservation);

  return this.mapToResponseDto(reservation);
}
}