import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReservationsController } from './reservations.controller';
import { ReservationsService } from './reservations.service';
import { Reservation } from './entities/reservation.entity';
import { Space } from '../spaces/entities/space.entity';
import { ClientProfile } from '../client-profiles/entities/client-profile.entity';
import { RatesModule } from '../rates/rates.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { WebsocketModule } from '../websocket/websocket.module';
import { ParkingLot } from '../parking-lots/entities/parking-lot.entity';
@Module({
  imports: [
    TypeOrmModule.forFeature([Reservation, Space, ClientProfile, ParkingLot]), 
    RatesModule,
    NotificationsModule,
    WebsocketModule,
    
  ],
  controllers: [ReservationsController],
  providers: [ReservationsService],
  exports: [ReservationsService],
})
export class ReservationsModule {}