// src/modules/rate-history/rate-history.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RateChangeLog } from './entities/rate-change-log.entity';
import { OccupancyRateSnapshot } from './entities/occupancy-rate-snapshot.entity';
import { User } from '../users/entities/user.entity';
import { ParkingOwner } from '../parking-owners/entities/parking-owner.entity';
import { ParkingEmployee } from '../parking-employees/entities/parking-employee.entity';
import { RateHistoryService } from './rate-history.service';

/**
 * Historial de tarifas. No importa RatesModule ni OccupancyModule para
 * evitar dependencias circulares: son ellos los que importan este módulo.
 */
@Module({
  imports: [TypeOrmModule.forFeature([RateChangeLog, OccupancyRateSnapshot, User, ParkingOwner, ParkingEmployee])],
  providers: [RateHistoryService],
  exports: [RateHistoryService],
})
export class RateHistoryModule {}
