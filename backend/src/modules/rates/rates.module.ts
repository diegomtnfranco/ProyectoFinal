import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RatesService } from './rates.service';
import { RatesController } from './rates.controller';
import { Rate } from './entities/rate.entity';
import { ParkingLot } from '../parking-lots/entities/parking-lot.entity';
import { RateHistoryModule } from '../rate-history/rate-history.module';

@Module({
  imports: [TypeOrmModule.forFeature([Rate, ParkingLot]), RateHistoryModule],  // ← Ya no incluye VehicleType
  controllers: [RatesController],
  providers: [RatesService],
  exports: [RatesService],
})
export class RatesModule {}