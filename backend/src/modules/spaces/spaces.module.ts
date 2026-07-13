import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SpacesService } from './spaces.service';
import { SpacesController } from './spaces.controller';
import { Space } from './entities/space.entity';
import { ParkingLot } from '../parking-lots/entities/parking-lot.entity';
import { WebsocketModule } from '../websocket/websocket.module';

@Module({
  imports: [TypeOrmModule.forFeature([Space, ParkingLot]), WebsocketModule],
  controllers: [SpacesController],
  providers: [SpacesService],
  exports: [SpacesService],
})
export class SpacesModule {}