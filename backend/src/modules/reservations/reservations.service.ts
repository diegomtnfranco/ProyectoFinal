import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, Between, LessThan, MoreThan, Not, In, EntityManager } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
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
import { ParkingLot } from '../parking-lots/entities/parking-lot.entity';

@Injectable()
export class ReservationsService {
  constructor(
    @InjectRepository(Reservation)
    private reservationRepository: Repository<Reservation>,
    @InjectRepository(Space)
    private spaceRepository: Repository<Space>,
    @InjectRepository(ClientProfile)
    private clientRepository: Repository<ClientProfile>,
    @InjectRepository(ParkingLot)
    private parkingLotRepository: Repository<ParkingLot>,
    private ratesService: RatesService,
    private notificationsService: NotificationsService,
    private dataSource: DataSource,
    private websocketGateway: WebsocketGateway,
  ) { }

  // ============================
  // CREATE
  // ============================
  async create(createDto: CreateReservationDto, userId: string): Promise<ReservationResponseDto> {
    console.log(`[CREATE] Iniciando creación de reserva para usuario ${userId}`);
    const client = await this.clientRepository.findOne({ where: { userId } });
    if (!client) throw new NotFoundException('Perfil de cliente no encontrado');

    const startTime = new Date(createDto.startTime);
    const endTime = new Date(createDto.endTime);
    const now = new Date();

    if (startTime < now) throw new BadRequestException('La fecha de inicio no puede ser en el pasado');
    if (endTime <= startTime) throw new BadRequestException('La fecha de fin debe ser posterior a la fecha de inicio');

    const parkingLot = await this.parkingLotRepository.findOne({
      where: { id: createDto.parkingLotId },
      relations: ['owner', 'owner.user'],
    });
    if (!parkingLot) throw new NotFoundException('Estacionamiento no encontrado');

    const settings = parkingLot.settings;
    if (!settings.allowOnlineReservations) throw new BadRequestException('Este estacionamiento no permite reservas online');

    const daysInAdvance = (startTime.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    const maxAdvanceDays = settings.maxAdvanceDays || 30;
    if (daysInAdvance > maxAdvanceDays)
      throw new BadRequestException(`No se puede reservar con más de ${maxAdvanceDays} días de anticipación`);

    const durationHours = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
    const maxReservationHours = settings.maxReservationHours || 24;
    if (durationHours > maxReservationHours)
      throw new BadRequestException(`La reserva no puede exceder las ${maxReservationHours} horas`);

    const allAvailableSpaces = await this.spaceRepository.find({
      where: {
        parkingLotId: createDto.parkingLotId,
        status: SpaceStatus.AVAILABLE,
        allowsReservations: true,
        isActive: true,
      },
    });
    if (allAvailableSpaces.length === 0) throw new NotFoundException('No hay espacios disponibles en este estacionamiento');

    const compatibleSpaces = allAvailableSpaces.filter(space =>
      space.allowedVehicleTypes.includes(createDto.vehicleType),
    );
    if (compatibleSpaces.length === 0)
      throw new BadRequestException(`No hay espacios disponibles para vehículos tipo ${createDto.vehicleType}`);

    const spaceIds = compatibleSpaces.map(s => s.id);
    const conflictingReservations = await this.reservationRepository.find({
      where: {
        spaceId: In(spaceIds),
        status: In([ReservationStatus.PENDING_CONFIRMATION, ReservationStatus.CONFIRMED]),
        startTime: LessThan(endTime),
        endTime: MoreThan(startTime),
      },
    });
    const conflictingSpaceIds = new Set(conflictingReservations.map(r => r.spaceId));
    const freeSpaces = compatibleSpaces.filter(space => !conflictingSpaceIds.has(space.id));
    if (freeSpaces.length === 0) throw new ConflictException('No hay espacios disponibles en el horario seleccionado');

    const selectedSpace = freeSpaces.sort((a, b) => {
      const numA = parseInt(a.spaceNumber.match(/\d+/)?.[0] || '0');
      const numB = parseInt(b.spaceNumber.match(/\d+/)?.[0] || '0');
      return numA - numB;
    })[0];
    console.log(`[CREATE] Espacio asignado: ${selectedSpace.spaceNumber} (${selectedSpace.id})`);

    const rate = await this.ratesService.findApplicableRate(parkingLot.id, createDto.vehicleType, startTime);
    if (!rate) throw new BadRequestException('No hay tarifa configurada para este tipo de vehículo');
    const hours = Math.ceil((endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60));
    const totalAmount = rate.pricePerHour * Math.max(1, hours);

    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + (settings.reservationHoldMinutes || 120));
    const blockSpaceAt = new Date(startTime);
    blockSpaceAt.setHours(blockSpaceAt.getHours() - (settings.blockSpaceHoursBefore || 2));

    const reservation = new Reservation();
    reservation.clientId = client.id;
    reservation.spaceId = selectedSpace.id;
    reservation.vehicleType = createDto.vehicleType;
    reservation.vehiclePlate = createDto.vehiclePlate;
    reservation.startTime = startTime;
    reservation.endTime = endTime;
    reservation.status = ReservationStatus.PENDING_CONFIRMATION;
    reservation.totalAmount = totalAmount;
    reservation.appliedRateId = rate.id;
    reservation.expiresAt = expiresAt;
    reservation.blockSpaceAt = blockSpaceAt;
    reservation.createdAt = new Date();

    await this.reservationRepository.save(reservation);
    console.log(`[CREATE] Reserva creada con ID ${reservation.id}`);

    if (blockSpaceAt <= now && selectedSpace.status === SpaceStatus.AVAILABLE) {
      selectedSpace.status = SpaceStatus.RESERVED;
      selectedSpace.isReserved = true;
      selectedSpace.reservedUntil = startTime;
      await this.spaceRepository.save(selectedSpace);
      console.log(`[CREATE] Bloqueo inmediato del espacio ${selectedSpace.spaceNumber}`);
      this.websocketGateway.emitSpaceUpdate(parkingLot.id, selectedSpace.id, SpaceStatus.RESERVED);
      this.websocketGateway.emitParkingAvailability(parkingLot.id);
    }

    const savedReservation = await this.reservationRepository.findOne({
      where: { id: reservation.id },
      relations: ['client', 'space', 'space.parkingLot'],
    });

    await this.notificationsService.sendNewReservationNotification(parkingLot.owner.user.email, {
      reservationId: savedReservation!.id,
      spaceNumber: selectedSpace.spaceNumber,
      startTime,
      endTime,
      vehiclePlate: createDto.vehiclePlate,
    });
    this.websocketGateway.emitNewReservation(parkingLot.id, {
      id: savedReservation!.id,
      spaceNumber: selectedSpace.spaceNumber,
      startTime: savedReservation!.startTime,
      endTime: savedReservation!.endTime,
      vehiclePlate: savedReservation!.vehiclePlate,
      clientName: client.name,
    });

    return this.mapToResponseDto(savedReservation!);
  }

  // ============================
  // CONFIRMAR RESERVA (con reasignación)
  // ============================
  async confirmReservation(id: string, userId: string, userRole: UserRole): Promise<ReservationResponseDto> {
    console.log(`[CONFIRM] Confirmando reserva ${id} por usuario ${userId}`);
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const reservation = await queryRunner.manager.findOne(Reservation, {
        where: { id },
        relations: ['client', 'client.user', 'space', 'space.parkingLot', 'space.parkingLot.owner'],
      });
      if (!reservation) throw new NotFoundException(`Reserva con ID ${id} no encontrada`);
      if (![UserRole.PARKING_OWNER, UserRole.PARKING_EMPLOYEE, UserRole.ADMIN].includes(userRole))
        throw new ForbiddenException('No tienes permiso para confirmar reservas');
      if (reservation.status !== ReservationStatus.PENDING_CONFIRMATION)
        throw new BadRequestException(`La reserva no puede ser confirmada (estado actual: ${reservation.status})`);
      if (reservation.startTime < new Date())
        throw new BadRequestException('No se puede confirmar una reserva cuya hora de inicio ya pasó');

      let wasReassigned = false;
      let oldSpaceNumber = reservation.space.spaceNumber;

      if (reservation.space.status === SpaceStatus.OCCUPIED) {
        console.log(`[CONFIRM] Espacio ${reservation.space.spaceNumber} ocupado. Buscando alternativa...`);
        const alternative = await this.findAlternativeSpaceWithinTransaction(reservation, queryRunner.manager);
        if (alternative) {
          console.log(`[CONFIRM] Alternativa encontrada: espacio ${alternative.spaceNumber}. Reasignando...`);
          await this.reassignReservationWithinTransaction(reservation, alternative, queryRunner.manager);
          wasReassigned = true;
          oldSpaceNumber = reservation.space.spaceNumber;
          // Recargar la reserva actualizada
          const reloaded = await queryRunner.manager.findOne(Reservation, {
            where: { id: reservation.id },
            relations: ['space'],
          });
          if (reloaded) reservation.space = reloaded.space;
        } else {
          console.log(`[CONFIRM] No hay alternativa. Dejando reserva pendiente.`);
          await this.handleBlockingConflict(reservation, reservation.space);
          await queryRunner.commitTransaction();
          return this.mapToResponseDto(reservation);
        }
      }

      reservation.status = ReservationStatus.CONFIRMED;
      reservation.updatedAt = new Date();
      await queryRunner.manager.save(reservation);
      console.log(`[CONFIRM] Reserva ${reservation.id} confirmada. Espacio actual: ${reservation.space?.spaceNumber}`);

      const now = new Date();
      if (reservation.blockSpaceAt && reservation.blockSpaceAt <= now && reservation.space.status === SpaceStatus.AVAILABLE) {
        reservation.space.status = SpaceStatus.RESERVED;
        reservation.space.isReserved = true;
        reservation.space.reservedUntil = reservation.startTime;
        await queryRunner.manager.save(reservation.space);
        console.log(`[CONFIRM] Bloqueo inmediato del espacio ${reservation.space.spaceNumber}`);
        this.websocketGateway.emitSpaceUpdate(reservation.space.parkingLotId, reservation.space.id, SpaceStatus.RESERVED);
        this.websocketGateway.emitParkingAvailability(reservation.space.parkingLotId);

      }

      await queryRunner.commitTransaction();



      const finalReservation = await this.reservationRepository.findOne({
        where: { id: reservation.id },
        relations: ['client', 'client.user', 'space', 'space.parkingLot'],
      });
      if (!finalReservation) throw new NotFoundException(`Reserva ${id} no encontrada después de confirmar`);

      // Notificaciones
      const clientEmail = finalReservation.client?.user?.email;
      const clientId = finalReservation.client?.user?.id;
      if (clientEmail) {
        if (wasReassigned) {
          await this.notificationsService.sendSpaceChangedNotification(clientEmail, {
            reservationId: finalReservation.id,
            oldSpaceNumber,
            newSpaceNumber: finalReservation.space.spaceNumber,
            startTime: finalReservation.startTime,
            endTime: finalReservation.endTime,
          });
        } else {
          await this.notificationsService.sendReservationConfirmedNotification(clientEmail, {
            reservationId: finalReservation.id,
            spaceNumber: finalReservation.space.spaceNumber,
            startTime: finalReservation.startTime,
            endTime: finalReservation.endTime,
          });
        }
      }
      if (clientId) {
        this.websocketGateway.emitReservationConfirmed(clientId, {
          id: finalReservation.id,
          spaceNumber: finalReservation.space.spaceNumber,
          startTime: finalReservation.startTime,
          endTime: finalReservation.endTime,
        });
      }
      if (wasReassigned && finalReservation.space?.parkingLot?.owner?.user?.email) {
        await this.notificationsService.sendSpaceChangedNotification(
          finalReservation.space.parkingLot.owner.user.email,
          { reservationId: finalReservation.id, oldSpaceNumber, newSpaceNumber: finalReservation.space.spaceNumber },
        );
      }
      // Emitir evento de actualización de reserva
      if (clientId) {
        this.websocketGateway.emitReservationUpdate(clientId, {
          id: finalReservation.id,
          status: finalReservation.status,
          spaceNumber: finalReservation.space?.spaceNumber,
        });
      }

      return this.mapToResponseDto(finalReservation);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      console.error(`[CONFIRM] Error confirmando reserva ${id}:`, error);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  // ============================
  // REASIGNACIÓN (ATÓMICA CON UPDATE)
  // ============================
  private async reassignReservationWithinTransaction(
    reservation: Reservation,
    newSpace: Space,
    manager: EntityManager,
  ): Promise<void> {
    const oldSpace = reservation.space;
    console.log(`[REASSIGN] Reasignando reserva ${reservation.id} del espacio ${oldSpace.spaceNumber} al ${newSpace.spaceNumber}`);

    const parkingLot = await manager.findOne(ParkingLot, { where: { id: newSpace.parkingLotId } });
    const blockHours = parkingLot?.settings?.blockSpaceHoursBefore ?? 2;
    const newBlockAt = new Date(reservation.startTime);
    newBlockAt.setHours(newBlockAt.getHours() - blockHours);

    const updateResult = await manager.update(Reservation, reservation.id, {
      spaceId: newSpace.id,
      blockSpaceAt: newBlockAt,
    });
    console.log(`[REASSIGN] Reserva actualizada en BD. Affected: ${updateResult.affected}`);

    // Actualizar objeto en memoria
    reservation.spaceId = newSpace.id;
    reservation.blockSpaceAt = newBlockAt;

    newSpace.status = SpaceStatus.RESERVED;
    newSpace.isReserved = true;
    newSpace.reservedUntil = reservation.startTime;
    await manager.save(newSpace);
    console.log(`[REASSIGN] Nuevo espacio ${newSpace.spaceNumber} bloqueado`);

    if (oldSpace.status === SpaceStatus.RESERVED) {
      oldSpace.status = SpaceStatus.AVAILABLE;
      oldSpace.isReserved = false;
      oldSpace.reservedUntil = null;
      await manager.save(oldSpace);
      console.log(`[REASSIGN] Espacio antiguo ${oldSpace.spaceNumber} liberado (estaba reservado)`);
    }
    this.websocketGateway.emitSpaceUpdate(oldSpace.parkingLotId, oldSpace.id, SpaceStatus.AVAILABLE);
    this.websocketGateway.emitSpaceUpdate(newSpace.parkingLotId, newSpace.id, SpaceStatus.RESERVED);

  }

  // ============================
  // CANCELACIONES, CRON, MÉTODOS AUXILIARES
  // ============================
  async cancelByClient(id: string, userId: string): Promise<ReservationResponseDto> {
    console.log(`[CANCEL-CLIENT] Cancelando reserva ${id} por usuario ${userId}`);
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const reservation = await queryRunner.manager.findOne(Reservation, {
        where: { id },
        relations: ['client', 'client.user', 'space', 'space.parkingLot', 'space.parkingLot.owner'],
      });
      if (!reservation) throw new NotFoundException(`Reserva con ID ${id} no encontrada`);
      const client = await queryRunner.manager.findOne(ClientProfile, { where: { userId } });
      if (!client || reservation.clientId !== client.id)
        throw new ForbiddenException('No puedes cancelar una reserva que no te pertenece');

      if (reservation.status === ReservationStatus.COMPLETED)
        throw new BadRequestException('No se puede cancelar una reserva ya completada');
      if ([ReservationStatus.CANCELLED_BY_CLIENT, ReservationStatus.CANCELLED_BY_PARKING].includes(reservation.status))
        throw new BadRequestException('La reserva ya fue cancelada');

      reservation.status = ReservationStatus.CANCELLED_BY_CLIENT;
      reservation.cancelledAt = new Date();
      reservation.cancellationReason = 'Cancelado por el cliente';
      await queryRunner.manager.save(reservation);

      const space = reservation.space;
      if (space && space.status === SpaceStatus.RESERVED) {
        space.status = SpaceStatus.AVAILABLE;
        space.isReserved = false;
        space.reservedUntil = null;
        await queryRunner.manager.save(space);
      }

      await queryRunner.commitTransaction();

      if (space?.parkingLotId) {
        this.websocketGateway.emitReservationCancelled(
          reservation.space?.parkingLot?.owner?.userId,
          { id: reservation.id, spaceNumber: space.spaceNumber, cancelledBy: 'client', reason: 'Cancelado por el cliente' },
        );
        this.websocketGateway.emitSpaceUpdate(space.parkingLotId, reservation.spaceId, SpaceStatus.AVAILABLE);
      }

      // Emitir evento de actualización de reserva
      if (reservation.client?.user?.id) {
        this.websocketGateway.emitReservationUpdate(reservation.client.user.id, {
          id: reservation.id,
          status: reservation.status,
        });
      }

      return this.mapToResponseDto(reservation);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async cancelByParking(id: string, userId: string, userRole: UserRole, reason?: string): Promise<ReservationResponseDto> {
    console.log(`[CANCEL-PARKING] Cancelando reserva ${id} por usuario ${userId}`);
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const reservation = await queryRunner.manager.findOne(Reservation, {
        where: { id },
        relations: ['client', 'client.user', 'space', 'space.parkingLot', 'space.parkingLot.owner'],
      });
      if (!reservation) throw new NotFoundException(`Reserva con ID ${id} no encontrada`);
      if (![UserRole.PARKING_OWNER, UserRole.PARKING_EMPLOYEE, UserRole.ADMIN].includes(userRole))
        throw new ForbiddenException('No tienes permiso para cancelar reservas');
      if (reservation.status === ReservationStatus.COMPLETED)
        throw new BadRequestException('No se puede cancelar una reserva ya completada');

      reservation.status = ReservationStatus.CANCELLED_BY_PARKING;
      reservation.cancelledAt = new Date();
      reservation.cancellationReason = reason || 'Cancelado por el estacionamiento';
      await queryRunner.manager.save(reservation);

      const space = reservation.space;
      if (space && space.status === SpaceStatus.RESERVED) {
        space.status = SpaceStatus.AVAILABLE;
        space.isReserved = false;
        space.reservedUntil = null;
        await queryRunner.manager.save(space);
      }

      await queryRunner.commitTransaction();

      if (reservation.client?.user?.email) {
        await this.notificationsService.sendReservationCancelledNotification(
          reservation.client.user.email,
          { reservationId: reservation.id, spaceNumber: space?.spaceNumber || 'N/A', reason: reservation.cancellationReason },
        );
      }
      if (reservation.client?.user?.id) {
        this.websocketGateway.emitReservationCancelled(
          reservation.client.user.id,
          { id: reservation.id, spaceNumber: space?.spaceNumber || 'N/A', cancelledBy: 'parking', reason: reservation.cancellationReason },
        );
      }
      if (space?.parkingLotId) {
        this.websocketGateway.emitSpaceUpdate(space.parkingLotId, reservation.spaceId, SpaceStatus.AVAILABLE);
      }

      return this.mapToResponseDto(reservation);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
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
    return reservations.map(r => this.mapToResponseDto(r));
  }

  async findOne(id: string): Promise<ReservationResponseDto> {
    const reservation = await this.reservationRepository.findOne({
      where: { id },
      relations: ['client', 'space', 'space.parkingLot', 'appliedRate'],
    });
    if (!reservation) throw new NotFoundException(`Reserva con ID ${id} no encontrada`);
    return this.mapToResponseDto(reservation);
  }

  async findMyReservations(userId: string): Promise<ReservationResponseDto[]> {
    const client = await this.clientRepository.findOne({ where: { userId } });
    if (!client) throw new NotFoundException('Perfil de cliente no encontrado');
    const reservations = await this.reservationRepository.find({
      where: { clientId: client.id },
      relations: ['client', 'space', 'space.parkingLot'],
      order: { createdAt: 'DESC' },
    });
    return reservations.map(r => this.mapToResponseDto(r));
  }

  async findByParkingLot(parkingLotId: string, userId: string, userRole: UserRole): Promise<ReservationResponseDto[]> {
    if (![UserRole.PARKING_OWNER, UserRole.PARKING_EMPLOYEE, UserRole.ADMIN].includes(userRole))
      throw new ForbiddenException('No tienes permiso para ver estas reservas');
    const reservations = await this.reservationRepository.find({
      where: { space: { parkingLotId } },
      relations: ['client', 'space', 'space.parkingLot','client.user'],
      order: { startTime: 'ASC' },
    });
    return reservations.map(r => this.mapToResponseDto(r));
  }

  async update(id: string, updateDto: UpdateReservationDto, userId: string, userRole: UserRole): Promise<ReservationResponseDto> {
    if (userRole !== UserRole.ADMIN) throw new ForbiddenException('No tienes permiso para modificar reservas');
    const reservation = await this.reservationRepository.findOne({ where: { id }, relations: ['space'] });
    if (!reservation) throw new NotFoundException(`Reserva con ID ${id} no encontrada`);
    Object.assign(reservation, updateDto);
    await this.reservationRepository.save(reservation);
    return this.mapToResponseDto(reservation);
  }

  async remove(id: string, userId: string, userRole: UserRole): Promise<void> {
    if (userRole !== UserRole.ADMIN) throw new ForbiddenException('No tienes permiso para eliminar reservas');
    const result = await this.reservationRepository.delete(id);
    if (result.affected === 0) throw new NotFoundException(`Reserva con ID ${id} no encontrada`);
  }

  async changeSpace(reservationId: string, newSpaceId: string, userId: string, userRole: UserRole): Promise<ReservationResponseDto> {
    console.log(`[CHANGE-SPACE] Cambiando espacio de reserva ${reservationId} a ${newSpaceId}`);
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const reservation = await queryRunner.manager.findOne(Reservation, {
        where: { id: reservationId },
        relations: ['space', 'space.parkingLot'],
      });
      if (!reservation) throw new NotFoundException('Reserva no encontrada');
      if (![UserRole.ADMIN, UserRole.PARKING_OWNER, UserRole.PARKING_EMPLOYEE].includes(userRole))
        throw new ForbiddenException('No tienes permiso para cambiar el espacio de una reserva');

      const newSpace = await queryRunner.manager.findOne(Space, {
        where: { id: newSpaceId, parkingLotId: reservation.space.parkingLotId },
      });
      if (!newSpace) throw new NotFoundException('Espacio no encontrado en este estacionamiento');
      if (!newSpace.allowedVehicleTypes.includes(reservation.vehicleType))
        throw new BadRequestException(`El espacio no admite vehículos tipo ${reservation.vehicleType}`);
      if (newSpace.status !== SpaceStatus.AVAILABLE)
        throw new ConflictException('El espacio no está disponible');

      const oldSpace = reservation.space;
      reservation.spaceId = newSpace.id;
      await queryRunner.manager.save(reservation);

      newSpace.status = SpaceStatus.RESERVED;
      newSpace.isReserved = true;
      newSpace.reservedUntil = reservation.endTime;
      await queryRunner.manager.save(newSpace);

      if (oldSpace.status === SpaceStatus.RESERVED) {
        oldSpace.status = SpaceStatus.AVAILABLE;
        oldSpace.isReserved = false;
        oldSpace.reservedUntil = null;
        await queryRunner.manager.save(oldSpace);
      }

      await queryRunner.commitTransaction();

      this.websocketGateway.emitSpaceUpdate(oldSpace.parkingLotId, oldSpace.id, SpaceStatus.AVAILABLE);
      this.websocketGateway.emitSpaceUpdate(newSpace.parkingLotId, newSpace.id, SpaceStatus.RESERVED);

      return this.mapToResponseDto(reservation);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  // ============================
  // CRON JOBS
  // ============================
  @Cron(CronExpression.EVERY_5_MINUTES)
  async expirePendingReservations() {
    console.log(`[CRON-expirePending] Ejecutando a las ${new Date().toISOString()}`);
    const expired = await this.reservationRepository.find({
      where: { status: ReservationStatus.PENDING_CONFIRMATION, expiresAt: LessThan(new Date()) },
      relations: ['client', 'client.user', 'space'],
    });
    console.log(`[CRON-expirePending] Encontradas ${expired.length} reservas pendientes expiradas`);
    for (const r of expired) {
      r.status = ReservationStatus.EXPIRED;
      await this.reservationRepository.save(r);
      console.log(`[CRON-expirePending] Reserva ${r.id} expirada (falta de confirmación)`);
      if (r.client?.user?.email) {
        await this.notificationsService.sendReservationExpiredNotification(
          r.client.user.email,
          { reservationId: r.id, spaceNumber: r.space?.spaceNumber || 'N/A' },
        );
      }
    }
  }

  @Cron(CronExpression.EVERY_5_MINUTES)
  async blockSpacesForUpcomingReservations() {
    const now = new Date();
    console.log(`[CRON-block] Ejecutando a las ${now.toISOString()}`);
    const reservationsToBlock = await this.reservationRepository.find({
      where: {
        status: ReservationStatus.CONFIRMED,
        blockSpaceAt: LessThan(now),
        startTime: MoreThan(now),
      },
      relations: ['space', 'space.parkingLot', 'client', 'client.user'],
    });
    console.log(`[CRON-block] Encontradas ${reservationsToBlock.length} reservas para procesar`);

    for (const reservation of reservationsToBlock) {
      const queryRunner = this.dataSource.createQueryRunner();
      await queryRunner.connect();
      await queryRunner.startTransaction();

      try {
        const reloaded = await queryRunner.manager.findOne(Reservation, {
          where: { id: reservation.id },
          relations: ['space', 'space.parkingLot', 'client', 'client.user'],
        });
        if (!reloaded) continue;

        const space = reloaded.space;
        if (!space) continue;

        if (space.status === SpaceStatus.AVAILABLE) {
          console.log(`[CRON-block] Espacio ${space.spaceNumber} disponible, bloqueando...`);
          space.status = SpaceStatus.RESERVED;
          space.isReserved = true;
          space.reservedUntil = reloaded.startTime;
          await queryRunner.manager.save(space);
          await queryRunner.commitTransaction();
          this.websocketGateway.emitSpaceUpdate(space.parkingLotId, space.id, SpaceStatus.RESERVED);
        }
        else if (space.status === SpaceStatus.OCCUPIED) {
          console.log(`[CRON-block] Espacio ${space.spaceNumber} OCUPADO. Buscando alternativa...`);
          const alternative = await this.findAlternativeSpaceWithinTransaction(reloaded, queryRunner.manager);
          if (alternative) {
            console.log(`[CRON-block] Alternativa encontrada: espacio ${alternative.spaceNumber}. Reasignando...`);
            await this.reassignReservationWithinTransaction(reloaded, alternative, queryRunner.manager);
            const updatedRes = await queryRunner.manager.findOne(Reservation, {
              where: { id: reloaded.id },
              relations: ['space'],
            });
            await queryRunner.commitTransaction();
            console.log(`[CRON-block] Reserva ${reloaded.id} reasignada a ${updatedRes?.space?.spaceNumber}`);
            if (updatedRes?.client?.user?.email) {
              await this.notificationsService.sendSpaceChangedNotification(
                updatedRes.client.user.email,
                {
                  reservationId: updatedRes.id,
                  oldSpaceNumber: space.spaceNumber,
                  newSpaceNumber: updatedRes.space.spaceNumber,
                  startTime: updatedRes.startTime,
                  endTime: updatedRes.endTime,
                },
              );
            }
            this.websocketGateway.emitSpaceUpdate(space.parkingLotId, space.id, SpaceStatus.AVAILABLE);
            this.websocketGateway.emitSpaceUpdate(alternative.parkingLotId, alternative.id, SpaceStatus.RESERVED);
          } else {
            console.log(`[CRON-block] No hay alternativa disponible. Notificando conflicto.`);
            await this.handleBlockingConflict(reloaded, space);
            await queryRunner.commitTransaction();
          }
        } else {
          await queryRunner.commitTransaction();
        }
      } catch (error) {
        await queryRunner.rollbackTransaction();
        console.error(`[CRON-block] Error con reserva ${reservation.id}:`, error);
      } finally {
        await queryRunner.release();
      }
    }
  }

  @Cron(CronExpression.EVERY_5_MINUTES)
  async expireConfirmedReservations() {
    const now = new Date();
    const gracePeriod = 10 * 60 * 1000; // 10 minutos
    console.log(`[CRON-expireConfirmed] Ejecutando a las ${now.toISOString()}`);
    const expired = await this.reservationRepository.find({
      where: {
        status: ReservationStatus.CONFIRMED,
        startTime: LessThan(new Date(now.getTime() - gracePeriod)),
      },
      relations: ['space'],
    });
    console.log(`[CRON-expireConfirmed] Encontradas ${expired.length} reservas confirmadas para expirar`);
    for (const r of expired) {
      console.log(`[CRON-expireConfirmed] Expirando reserva ${r.id} (startTime ${r.startTime})`);
      r.status = ReservationStatus.EXPIRED;
      await this.reservationRepository.save(r);
      if (r.space && r.space.status === SpaceStatus.RESERVED) {
        r.space.status = SpaceStatus.AVAILABLE;
        r.space.isReserved = false;
        r.space.reservedUntil = null;
        await this.spaceRepository.save(r.space);
        console.log(`[CRON-expireConfirmed] Espacio ${r.space.spaceNumber} liberado`);
        this.websocketGateway.emitSpaceUpdate(r.space.parkingLotId, r.space.id, SpaceStatus.AVAILABLE);
      }
      if (r.client?.user?.email) {
        await this.notificationsService.sendReservationConfirmedExpiredNotification(
          r.client.user.email,
          { reservationId: r.id, spaceNumber: r.space?.spaceNumber || 'N/A' },
        );
      }
    }
  }

  // ============================
  // MÉTODOS AUXILIARES
  // ============================
  private async findAlternativeSpaceWithinTransaction(
    reservation: Reservation,
    manager: EntityManager,
  ): Promise<Space | null> {
    const availableSpaces = await manager.find(Space, {
      where: {
        parkingLotId: reservation.space.parkingLotId,
        status: SpaceStatus.AVAILABLE,
        allowsReservations: true,
        isActive: true,
      },
    });
    const compatible = availableSpaces.filter(space =>
      space.allowedVehicleTypes.includes(reservation.vehicleType),
    );
    const spaceIds = compatible.map(s => s.id);
    const conflicting = await manager.find(Reservation, {
      where: {
        spaceId: In(spaceIds),
        status: In([ReservationStatus.PENDING_CONFIRMATION, ReservationStatus.CONFIRMED]),
        startTime: LessThan(reservation.endTime),
        endTime: MoreThan(reservation.startTime),
      },
    });
    const conflictingIds = new Set(conflicting.map(r => r.spaceId));
    const free = compatible.filter(space => !conflictingIds.has(space.id));
    console.log(`[findAlternative] Para reserva ${reservation.id} se encontraron ${free.length} espacios libres`);
    return free.length > 0 ? free[0] : null;
  }

  private async handleBlockingConflict(reservation: Reservation, blockedSpace: Space): Promise<void> {
    console.log(`[CONFLICT] Sin solución para reserva ${reservation.id} (espacio ${blockedSpace.spaceNumber} ocupado)`);
    if (reservation.space?.parkingLot?.owner?.user?.email) {
      await this.notificationsService.sendSpaceConflictNotification(
        reservation.space.parkingLot.owner.user.email,
        {
          reservationId: reservation.id,
          spaceNumber: blockedSpace.spaceNumber,
          startTime: reservation.startTime,
          endTime: reservation.endTime,
          occupiedBy: blockedSpace.occupiedByVehiclePlate || 'vehículo desconocido',
        },
      );
    }
    if (reservation.client?.user?.email) {
      await this.notificationsService.sendReservationPendingNotification(
        reservation.client.user.email,
        {
          reservationId: reservation.id,
          spaceNumber: blockedSpace.spaceNumber,
          startTime: reservation.startTime,
        },
      );
    }
  }

  private mapToResponseDto(reservation: Reservation): ReservationResponseDto {
    // Función para formatear fecha a string ISO con offset -03:00 (Argentina)
    const formatDate = (date: Date | undefined): string | undefined => {
      if (!date) return undefined;
      // Ajustar a zona horaria Argentina
      const argentinaDate = new Date(date.toLocaleString('en-US', { timeZone: 'America/Argentina/Buenos_Aires' }));
      return argentinaDate.toISOString();
    };
    return {
      id: reservation.id,
      spaceId: reservation.spaceId,
      spaceNumber: reservation.space?.spaceNumber || '',
      parkingLotId: reservation.space?.parkingLot?.id || '',
      parkingLotName: reservation.space?.parkingLot?.name || '',
      vehicleType: reservation.vehicleType,
      vehiclePlate: reservation.vehiclePlate,
      startTime: formatDate(reservation.startTime) || reservation.startTime.toISOString(),
      endTime: formatDate(reservation.endTime) || reservation.endTime.toISOString(),
      status: reservation.status,
      totalAmount: reservation.totalAmount,
      createdAt: formatDate(reservation.createdAt) || reservation.createdAt.toISOString(),
      expiresAt: formatDate(reservation.expiresAt) || reservation.expiresAt?.toISOString(),
      clientName: reservation.client?.name,
      avatarUrl:reservation.client?.user?.avatarUrl || ''
    };

  }
}