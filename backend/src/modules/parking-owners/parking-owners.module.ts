import { Module } from '@nestjs/common';
import { ParkingOwnersService } from './parking-owners.service';
import { ParkingOwnersController } from './parking-owners.controller';
import { ParkingOwner } from './entities/parking-owner.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from 'src/modules/users/entities/user.entity';

@Module({
  controllers: [ParkingOwnersController],
  providers: [ParkingOwnersService],
  exports: [ParkingOwnersService],
  imports: [
      TypeOrmModule.forFeature([ParkingOwner,User])
    ],
})
export class ParkingOwnersModule {}
