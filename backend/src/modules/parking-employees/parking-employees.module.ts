import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ParkingEmployeesService } from './parking-employees.service';
import { ParkingEmployeesController } from './parking-employees.controller';
import { ParkingEmployee } from './entities/parking-employee.entity';
import { User } from '../users/entities/user.entity';
import { ParkingLot } from '../parking-lots/entities/parking-lot.entity';
import { Space } from '../spaces/entities/space.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ParkingEmployee, User, ParkingLot, Space])],
  controllers: [ParkingEmployeesController],
  providers: [ParkingEmployeesService],
  exports: [ParkingEmployeesService],
})
export class ParkingEmployeesModule {}