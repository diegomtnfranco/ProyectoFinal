import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OccupancyController } from './occupancy.controller';
import { OccupancyService } from './occupancy.service';
import { Occupancy } from './entities/occupancy.entity';
import { Space } from '../spaces/entities/space.entity';
import { Reservation } from '../reservations/entities/reservation.entity';
import { RatesModule } from '../rates/rates.module';
import { WebsocketModule } from '../websocket/websocket.module';
import {ParkingLotsModule} from '../parking-lots/parking-lots.module';
import { RateHistoryModule } from '../rate-history/rate-history.module';
import { OccupancyServicesModule } from '../occupancy-services/occupancy-services.module';
import { ClientTrackingModule } from '../client-tracking/client-tracking.module';
import { PaymentsModule } from '../payments/payments.module';
import { UserNotificationsModule } from '../user-notifications/user-notifications.module';
import { TrackingNotifierModule } from '../tracking-notifier/tracking-notifier.module';
import { CheckoutRequest } from './checkout/entities/checkout-request.entity';
import { CheckoutService } from './checkout/checkout.service';
import { CheckoutController } from './checkout/checkout.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Occupancy, Space, Reservation, CheckoutRequest]),
    RatesModule,
    WebsocketModule,
    ParkingLotsModule,
    RateHistoryModule,
    OccupancyServicesModule,
    ClientTrackingModule,
    // Egreso con pago (checkout QR + egreso del personal)
    PaymentsModule,
    UserNotificationsModule,
    TrackingNotifierModule,
  ],
  controllers: [OccupancyController, CheckoutController],
  providers: [OccupancyService, CheckoutService],
  exports: [OccupancyService],
})
export class OccupancyModule {}
