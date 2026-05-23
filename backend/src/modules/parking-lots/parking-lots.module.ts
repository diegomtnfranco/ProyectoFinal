import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ParkingLotsService } from './parking-lots.service';
import { ParkingLotsController } from './parking-lots.controller';
import { ParkingLot } from './entities/parking-lot.entity';
import { ParkingOwner } from '../parking-owners/entities/parking-owner.entity';
import { Rate } from '../rates/entities/rate.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ParkingLot, ParkingOwner, Rate])],
  controllers: [ParkingLotsController],
  providers: [ParkingLotsService],
  exports: [ParkingLotsService],
})
export class ParkingLotsModule {}
