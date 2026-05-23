import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OccupancyController } from './occupancy.controller';
import { OccupancyService } from './occupancy.service';
import { Occupancy } from './entities/occupancy.entity';
import { Space } from '../spaces/entities/space.entity';
import { Reservation } from '../reservations/entities/reservation.entity';
import { RatesModule } from '../rates/rates.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Occupancy, Space, Reservation]),
    RatesModule,
  ],
  controllers: [OccupancyController],
  providers: [OccupancyService],
  exports: [OccupancyService],
})
export class OccupancyModule {}
