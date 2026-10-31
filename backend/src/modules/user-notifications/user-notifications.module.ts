import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TrackingNotifierModule } from '../tracking-notifier/tracking-notifier.module';
import { UserNotification } from './entities/user-notification.entity';
import { OccupancyAlertSubscription } from './entities/occupancy-alert-subscription.entity';
import { ParkingAvailabilityState } from './entities/parking-availability-state.entity';
import { UserNotificationsService } from './user-notifications.service';
import { OccupancyAlertsService } from './occupancy-alerts.service';
import { ClosingNotificationsService } from './closing-notifications.service';
import { UserNotificationsController } from './user-notifications.controller';
import { OccupancyAlertsController } from './occupancy-alerts.controller';
import { ReservationNotificationsSubscriber } from './subscribers/reservation-notifications.subscriber';
import { SpaceAvailabilitySubscriber } from './subscribers/space-availability.subscriber';
import { RateReductionSubscriber } from './subscribers/rate-reduction.subscriber';

/**
 * Centro de notificaciones persistentes (no confundir con NotificationsModule,
 * que envía emails de autenticación y no se modifica).
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      UserNotification,
      OccupancyAlertSubscription,
      ParkingAvailabilityState,
    ]),
    TrackingNotifierModule,
  ],
  controllers: [UserNotificationsController, OccupancyAlertsController],
  providers: [
    UserNotificationsService,
    OccupancyAlertsService,
    ClosingNotificationsService,
    ReservationNotificationsSubscriber,
    SpaceAvailabilitySubscriber,
    RateReductionSubscriber,
  ],
  exports: [UserNotificationsService],
})
export class UserNotificationsModule {}
