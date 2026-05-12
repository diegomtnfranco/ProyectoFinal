import { Module } from '@nestjs/common';
import { ReservationsService } from './reservations.service';
import { ReservationsController } from './reservations.controller';
import { Reservation } from './entities/reservation.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClientProfile } from 'src/modules/client-profiles/entities/client-profile.entity';
import { ParkingEmployee } from 'src/modules/parking-employees/entities/parking-employee.entity';
import { ParkingLot } from 'src/modules/parking-lots/entities/parking-lot.entity';
import { Space } from 'src/modules/spaces/entities/space.entity';
import { Rate } from 'src/modules/rates/entities/rate.entity';

@Module({
  controllers: [ReservationsController],
  providers: [ReservationsService],
  imports: [
      TypeOrmModule.forFeature([Reservation,Space,ClientProfile,ParkingEmployee,ParkingLot,Rate])
    ],
})
export class ReservationsModule {}
