import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClientProfile } from '../client-profiles/entities/client-profile.entity';
import { ClientVehicle } from '../client-vehicles/entities/client-vehicle.entity';
import { ClientVehiclesModule } from '../client-vehicles/client-vehicles.module';
import { OccupancyServicesModule } from '../occupancy-services/occupancy-services.module';
import { RatesModule } from '../rates/rates.module';
import { RateHistoryModule } from '../rate-history/rate-history.module';
import { TrackingNotifierModule } from '../tracking-notifier/tracking-notifier.module';
import { OccupancyClientLink } from './entities/occupancy-client-link.entity';
import { ClientTrackingEvent } from './entities/client-tracking-event.entity';
import { ClientTrackingService } from './client-tracking.service';
import { ClientTrackingController } from './client-tracking.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      OccupancyClientLink,
      ClientTrackingEvent,
      ClientProfile,
      ClientVehicle,
    ]),
    ClientVehiclesModule,
    OccupancyServicesModule,
    RatesModule,
    RateHistoryModule,
    TrackingNotifierModule,
  ],
  controllers: [ClientTrackingController],
  providers: [ClientTrackingService],
  exports: [ClientTrackingService],
})
export class ClientTrackingModule {}
