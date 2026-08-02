import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { User } from './entities/user.entity';
import { CommonModule } from '../common/common.module';
import {AuthModule} from "../auth/auth.module";
import { ParkingOwner } from '../parking-owners/entities/parking-owner.entity';
import { ParkingEmployee } from '../parking-employees/entities/parking-employee.entity';
import { ClientProfile } from '../client-profiles/entities/client-profile.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, ParkingOwner, ParkingEmployee, ClientProfile]),CommonModule,AuthModule],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService, TypeOrmModule],
})
export class UsersModule {}