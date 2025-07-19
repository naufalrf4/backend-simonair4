import { Module, forwardRef } from '@nestjs/common';
import { MqttService } from './mqtt.service';
import { EventsModule } from '../events/events.module';
import { SensorsModule } from '../sensors/sensors.module';
import { DevicesModule } from '../devices/devices.module';
import { CacheModule } from '@nestjs/cache-manager';

@Module({
  imports: [
    CacheModule.register(),
    forwardRef(() => EventsModule),
    forwardRef(() => SensorsModule),
    forwardRef(() => DevicesModule),
  ],
  providers: [MqttService],
  exports: [MqttService],
})
export class MqttModule {}
