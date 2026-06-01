// // src/modules/reservations/reservations.service.ts
// import {
//   Injectable,
//   NotFoundException,
//   ConflictException,
//   BadRequestException,
//   ForbiddenException
// } from '@nestjs/common';
// import { InjectRepository } from '@nestjs/typeorm';
// import { Repository, DataSource, Between, LessThan, MoreThan, Not, In } from 'typeorm';
// import { Reservation, ReservationStatus } from './entities/reservation.entity';
// import { CreateReservationDto } from './dto/create-reservation.dto';
// import { UpdateReservationDto } from './dto/update-reservation.dto';
// import { FilterReservationsDto } from './dto/filter-reservations.dto';
// import { ReservationResponseDto } from './dto/reservation-response.dto';
// import { Space, SpaceStatus } from '../spaces/entities/space.entity';
// import { ClientProfile } from '../client-profiles/entities/client-profile.entity';
// import { RatesService } from '../rates/rates.service';
// import { UserRole } from '../users/entities/user.entity';
// import { NotificationsService } from '../notifications/notifications.service';
// import { WebsocketGateway } from '../websocket/websocket.gateway';
// import { Cron, CronExpression } from '@nestjs/schedule';
// import { ParkingLot } from '../parking-lots/entities/parking-lot.entity';

// @Injectable()
// export class ReservationsService {
//   constructor(
//     @InjectRepository(Reservation)
//     private reservationRepository: Repository<Reservation>,
//     @InjectRepository(Space)
//     private spaceRepository: Repository<Space>,
//     @InjectRepository(ClientProfile)
//     private clientRepository: Repository<ClientProfile>,
//     @InjectRepository(ParkingLot)  // ← AGREGAR
//     private parkingLotRepository: Repository<ParkingLot>,
//     private ratesService: RatesService,
//     private notificationsService: NotificationsService,
//     private dataSource: DataSource,
//     private websocketGateway: WebsocketGateway,
//   ) {}

//   async create(createDto: CreateReservationDto, userId: string): Promise<ReservationResponseDto> {
//   // 1. Obtener el cliente
//   const client = await this.clientRepository.findOne({
//     where: { userId },
//   });

//   if (!client) {
//     throw new NotFoundException('Perfil de cliente no encontrado');
//   }

//   // 2. Validar fechas
//   const startTime = new Date(createDto.startTime);
//   const endTime = new Date(createDto.endTime);

//   if (startTime < new Date()) {
//     throw new BadRequestException('La fecha de inicio no puede ser en el pasado');
//   }

//   if (endTime <= startTime) {
//     throw new BadRequestException('La fecha de fin debe ser posterior a la fecha de inicio');
//   }

//   // 3. Obtener el parking lot y sus settings
//   const parkingLot = await this.parkingLotRepository.findOne({
//     where: { id: createDto.parkingLotId },
//     relations: ['owner', 'owner.user'],
//   });

//   if (!parkingLot) {
//     throw new NotFoundException('Estacionamiento no encontrado');
//   }

//   const settings = parkingLot.settings;
//   if (!settings.allowOnlineReservations) {
//     throw new BadRequestException('Este estacionamiento no permite reservas online');
//   }

//   // Validar anticipación máxima
//   const daysInAdvance = (startTime.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24);
//   const maxAdvanceDays = settings.maxAdvanceDays || 30;
//   if (daysInAdvance > maxAdvanceDays) {
//     throw new BadRequestException(`No se puede reservar con más de ${maxAdvanceDays} días de anticipación`);
//   }

//   // Validar duración máxima
//   const durationHours = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
//   const maxReservationHours = settings.maxReservationHours || 24;
//   if (durationHours > maxReservationHours) {
//     throw new BadRequestException(`La reserva no puede exceder las ${maxReservationHours} horas`);
//   }

//   // 4. Buscar TODOS los espacios disponibles del parking
//   const allAvailableSpaces = await this.spaceRepository.find({
//     where: {
//       parkingLotId: createDto.parkingLotId,
//       status: SpaceStatus.AVAILABLE,
//       allowsReservations: true,
//       isActive: true,
//     },
//   });

//   if (allAvailableSpaces.length === 0) {
//     throw new NotFoundException('No hay espacios disponibles en este estacionamiento');
//   }

//   // 5. Filtrar por tipo de vehículo
//   const compatibleSpaces = allAvailableSpaces.filter(space =>
//     space.allowedVehicleTypes.includes(createDto.vehicleType)
//   );

//   if (compatibleSpaces.length === 0) {
//     throw new BadRequestException(`No hay espacios disponibles para vehículos tipo ${createDto.vehicleType}`);
//   }

//   // 6. Obtener reservas activas que bloquean disponibilidad
//   const activeStatuses = [
//     ReservationStatus.PENDING_CONFIRMATION,
//     ReservationStatus.CONFIRMED,
//   ];

//   const spaceIds = compatibleSpaces.map(s => s.id);
//   const conflictingReservations = await this.reservationRepository.find({
//     where: {
//       spaceId: In(spaceIds),
//       status: In(activeStatuses),
//       startTime: LessThan(endTime),
//       endTime: MoreThan(startTime),
//     },
//   });

//   const conflictingSpaceIds = new Set(conflictingReservations.map(r => r.spaceId));

//   // 7. Filtrar espacios sin conflictos de horario
//   const freeSpaces = compatibleSpaces.filter(space => !conflictingSpaceIds.has(space.id));

//   if (freeSpaces.length === 0) {
//     throw new ConflictException('No hay espacios disponibles en el horario seleccionado');
//   }

//   // 8. Seleccionar el mejor espacio (el de menor número)
//   const selectedSpace = freeSpaces.sort((a, b) => {
//     const numA = parseInt(a.spaceNumber.match(/\d+/)?.[0] || '0');
//     const numB = parseInt(b.spaceNumber.match(/\d+/)?.[0] || '0');
//     return numA - numB;
//   })[0];

//   // 9. Calcular tarifa y monto
//   const rate = await this.ratesService.findApplicableRate(
//     parkingLot.id,
//     createDto.vehicleType,
//     startTime,
//   );

//   if (!rate) {
//     throw new BadRequestException('No hay tarifa configurada para este tipo de vehículo');
//   }

//   const hours = Math.ceil((endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60));
//   const totalAmount = rate.pricePerHour * Math.max(1, hours);

//   // Calcular fechas importantes
//   const expiresAt = new Date();
//   const reservationHoldMinutes = settings.reservationHoldMinutes || 120;
//   expiresAt.setMinutes(expiresAt.getMinutes() + reservationHoldMinutes);

//   const blockSpaceAt = new Date(startTime);
//   const blockSpaceHoursBefore = settings.blockSpaceHoursBefore || 2;
//   blockSpaceAt.setHours(blockSpaceAt.getHours() - blockSpaceHoursBefore);

//   // 10. Crear reserva
//   const reservation = new Reservation();
//   reservation.clientId = client.id;
//   reservation.spaceId = selectedSpace.id;
//   reservation.vehicleType = createDto.vehicleType;
//   reservation.vehiclePlate = createDto.vehiclePlate;
//   reservation.startTime = startTime;
//   reservation.endTime = endTime;
//   reservation.status = ReservationStatus.PENDING_CONFIRMATION;
//   reservation.totalAmount = totalAmount;
//   reservation.appliedRateId = rate.id;
//   reservation.expiresAt = expiresAt;
//   reservation.blockSpaceAt = blockSpaceAt;
//   reservation.createdAt = new Date();

//   await this.reservationRepository.save(reservation);

//   // Recargar la reserva con relaciones
//   const savedReservation = await this.reservationRepository.findOne({
//     where: { id: reservation.id },
//     relations: ['client', 'space', 'space.parkingLot'],
//   });

//   // 11. Enviar notificación al dueño
//   await this.notificationsService.sendNewReservationNotification(
//     parkingLot.owner.user.email,
//     {
//       reservationId: savedReservation!.id,
//       spaceNumber: selectedSpace.spaceNumber,
//       startTime,
//       endTime,
//       vehiclePlate: createDto.vehiclePlate,
//     },
//   );

//   // 12. WebSocket: notificar nueva reserva
//   this.websocketGateway.emitNewReservation(parkingLot.id, {
//     id: savedReservation!.id,
//     spaceNumber: selectedSpace.spaceNumber,
//     startTime: savedReservation!.startTime,
//     endTime: savedReservation!.endTime,
//     vehiclePlate: savedReservation!.vehiclePlate,
//     clientName: client.name,
//   });

//   return this.mapToResponseDto(savedReservation!);
// }

//   async findAll(filters?: FilterReservationsDto): Promise<ReservationResponseDto[]> {
//     const where: any = {};

//     if (filters?.clientId) where.clientId = filters.clientId;
//     if (filters?.spaceId) where.spaceId = filters.spaceId;
//     if (filters?.status) where.status = filters.status;
//     if (filters?.vehicleType) where.vehicleType = filters.vehicleType;
//     if (filters?.startDate && filters?.endDate) {
//       where.startTime = Between(new Date(filters.startDate), new Date(filters.endDate));
//     }

//     const reservations = await this.reservationRepository.find({
//       where,
//       relations: ['client', 'space', 'space.parkingLot'],
//       order: { createdAt: 'DESC' },
//     });

//     return await Promise.all(reservations.map(r => this.mapToResponseDto(r)));
//   }

//   async findOne(id: string): Promise<ReservationResponseDto> {
//     const reservation = await this.reservationRepository.findOne({
//       where: { id },
//       relations: ['client', 'space', 'space.parkingLot', 'appliedRate'],
//     });

//     if (!reservation) {
//       throw new NotFoundException(`Reserva con ID ${id} no encontrada`);
//     }

//     return this.mapToResponseDto(reservation);
//   }

//   async findMyReservations(userId: string): Promise<ReservationResponseDto[]> {
//     const client = await this.clientRepository.findOne({
//       where: { userId },
//     });

//     if (!client) {
//       throw new NotFoundException('Perfil de cliente no encontrado');
//     }

//     const reservations = await this.reservationRepository.find({
//       where: { clientId: client.id },
//       relations: ['client', 'space', 'space.parkingLot'],
//       order: { createdAt: 'DESC' },
//     });

//     return await Promise.all(reservations.map(r => this.mapToResponseDto(r)));
//   }

//   async findByParkingLot(parkingLotId: string, userId: string, userRole: string): Promise<ReservationResponseDto[]> {
//     // Verificar permisos
//     if (userRole !== UserRole.PARKING_OWNER && userRole !== UserRole.PARKING_EMPLOYEE && userRole !== UserRole.ADMIN) {
//       throw new ForbiddenException('No tienes permiso para ver estas reservas');
//     }

//     const reservations = await this.reservationRepository.find({
//       where: { space: { parkingLotId } },
//       relations: ['client', 'space', 'space.parkingLot'],
//       order: { startTime: 'ASC' },
//     });

//     return await Promise.all(reservations.map(r => this.mapToResponseDto(r)));
//   }

//   async confirmReservation(id: string, userId: string, userRole: string): Promise<ReservationResponseDto> {
//     const reservation = await this.reservationRepository.findOne({
//       where: { id },
//       relations: ['client', 'client.user', 'space', 'space.parkingLot'],
//     });

//     if (!reservation) {
//       throw new NotFoundException(`Reserva con ID ${id} no encontrada`);
//     }

//     // Verificar permisos (solo dueño o empleado)
//     if (userRole !== UserRole.PARKING_OWNER && userRole !== UserRole.PARKING_EMPLOYEE && userRole !== UserRole.ADMIN) {
//       throw new ForbiddenException('No tienes permiso para confirmar reservas');
//     }

//     if (reservation.status !== ReservationStatus.PENDING_CONFIRMATION) {
//       throw new BadRequestException(`La reserva no puede ser confirmada (estado actual: ${reservation.status})`);
//     }

//     reservation.status = ReservationStatus.CONFIRMED;
//     reservation.updatedAt = new Date();
//     await this.reservationRepository.save(reservation);

//     // Enviar notificación al cliente
//     if (reservation.client?.user?.email) {
//       await this.notificationsService.sendReservationConfirmedNotification(
//         reservation.client.user.email,
//         {
//           reservationId: reservation.id,
//           spaceNumber: reservation.space?.spaceNumber || 'N/A',
//           startTime: reservation.startTime,
//           endTime: reservation.endTime,
//         },
//       );
//     }

//     // Emitir evento WebSocket al cliente
//     if (reservation.client?.user?.id) {
//       this.websocketGateway.emitReservationConfirmed(reservation.client.user.id, {
//         id: reservation.id,
//         spaceNumber: reservation.space?.spaceNumber || 'N/A',
//         startTime: reservation.startTime,
//         endTime: reservation.endTime,
//       });
//     }

//     return this.mapToResponseDto(reservation);
//   }

//   async cancelByClient(id: string, userId: string): Promise<ReservationResponseDto> {
//     const reservation = await this.reservationRepository.findOne({
//       where: { id },
//       relations: ['client', 'client.user', 'space', 'space.parkingLot'],
//     });

//     if (!reservation) {
//       throw new NotFoundException(`Reserva con ID ${id} no encontrada`);
//     }

//     // Verificar que la reserva pertenezca al cliente
//     const client = await this.clientRepository.findOne({ where: { userId } });
//     if (!client || reservation.clientId !== client.id) {
//       throw new ForbiddenException('No puedes cancelar una reserva que no te pertenece');
//     }

//     if (reservation.status === ReservationStatus.COMPLETED) {
//       throw new BadRequestException('No se puede cancelar una reserva ya completada');
//     }

//     if (reservation.status === ReservationStatus.CANCELLED_BY_CLIENT ||
//         reservation.status === ReservationStatus.CANCELLED_BY_PARKING) {
//       throw new BadRequestException('La reserva ya fue cancelada');
//     }

//     reservation.status = ReservationStatus.CANCELLED_BY_CLIENT;
//     reservation.cancelledAt = new Date();
//     reservation.cancellationReason = 'Cancelado por el cliente';

//     // Liberar el espacio
//     const space = reservation.space;
//     if (space) {
//       space.status = SpaceStatus.AVAILABLE;
//       space.isReserved = false;
//       space.reservedUntil = null;
//       await this.spaceRepository.save(space);
//     }

//     await this.reservationRepository.save(reservation);

//     // Emitir evento WebSocket al dueño/empleado
//     const parkingLotId = reservation.space?.parkingLotId;
//     if (parkingLotId) {
//       this.websocketGateway.emitReservationCancelled(
//         reservation.space?.parkingLot?.owner?.userId,
//         {
//           id: reservation.id,
//           spaceNumber: reservation.space?.spaceNumber || 'N/A',
//           cancelledBy: 'client',
//           reason: 'Cancelado por el cliente',
//         }
//       );

//       // Emitir actualización de espacio (liberado)
//       this.websocketGateway.emitSpaceUpdate(parkingLotId, reservation.spaceId, SpaceStatus.AVAILABLE);
//     }

//     return this.mapToResponseDto(reservation);
//   }

//   async cancelByParking(id: string, userId: string, userRole: string, reason?: string): Promise<ReservationResponseDto> {
//     const reservation = await this.reservationRepository.findOne({
//       where: { id },
//       relations: ['client', 'client.user', 'space', 'space.parkingLot'],
//     });

//     if (!reservation) {
//       throw new NotFoundException(`Reserva con ID ${id} no encontrada`);
//     }

//     // Verificar permisos
//     if (userRole !== UserRole.PARKING_OWNER && userRole !== UserRole.PARKING_EMPLOYEE && userRole !== UserRole.ADMIN) {
//       throw new ForbiddenException('No tienes permiso para cancelar reservas');
//     }

//     if (reservation.status === ReservationStatus.COMPLETED) {
//       throw new BadRequestException('No se puede cancelar una reserva ya completada');
//     }

//     reservation.status = ReservationStatus.CANCELLED_BY_PARKING;
//     reservation.cancelledAt = new Date();
//     reservation.cancellationReason = reason || 'Cancelado por el estacionamiento';

//     // Liberar el espacio
//     const space = reservation.space;
//     if (space) {
//       space.status = SpaceStatus.AVAILABLE;
//       space.isReserved = false;
//       space.reservedUntil = null;
//       await this.spaceRepository.save(space);
//     }

//     await this.reservationRepository.save(reservation);

//     // Notificar al cliente
//     if (reservation.client?.user?.email) {
//       await this.notificationsService.sendReservationCancelledNotification(
//         reservation.client.user.email,
//         {
//           reservationId: reservation.id,
//           spaceNumber: reservation.space?.spaceNumber || 'N/A',
//           reason: reservation.cancellationReason,
//         },
//       );
//     }

//     // Emitir evento WebSocket al cliente
//     if (reservation.client?.user?.id) {
//       this.websocketGateway.emitReservationCancelled(
//         reservation.client.user.id,
//         {
//           id: reservation.id,
//           spaceNumber: reservation.space?.spaceNumber || 'N/A',
//           cancelledBy: 'parking',
//           reason: reservation.cancellationReason,
//         }
//       );
//     }

//     // Emitir actualización de espacio (liberado)
//     if (reservation.space?.parkingLotId) {
//       this.websocketGateway.emitSpaceUpdate(reservation.space.parkingLotId, reservation.spaceId, SpaceStatus.AVAILABLE);
//     }

//     return this.mapToResponseDto(reservation);
//   }

//   async update(id: string, updateDto: UpdateReservationDto, userId: string, userRole: string): Promise<ReservationResponseDto> {
//     const reservation = await this.reservationRepository.findOne({
//       where: { id },
//       relations: ['space'],
//     });

//     if (!reservation) {
//       throw new NotFoundException(`Reserva con ID ${id} no encontrada`);
//     }

//     // Solo admin puede editar reservas directamente
//     if (userRole !== UserRole.ADMIN) {
//       throw new ForbiddenException('No tienes permiso para modificar reservas');
//     }

//     Object.assign(reservation, updateDto);
//     await this.reservationRepository.save(reservation);

//     return this.mapToResponseDto(reservation);
//   }

//   async remove(id: string, userId: string, userRole: string): Promise<void> {
//     const reservation = await this.reservationRepository.findOne({
//       where: { id },
//     });

//     if (!reservation) {
//       throw new NotFoundException(`Reserva con ID ${id} no encontrada`);
//     }

//     // Solo admin puede eliminar permanentemente
//     if (userRole !== UserRole.ADMIN) {
//       throw new ForbiddenException('No tienes permiso para eliminar reservas');
//     }

//     await this.reservationRepository.delete(id);
//   }

//   async changeSpace(reservationId: string, newSpaceId: string, userId: string, userRole: string): Promise<ReservationResponseDto> {
//     const reservation = await this.reservationRepository.findOne({
//       where: { id: reservationId },
//       relations: ['space', 'space.parkingLot'],
//     });

//     if (!reservation) {
//       throw new NotFoundException('Reserva no encontrada');
//     }

//     // Verificar permisos
//     if (userRole !== UserRole.ADMIN && userRole !== UserRole.PARKING_OWNER && userRole !== UserRole.PARKING_EMPLOYEE) {
//       throw new ForbiddenException('No tienes permiso para cambiar el espacio de una reserva');
//     }

//     // Obtener el nuevo espacio
//     const newSpace = await this.spaceRepository.findOne({
//       where: { id: newSpaceId, parkingLotId: reservation.space?.parkingLotId },
//     });

//     if (!newSpace) {
//       throw new NotFoundException('Espacio no encontrado en este estacionamiento');
//     }

//     // Verificar que el nuevo espacio admita el tipo de vehículo
//     if (!newSpace.allowedVehicleTypes.includes(reservation.vehicleType)) {
//       throw new BadRequestException(`El espacio no admite vehículos tipo ${reservation.vehicleType}`);
//     }

//     // Verificar que el nuevo espacio esté disponible
//     if (newSpace.status !== SpaceStatus.AVAILABLE) {
//       throw new ConflictException('El espacio no está disponible');
//     }

//     // Liberar el espacio anterior
//     const oldSpace = reservation.space;
//     if (oldSpace) {
//       oldSpace.status = SpaceStatus.AVAILABLE;
//       oldSpace.isReserved = false;
//       oldSpace.reservedUntil = null;
//       await this.spaceRepository.save(oldSpace);
//     }

//     // Asignar el nuevo espacio
//     newSpace.status = SpaceStatus.RESERVED;
//     newSpace.isReserved = true;
//     newSpace.reservedUntil = reservation.endTime;
//     await this.spaceRepository.save(newSpace);

//     // Actualizar la reserva
//     reservation.spaceId = newSpace.id;
//     await this.reservationRepository.save(reservation);

//     return this.mapToResponseDto(reservation);
//   }

//   @Cron(CronExpression.EVERY_5_MINUTES)
//   async expirePendingReservations() {
//     const expiredReservations = await this.reservationRepository.find({
//       where: {
//         status: ReservationStatus.PENDING_CONFIRMATION,
//         expiresAt: LessThan(new Date()),
//       },
//       relations: ['client', 'client.user', 'space'],
//     });

//     for (const reservation of expiredReservations) {
//       reservation.status = ReservationStatus.EXPIRED;
//       await this.reservationRepository.save(reservation);

//       console.log(`📅 Reserva ${reservation.id} expirada por falta de confirmación`);

//       if (reservation.client?.user?.email) {
//         await this.notificationsService.sendReservationExpiredNotification(
//           reservation.client.user.email,
//           {
//             reservationId: reservation.id,
//             spaceNumber: reservation.space?.spaceNumber || 'N/A',
//           }
//         );
//       }
//     }
//   }

//  @Cron(CronExpression.EVERY_5_MINUTES)
// async blockSpacesForUpcomingReservations() {
//   const now = new Date();
  
//   const reservationsToBlock = await this.reservationRepository.find({
//     where: {
//       status: ReservationStatus.CONFIRMED,
//       blockSpaceAt: LessThan(now),
//       startTime: MoreThan(now), // ← Solo si la reserva aún no comenzó
//     },
//     relations: ['space'],
//   });

//   for (const reservation of reservationsToBlock) {
//     if (!reservation.space) continue;

//     if (reservation.space.status === SpaceStatus.AVAILABLE) {
//       reservation.space.status = SpaceStatus.RESERVED;
//       reservation.space.isReserved = true;
//       reservation.space.reservedUntil = reservation.startTime;
//       await this.spaceRepository.save(reservation.space);

//       console.log(`🔒 Espacio ${reservation.space.spaceNumber} bloqueado para reserva ${reservation.id}`);
      
//       this.websocketGateway.emitSpaceUpdate(
//         reservation.space.parkingLotId,
//         reservation.space.id,
//         SpaceStatus.RESERVED
//       );
//     }
//   }}

// @Cron(CronExpression.EVERY_5_MINUTES)
// async expireConfirmedReservations() {
//   const now = new Date();
//   // Dar 5 minutos de gracia después de la hora de inicio
//   const gracePeriod = 5 * 60 * 1000; // 5 minutos en milisegundos
  
//   const expiredConfirmedReservations = await this.reservationRepository.find({
//     where: {
//       status: ReservationStatus.CONFIRMED,
//       // Solo expirar si la hora de inicio fue hace más de 5 minutos
//       startTime: LessThan(new Date(now.getTime() - gracePeriod)),
//     },
//     relations: ['space'],
//   });

//   for (const reservation of expiredConfirmedReservations) {
//     reservation.status = ReservationStatus.EXPIRED;
//     await this.reservationRepository.save(reservation);
    
//     if (reservation.space && reservation.space.status === SpaceStatus.RESERVED) {
//       reservation.space.status = SpaceStatus.AVAILABLE;
//       reservation.space.isReserved = false;
//       reservation.space.reservedUntil = null;
//       await this.spaceRepository.save(reservation.space);
      
//       console.log(`⏰ Reserva ${reservation.id} expirada (hora de inicio ${reservation.startTime} pasó hace más de 5 min).`);
      
//       this.websocketGateway.emitSpaceUpdate(
//         reservation.space.parkingLotId,
//         reservation.space.id,
//         SpaceStatus.AVAILABLE
//       );
//     }
//   }
// }


//   private async mapToResponseDto(reservation: Reservation): Promise<ReservationResponseDto> {
//     return {
//       id: reservation.id,
//       spaceId: reservation.spaceId,
//       spaceNumber: reservation.space?.spaceNumber || '',
//       parkingLotId: reservation.space?.parkingLot?.id || '',
//       parkingLotName: reservation.space?.parkingLot?.name || '',
//       vehicleType: reservation.vehicleType,
//       vehiclePlate: reservation.vehiclePlate,
//       startTime: reservation.startTime,
//       endTime: reservation.endTime,
//       status: reservation.status,
//       totalAmount: reservation.totalAmount,
//       createdAt: reservation.createdAt,
//       expiresAt: reservation.expiresAt ? reservation.expiresAt.toISOString() : undefined,
//       clientName: reservation.client?.name || undefined,
//     };
//   }
// }

// src/modules/reservations/reservations.service.ts
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
import { Cron, CronExpression } from '@nestjs/schedule';
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
  ) {}

  async create(createDto: CreateReservationDto, userId: string): Promise<ReservationResponseDto> {
    // 1. Obtener el cliente
    const client = await this.clientRepository.findOne({
      where: { userId },
    });

    if (!client) {
      throw new NotFoundException('Perfil de cliente no encontrado');
    }

    // 2. Validar fechas
    const startTime = new Date(createDto.startTime);
    const endTime = new Date(createDto.endTime);
    const now = new Date();

    if (startTime < now) {
      throw new BadRequestException('La fecha de inicio no puede ser en el pasado');
    }

    if (endTime <= startTime) {
      throw new BadRequestException('La fecha de fin debe ser posterior a la fecha de inicio');
    }

    // 3. Obtener el parking lot y sus settings
    const parkingLot = await this.parkingLotRepository.findOne({
      where: { id: createDto.parkingLotId },
      relations: ['owner', 'owner.user'],
    });

    if (!parkingLot) {
      throw new NotFoundException('Estacionamiento no encontrado');
    }

    const settings = parkingLot.settings;
    if (!settings.allowOnlineReservations) {
      throw new BadRequestException('Este estacionamiento no permite reservas online');
    }

    // Validar anticipación máxima
    const daysInAdvance = (startTime.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    const maxAdvanceDays = settings.maxAdvanceDays || 30;
    if (daysInAdvance > maxAdvanceDays) {
      throw new BadRequestException(`No se puede reservar con más de ${maxAdvanceDays} días de anticipación`);
    }

    // Validar duración máxima
    const durationHours = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
    const maxReservationHours = settings.maxReservationHours || 24;
    if (durationHours > maxReservationHours) {
      throw new BadRequestException(`La reserva no puede exceder las ${maxReservationHours} horas`);
    }

    // 4. Buscar TODOS los espacios disponibles del parking
    const allAvailableSpaces = await this.spaceRepository.find({
      where: {
        parkingLotId: createDto.parkingLotId,
        status: SpaceStatus.AVAILABLE,
        allowsReservations: true,
        isActive: true,
      },
    });

    if (allAvailableSpaces.length === 0) {
      throw new NotFoundException('No hay espacios disponibles en este estacionamiento');
    }

    // 5. Filtrar por tipo de vehículo
    const compatibleSpaces = allAvailableSpaces.filter(space =>
      space.allowedVehicleTypes.includes(createDto.vehicleType)
    );

    if (compatibleSpaces.length === 0) {
      throw new BadRequestException(`No hay espacios disponibles para vehículos tipo ${createDto.vehicleType}`);
    }

    // 6. Obtener reservas activas que bloquean disponibilidad
    const activeStatuses = [
      ReservationStatus.PENDING_CONFIRMATION,
      ReservationStatus.CONFIRMED,
    ];

    const spaceIds = compatibleSpaces.map(s => s.id);
    const conflictingReservations = await this.reservationRepository.find({
      where: {
        spaceId: In(spaceIds),
        status: In(activeStatuses),
        startTime: LessThan(endTime),
        endTime: MoreThan(startTime),
      },
    });

    const conflictingSpaceIds = new Set(conflictingReservations.map(r => r.spaceId));

    // 7. Filtrar espacios sin conflictos de horario
    const freeSpaces = compatibleSpaces.filter(space => !conflictingSpaceIds.has(space.id));

    if (freeSpaces.length === 0) {
      throw new ConflictException('No hay espacios disponibles en el horario seleccionado');
    }

    // 8. Seleccionar el mejor espacio (el de menor número)
    const selectedSpace = freeSpaces.sort((a, b) => {
      const numA = parseInt(a.spaceNumber.match(/\d+/)?.[0] || '0');
      const numB = parseInt(b.spaceNumber.match(/\d+/)?.[0] || '0');
      return numA - numB;
    })[0];

    // 9. Calcular tarifa y monto
    const rate = await this.ratesService.findApplicableRate(
      parkingLot.id,
      createDto.vehicleType,
      startTime,
    );

    if (!rate) {
      throw new BadRequestException('No hay tarifa configurada para este tipo de vehículo');
    }

    const hours = Math.ceil((endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60));
    const totalAmount = rate.pricePerHour * Math.max(1, hours);

    // Calcular fechas importantes
    const expiresAt = new Date();
    const reservationHoldMinutes = settings.reservationHoldMinutes || 120;
    expiresAt.setMinutes(expiresAt.getMinutes() + reservationHoldMinutes);

    const blockSpaceAt = new Date(startTime);
    const blockSpaceHoursBefore = settings.blockSpaceHoursBefore || 2;
    blockSpaceAt.setHours(blockSpaceAt.getHours() - blockSpaceHoursBefore);

    // 10. Crear reserva
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

    // ✅ BLOQUEAR ESPACIO INMEDIATAMENTE SI CORRESPONDE
    if (blockSpaceAt <= now) {
      if (selectedSpace.status === SpaceStatus.AVAILABLE) {
        selectedSpace.status = SpaceStatus.RESERVED;
        selectedSpace.isReserved = true;
        selectedSpace.reservedUntil = startTime;
        await this.spaceRepository.save(selectedSpace);
        
        console.log(`🔒 Espacio ${selectedSpace.spaceNumber} bloqueado inmediatamente para reserva ${reservation.id} (blockSpaceAt: ${blockSpaceAt})`);
        
        this.websocketGateway.emitSpaceUpdate(
          parkingLot.id,
          selectedSpace.id,
          SpaceStatus.RESERVED
        );
      }
    }

    // Recargar la reserva con relaciones
    const savedReservation = await this.reservationRepository.findOne({
      where: { id: reservation.id },
      relations: ['client', 'space', 'space.parkingLot'],
    });

    // 11. Enviar notificación al dueño
    await this.notificationsService.sendNewReservationNotification(
      parkingLot.owner.user.email,
      {
        reservationId: savedReservation!.id,
        spaceNumber: selectedSpace.spaceNumber,
        startTime,
        endTime,
        vehiclePlate: createDto.vehiclePlate,
      },
    );

    // 12. WebSocket: notificar nueva reserva
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
    if (userRole !== UserRole.PARKING_OWNER && userRole !== UserRole.PARKING_EMPLOYEE && userRole !== UserRole.ADMIN) {
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
      relations: ['client', 'client.user', 'space', 'space.parkingLot'],
    });

    if (!reservation) {
      throw new NotFoundException(`Reserva con ID ${id} no encontrada`);
    }

    if (userRole !== UserRole.PARKING_OWNER && userRole !== UserRole.PARKING_EMPLOYEE && userRole !== UserRole.ADMIN) {
      throw new ForbiddenException('No tienes permiso para confirmar reservas');
    }

    if (reservation.status !== ReservationStatus.PENDING_CONFIRMATION) {
      throw new BadRequestException(`La reserva no puede ser confirmada (estado actual: ${reservation.status})`);
    }

    // ✅ No permitir confirmar si ya pasó la hora de inicio
    if (reservation.startTime < new Date()) {
      throw new BadRequestException('No se puede confirmar una reserva cuya hora de inicio ya pasó');
    }

    reservation.status = ReservationStatus.CONFIRMED;
    reservation.updatedAt = new Date();
    await this.reservationRepository.save(reservation);

    // ✅ BLOQUEAR ESPACIO INMEDIATAMENTE SI CORRESPONDE
    const now = new Date();
    if (reservation.blockSpaceAt! <= now) {
      const space = reservation.space;
      if (space && space.status === SpaceStatus.AVAILABLE) {
        space.status = SpaceStatus.RESERVED;
        space.isReserved = true;
        space.reservedUntil = reservation.startTime;
        await this.spaceRepository.save(space);
        
        console.log(`🔒 Espacio ${space.spaceNumber} bloqueado inmediatamente para reserva ${reservation.id} (blockSpaceAt: ${reservation.blockSpaceAt})`);
        
        this.websocketGateway.emitSpaceUpdate(
          space.parkingLotId,
          space.id,
          SpaceStatus.RESERVED
        );
      }
    }

    // Enviar notificación al cliente
    if (reservation.client?.user?.email) {
      await this.notificationsService.sendReservationConfirmedNotification(
        reservation.client.user.email,
        {
          reservationId: reservation.id,
          spaceNumber: reservation.space?.spaceNumber || 'N/A',
          startTime: reservation.startTime,
          endTime: reservation.endTime,
        },
      );
    }

    if (reservation.client?.user?.id) {
      this.websocketGateway.emitReservationConfirmed(reservation.client.user.id, {
        id: reservation.id,
        spaceNumber: reservation.space?.spaceNumber || 'N/A',
        startTime: reservation.startTime,
        endTime: reservation.endTime,
      });
    }

    return this.mapToResponseDto(reservation);
  }

  async cancelByClient(id: string, userId: string): Promise<ReservationResponseDto> {
    const reservation = await this.reservationRepository.findOne({
      where: { id },
      relations: ['client', 'client.user', 'space', 'space.parkingLot'],
    });

    if (!reservation) {
      throw new NotFoundException(`Reserva con ID ${id} no encontrada`);
    }

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

    const space = reservation.space;
    if (space && space.status === SpaceStatus.RESERVED) {
      space.status = SpaceStatus.AVAILABLE;
      space.isReserved = false;
      space.reservedUntil = null;
      await this.spaceRepository.save(space);
    }

    await this.reservationRepository.save(reservation);

    const parkingLotId = reservation.space?.parkingLotId;
    if (parkingLotId) {
      this.websocketGateway.emitReservationCancelled(
        reservation.space?.parkingLot?.owner?.userId,
        {
          id: reservation.id,
          spaceNumber: reservation.space?.spaceNumber || 'N/A',
          cancelledBy: 'client',
          reason: 'Cancelado por el cliente',
        }
      );
      this.websocketGateway.emitSpaceUpdate(parkingLotId, reservation.spaceId, SpaceStatus.AVAILABLE);
    }

    return this.mapToResponseDto(reservation);
  }

  async cancelByParking(id: string, userId: string, userRole: string, reason?: string): Promise<ReservationResponseDto> {
    const reservation = await this.reservationRepository.findOne({
      where: { id },
      relations: ['client', 'client.user', 'space', 'space.parkingLot'],
    });

    if (!reservation) {
      throw new NotFoundException(`Reserva con ID ${id} no encontrada`);
    }

    if (userRole !== UserRole.PARKING_OWNER && userRole !== UserRole.PARKING_EMPLOYEE && userRole !== UserRole.ADMIN) {
      throw new ForbiddenException('No tienes permiso para cancelar reservas');
    }

    if (reservation.status === ReservationStatus.COMPLETED) {
      throw new BadRequestException('No se puede cancelar una reserva ya completada');
    }

    reservation.status = ReservationStatus.CANCELLED_BY_PARKING;
    reservation.cancelledAt = new Date();
    reservation.cancellationReason = reason || 'Cancelado por el estacionamiento';

    const space = reservation.space;
    if (space && space.status === SpaceStatus.RESERVED) {
      space.status = SpaceStatus.AVAILABLE;
      space.isReserved = false;
      space.reservedUntil = null;
      await this.spaceRepository.save(space);
    }

    await this.reservationRepository.save(reservation);

    if (reservation.client?.user?.email) {
      await this.notificationsService.sendReservationCancelledNotification(
        reservation.client.user.email,
        {
          reservationId: reservation.id,
          spaceNumber: reservation.space?.spaceNumber || 'N/A',
          reason: reservation.cancellationReason,
        },
      );
    }

    if (reservation.client?.user?.id) {
      this.websocketGateway.emitReservationCancelled(
        reservation.client.user.id,
        {
          id: reservation.id,
          spaceNumber: reservation.space?.spaceNumber || 'N/A',
          cancelledBy: 'parking',
          reason: reservation.cancellationReason,
        }
      );
    }

    if (reservation.space?.parkingLotId) {
      this.websocketGateway.emitSpaceUpdate(reservation.space.parkingLotId, reservation.spaceId, SpaceStatus.AVAILABLE);
    }

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

    if (userRole !== UserRole.ADMIN) {
      throw new ForbiddenException('No tienes permiso para eliminar reservas');
    }

    await this.reservationRepository.delete(id);
  }

  async changeSpace(reservationId: string, newSpaceId: string, userId: string, userRole: string): Promise<ReservationResponseDto> {
    const reservation = await this.reservationRepository.findOne({
      where: { id: reservationId },
      relations: ['space', 'space.parkingLot'],
    });

    if (!reservation) {
      throw new NotFoundException('Reserva no encontrada');
    }

    if (userRole !== UserRole.ADMIN && userRole !== UserRole.PARKING_OWNER && userRole !== UserRole.PARKING_EMPLOYEE) {
      throw new ForbiddenException('No tienes permiso para cambiar el espacio de una reserva');
    }

    const newSpace = await this.spaceRepository.findOne({
      where: { id: newSpaceId, parkingLotId: reservation.space?.parkingLotId },
    });

    if (!newSpace) {
      throw new NotFoundException('Espacio no encontrado en este estacionamiento');
    }

    if (!newSpace.allowedVehicleTypes.includes(reservation.vehicleType)) {
      throw new BadRequestException(`El espacio no admite vehículos tipo ${reservation.vehicleType}`);
    }

    if (newSpace.status !== SpaceStatus.AVAILABLE) {
      throw new ConflictException('El espacio no está disponible');
    }

    const oldSpace = reservation.space;
    if (oldSpace && oldSpace.status === SpaceStatus.RESERVED) {
      oldSpace.status = SpaceStatus.AVAILABLE;
      oldSpace.isReserved = false;
      oldSpace.reservedUntil = null;
      await this.spaceRepository.save(oldSpace);
    }

    newSpace.status = SpaceStatus.RESERVED;
    newSpace.isReserved = true;
    newSpace.reservedUntil = reservation.endTime;
    await this.spaceRepository.save(newSpace);

    reservation.spaceId = newSpace.id;
    await this.reservationRepository.save(reservation);

    return this.mapToResponseDto(reservation);
  }

  @Cron(CronExpression.EVERY_5_MINUTES)
  async expirePendingReservations() {
    const expiredReservations = await this.reservationRepository.find({
      where: {
        status: ReservationStatus.PENDING_CONFIRMATION,
        expiresAt: LessThan(new Date()),
      },
      relations: ['client', 'client.user', 'space'],
    });

    for (const reservation of expiredReservations) {
      reservation.status = ReservationStatus.EXPIRED;
      await this.reservationRepository.save(reservation);

      console.log(`📅 Reserva ${reservation.id} expirada por falta de confirmación`);

      if (reservation.client?.user?.email) {
        await this.notificationsService.sendReservationExpiredNotification(
          reservation.client.user.email,
          {
            reservationId: reservation.id,
            spaceNumber: reservation.space?.spaceNumber || 'N/A',
          }
        );
      }
    }
  }

@Cron(CronExpression.EVERY_5_MINUTES)
async blockSpacesForUpcomingReservations() {
  const now = new Date();
  
  const reservationsToBlock = await this.reservationRepository.find({
    where: {
      status: ReservationStatus.CONFIRMED,
      blockSpaceAt: LessThan(now),
      startTime: MoreThan(now),
    },
    relations: ['space', 'space.parkingLot', 'client', 'client.user'],
  });

  for (const reservation of reservationsToBlock) {
    const space = reservation.space;
    if (!space) continue;

    // ✅ Si el espacio está disponible, bloquear normalmente
    if (space.status === SpaceStatus.AVAILABLE) {
      await this.blockSpaceForReservation(reservation, space);  // ← CORREGIDO: llamar a blockSpaceForReservation
      continue;
    }

    // ✅ Si el espacio está ocupado, buscar alternativa
    if (space.status === SpaceStatus.OCCUPIED) {
      console.log(`⚠️ Conflicto: Espacio ${space.spaceNumber} está OCUPADO para reserva ${reservation.id}`);
      
      const alternativeSpace = await this.findAlternativeSpace(reservation);
      
      if (alternativeSpace) {
        await this.reassignReservation(reservation, alternativeSpace);
        console.log(`🔄 Reserva ${reservation.id} reasignada del espacio ${space.spaceNumber} al ${alternativeSpace.spaceNumber}`);
      } else {
        await this.handleBlockingConflict(reservation, space);
      }
    }
  }
}
private async blockSpaceForReservation(reservation: Reservation, space: Space): Promise<void> {
  space.status = SpaceStatus.RESERVED;
  space.isReserved = true;
  space.reservedUntil = reservation.startTime;
  await this.spaceRepository.save(space);

  console.log(`🔒 Espacio ${space.spaceNumber} bloqueado para reserva ${reservation.id}`);
  
  this.websocketGateway.emitSpaceUpdate(
    space.parkingLotId,
    space.id,
    SpaceStatus.RESERVED
  );
}


/**
 * Buscar un espacio alternativo para la reserva
 */
private async findAlternativeSpace(reservation: Reservation): Promise<Space | null> {
  // Buscar espacios disponibles en el mismo parking
  const availableSpaces = await this.spaceRepository.find({
    where: {
      parkingLotId: reservation.space.parkingLotId,
      status: SpaceStatus.AVAILABLE,
      allowsReservations: true,
      isActive: true,
    },
  });

  // Filtrar por tipo de vehículo
  const compatibleSpaces = availableSpaces.filter(space =>
    space.allowedVehicleTypes.includes(reservation.vehicleType)
  );

  // Filtrar espacios sin conflictos de horario
  const spaceIds = compatibleSpaces.map(s => s.id);
  const conflictingReservations = await this.reservationRepository.find({
    where: {
      spaceId: In(spaceIds),
      status: In([ReservationStatus.PENDING_CONFIRMATION, ReservationStatus.CONFIRMED]),
      startTime: LessThan(reservation.endTime),
      endTime: MoreThan(reservation.startTime),
    },
  });

  const conflictingSpaceIds = new Set(conflictingReservations.map(r => r.spaceId));
  const freeSpaces = compatibleSpaces.filter(space => !conflictingSpaceIds.has(space.id));

  return freeSpaces.length > 0 ? freeSpaces[0] : null;
}

/**
 * Reasignar reserva a otro espacio
 */
private async reassignReservation(reservation: Reservation, newSpace: Space): Promise<void> {
  const oldSpace = reservation.space;
  
  // Cambiar el espacio en la reserva
  reservation.spaceId = newSpace.id;
  await this.reservationRepository.save(reservation);
  
  // Bloquear el nuevo espacio
  newSpace.status = SpaceStatus.RESERVED;
  newSpace.isReserved = true;
  newSpace.reservedUntil = reservation.startTime;
  await this.spaceRepository.save(newSpace);
  
  // Notificar al cliente
  if (reservation.client?.user?.email) {
    await this.notificationsService.sendSpaceChangedNotification(
      reservation.client.user.email,
      {
        reservationId: reservation.id,
        oldSpaceNumber: oldSpace.spaceNumber,
        newSpaceNumber: newSpace.spaceNumber,
        startTime: reservation.startTime,
        endTime: reservation.endTime,
      }
    );
  }
  
  // Notificar al dueño
  if (reservation.space?.parkingLot?.owner?.user?.email) {
    await this.notificationsService.sendSpaceChangedNotification(
      reservation.space.parkingLot.owner.user.email,
      {
        reservationId: reservation.id,
        oldSpaceNumber: oldSpace.spaceNumber,
        newSpaceNumber: newSpace.spaceNumber,
      }
    );
  }
  
  // WebSocket
  this.websocketGateway.emitSpaceUpdate(oldSpace.parkingLotId, oldSpace.id, SpaceStatus.AVAILABLE);
  this.websocketGateway.emitSpaceUpdate(newSpace.parkingLotId, newSpace.id, SpaceStatus.RESERVED);
}

/**
 * Manejar conflicto cuando no hay espacio alternativo
 */
private async handleBlockingConflict(reservation: Reservation, blockedSpace: Space): Promise<void> {
  // Marcar la reserva como en espera
  reservation.status = ReservationStatus.PENDING_CONFIRMATION;
  await this.reservationRepository.save(reservation);
  
  // Notificar al dueño
  if (reservation.space?.parkingLot?.owner?.user?.email) {
    await this.notificationsService.sendSpaceConflictNotification(
      reservation.space.parkingLot.owner.user.email,
      {
        reservationId: reservation.id,
        spaceNumber: blockedSpace.spaceNumber,
        startTime: reservation.startTime,
        endTime: reservation.endTime,
        occupiedBy: blockedSpace.occupiedByVehiclePlate || 'vehículo desconocido',
      }
    );
  }
  
  // Notificar al cliente
  if (reservation.client?.user?.email) {
    await this.notificationsService.sendReservationPendingNotification(
      reservation.client.user.email,
      {
        reservationId: reservation.id,
        spaceNumber: blockedSpace.spaceNumber,
        startTime: reservation.startTime,
      }
    );
  }
  
  console.log(`⚠️ Conflicto sin solución: Reserva ${reservation.id} espera liberación del espacio ${blockedSpace.spaceNumber}`);
}

  @Cron(CronExpression.EVERY_5_MINUTES)
  async expireConfirmedReservations() {
    const now = new Date();
    const gracePeriod = 5 * 60 * 1000; // 5 minutos de gracia
    
    const expiredConfirmedReservations = await this.reservationRepository.find({
      where: {
        status: ReservationStatus.CONFIRMED,
        startTime: LessThan(new Date(now.getTime() - gracePeriod)),
      },
      relations: ['space'],
    });

    for (const reservation of expiredConfirmedReservations) {
      reservation.status = ReservationStatus.EXPIRED;
      await this.reservationRepository.save(reservation);
      
      if (reservation.space && reservation.space.status === SpaceStatus.RESERVED) {
        reservation.space.status = SpaceStatus.AVAILABLE;
        reservation.space.isReserved = false;
        reservation.space.reservedUntil = null;
        await this.spaceRepository.save(reservation.space);
        
        console.log(`⏰ Reserva ${reservation.id} expirada (hora de inicio ${reservation.startTime} pasó hace más de 5 min).`);
        
        this.websocketGateway.emitSpaceUpdate(
          reservation.space.parkingLotId,
          reservation.space.id,
          SpaceStatus.AVAILABLE
        );
      }
    }
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
      expiresAt: reservation.expiresAt ? reservation.expiresAt.toISOString() : undefined,
      clientName: reservation.client?.name || undefined,
    };
  }
}