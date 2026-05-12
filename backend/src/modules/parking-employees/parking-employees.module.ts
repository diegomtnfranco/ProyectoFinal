import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ParkingEmployeesService } from './parking-employees.service';
import { ParkingEmployeesController } from './parking-employees.controller';
import { ParkingEmployee } from './entities/parking-employee.entity';
import { User } from '../users/entities/user.entity';
import { ParkingLot } from '../parking-lots/entities/parking-lot.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ParkingEmployee, User, ParkingLot])],
  controllers: [ParkingEmployeesController],
  providers: [ParkingEmployeesService],
  exports: [ParkingEmployeesService],
})
export class ParkingEmployeesModule {}