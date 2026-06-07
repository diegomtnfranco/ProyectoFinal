// src/modules/websocket/websocket.gateway.ts
import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { User } from '../users/entities/user.entity';
import { ParkingLot } from '../parking-lots/entities/parking-lot.entity';
import { Space } from '../spaces/entities/space.entity';
import { SpaceStatus } from '../spaces/entities/space.entity';

@WebSocketGateway({
  cors: {
    origin: '*',
    credentials: true,
  },
  namespace: '/',
})
@Injectable()
export class WebsocketGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private userSockets: Map<string, string[]> = new Map();

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(ParkingLot)
    private parkingLotRepository: Repository<ParkingLot>,
    @InjectRepository(Space)
    private spaceRepository: Repository<Space>,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async handleConnection(client: Socket) {
    const token = client.handshake.auth.token;
    if (!token) {
      console.log('❌ No token provided, disconnecting');
      client.disconnect();
      return;
    }

    try {
      // ✅ Usar JwtService para verificar el token
      const payload = this.jwtService.verify(token, {
        secret: this.configService.get('JWT_SECRET'),
      });
      
      const user = await this.userRepository.findOne({
        where: { id: payload.sub },
        relations: ['clientProfile', 'parkingOwnerProfile', 'parkingEmployeeProfile'],
      });

      if (!user) {
        console.log('❌ User not found, disconnecting');
        client.disconnect();
        return;
      }

      client.data.user = user;

      // Guardar socket
      const sockets = this.userSockets.get(user.id) || [];
      sockets.push(client.id);
      this.userSockets.set(user.id, sockets);

      // Suscribir a salas según rol
      if (user.role === 'parking_owner') {
        const parkingLots = await this.parkingLotRepository.find({
          where: { owner: { userId: user.id } },
          relations: ['owner'],
        });
        parkingLots.forEach(parking => {
          client.join(`parking:${parking.id}`);
          console.log(`✅ Owner ${user.email} se unió a sala parking:${parking.id}`);
        });
      }

      if (user.role === 'parking_employee') {
        const employee = user.parkingEmployeeProfile;
        if (employee?.parkingLotId) {
          client.join(`parking:${employee.parkingLotId}`);
          console.log(`✅ Employee ${user.email} se unió a sala parking:${employee.parkingLotId}`);
        }
      }

      if (user.role === 'admin') {
        client.join('admin:approvals');
        console.log(`✅ Admin ${user.email} se unió a sala admin:approvals`);
      }

      if (user.role === 'client') {
        console.log(`✅ Client ${user.email} conectado`);
      }

      console.log(`✅ Cliente conectado: ${user.email} (${client.id})`);
    } catch (error) {
      console.error(`❌ Error en conexión: ${client.id}`, error);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const userId = client.data.user?.id;
    if (userId) {
      const sockets = this.userSockets.get(userId) || [];
      const index = sockets.indexOf(client.id);
      if (index !== -1) sockets.splice(index, 1);
      if (sockets.length === 0) this.userSockets.delete(userId);
    }
    console.log(`❌ Cliente desconectado: ${client.id}`);
  }

  // ============ EVENTOS DE SUSCRIPCIÓN ============

  @SubscribeMessage('subscribe:parking')
  handleSubscribeParking(@ConnectedSocket() client: Socket, @MessageBody() data: { parkingLotId: string }) {
    const roomName = `parking:clients:${data.parkingLotId}`;
    client.join(roomName);
    console.log(`📡 Cliente ${client.id} suscrito a sala ${roomName}`);
    return { event: 'subscribed', data: { parkingLotId: data.parkingLotId } };
  }

  // ============ EMISORES DE EVENTOS ============

  /**
   * Nueva reserva creada
   */
  emitNewReservation(parkingLotId: string, reservation: {
    id: string;
    spaceNumber: string;
    startTime: Date;
    endTime: Date;
    vehiclePlate: string;
    clientName: string;
  }) {
    const roomName = `parking:${parkingLotId}`;
    this.server.to(roomName).emit('reservation:new', {
      ...reservation,
      timestamp: new Date(),
    });
    console.log(`📢 Evento reservation:new emitido a sala ${roomName}`);
  }

  /**
   * Reserva confirmada
   */
  emitReservationConfirmed(clientId: string, reservation: {
    id: string;
    spaceNumber: string;
    startTime: Date;
    endTime: Date;
  }) {
    const sockets = this.userSockets.get(clientId) || [];
    sockets.forEach(socketId => {
      this.server.to(socketId).emit('reservation:confirmed', {
        ...reservation,
        timestamp: new Date(),
      });
    });
    console.log(`📢 Evento reservation:confirmed emitido a usuario ${clientId}`);
  }

  /**
   * Reserva cancelada
   */
  emitReservationCancelled(
    targetUserId: string,
    reservation: { id: string; spaceNumber: string; cancelledBy: 'client' | 'parking'; reason?: string }
  ) {
    const sockets = this.userSockets.get(targetUserId) || [];
    sockets.forEach(socketId => {
      this.server.to(socketId).emit('reservation:cancelled', {
        ...reservation,
        timestamp: new Date(),
      });
    });
    console.log(`📢 Evento reservation:cancelled emitido a usuario ${targetUserId}`);
  }

  /**
   * Actualización de espacio (disponibilidad)
   */
  emitSpaceUpdate(parkingLotId: string, spaceId: string, status: string, metadata?: any) {
  // Sala para clientes (mapa)
  const clientRoom = `parking:clients:${parkingLotId}`;
  this.server.to(clientRoom).emit('space:update', {
    spaceId,
    status,
    timestamp: new Date(),
    ...metadata,
  });
  
  // ✅ Sala para dueños/empleados (dashboard)
  const ownerRoom = `parking:${parkingLotId}`;
  this.server.to(ownerRoom).emit('space:update', {
    spaceId,
    status,
    timestamp: new Date(),
    ...metadata,
  });
  
  console.log(`📢 Evento space:update emitido a salas ${clientRoom} y ${ownerRoom}`);
}


  /**
   * Actualización de disponibilidad global del parking
   */
  async emitParkingAvailability(parkingLotId: string) {
    const spaces = await this.spaceRepository.find({
      where: { parkingLotId, isActive: true },
    });

    const availability = {
      totalSpaces: spaces.length,
      availableSpaces: spaces.filter(s => s.status === SpaceStatus.AVAILABLE).length,
      occupiedSpaces: spaces.filter(s => s.status === SpaceStatus.OCCUPIED).length,
      reservedSpaces: spaces.filter(s => s.status === SpaceStatus.RESERVED).length,
    };

    const roomName = `parking:clients:${parkingLotId}`;
    this.server.to(roomName).emit('parking:availability', {
      parkingLotId,
      ...availability,
      timestamp: new Date(),
    });
    console.log(`📢 Evento parking:availability emitido a sala ${roomName}`);
  }

  /**
   * Ocupación actualizada (check-in/out)
   */
  emitOccupancyUpdate(parkingLotId: string, update: {
    spaceId: string;
    spaceNumber: string;
    action: 'check-in' | 'check-out';
    vehiclePlate?: string;
    clientId?: string;
  }) {
    const roomName = `parking:${parkingLotId}`;
    this.server.to(roomName).emit('occupancy:update', {
      ...update,
      timestamp: new Date(),
    });
    console.log(`📢 Evento occupancy:update emitido a sala ${roomName}`);
  }
}