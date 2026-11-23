import { Module } from '@nestjs/common';
import { WebsocketModule } from '../websocket/websocket.module';
import { TrackingNotifierService } from './tracking-notifier.service';

@Module({
  imports: [WebsocketModule],
  providers: [TrackingNotifierService],
  exports: [TrackingNotifierService],
})
export class TrackingNotifierModule {}
