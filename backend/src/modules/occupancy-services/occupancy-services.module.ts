import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Occupancy } from '../occupancy/entities/occupancy.entity';
import { ParkingLotsModule } from '../parking-lots/parking-lots.module';
import { ParkingProfilesModule } from '../parking-profiles/parking-profiles.module';
import { OccupancyServiceSelection } from './entities/occupancy-service-selection.entity';
import { OccupancyNightPolicySnapshot } from './entities/occupancy-night-policy-snapshot.entity';
import { OccupancyServicesService } from './occupancy-services.service';
import { OccupancyServicesController } from './occupancy-services.controller';
import { TrackingNotifierModule } from '../tracking-notifier/tracking-notifier.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      OccupancyServiceSelection,
      OccupancyNightPolicySnapshot,
      Occupancy,
    ]),
    ParkingLotsModule,
    ParkingProfilesModule,
    TrackingNotifierModule,
  ],
  controllers: [OccupancyServicesController],
  providers: [OccupancyServicesService],
  exports: [OccupancyServicesService],
})
export class OccupancyServicesModule {}
