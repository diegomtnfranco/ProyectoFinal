import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ActivityController } from './activity.controller';
import { ActivityService } from './activity.service';
import { Occupancy } from '../occupancy/entities/occupancy.entity';
import { Reservation } from '../reservations/entities/reservation.entity';
import { ParkingLot } from '../parking-lots/entities/parking-lot.entity';
import { ParkingEmployee } from '../parking-employees/entities/parking-employee.entity';
import { RatesModule } from '../rates/rates.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Occupancy, Reservation, ParkingLot, ParkingEmployee]),
    RatesModule,
  ],
  controllers: [ActivityController],
  providers: [ActivityService],
})
export class ActivityModule {}
