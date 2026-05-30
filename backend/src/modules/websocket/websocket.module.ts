import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WebsocketGateway } from './websocket.gateway';
import { User } from '../users/entities/user.entity';
import { ParkingLot } from '../parking-lots/entities/parking-lot.entity';
import { Space } from '../spaces/entities/space.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, ParkingLot, Space])],
  providers: [WebsocketGateway],
  exports: [WebsocketGateway],
})
export class WebsocketModule {}