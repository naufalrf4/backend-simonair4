import { Module, forwardRef } from '@nestjs/common';
import { AlertsService } from './alerts.service';
import { EventsModule } from '../events/events.module';

@Module({
  imports: [forwardRef(() => EventsModule)],
  providers: [AlertsService],
  exports: [AlertsService],
})
export class AlertsModule {}
