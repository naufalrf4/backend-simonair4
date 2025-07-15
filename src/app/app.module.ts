
import { CacheModule } from '@nestjs/cache-manager';
import { Module } from '@nestjs/common';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CoreModule } from '@/core/core.module';
import { AuthModule } from '@/core/auth/auth.module';
import { UsersModule } from '@/modules/users/users.module';
import { DevicesModule } from '@/modules/devices/devices.module';
import { EventsModule } from '@/modules/events/events.module';
import { MqttModule } from '@/modules/mqtt/mqtt.module';
import { SensorsModule } from '@/modules/sensors/sensors.module';
import { AlertsModule } from '@/modules/alerts/alerts.module';
import { FeedModule } from '@/modules/feed/feed.module';
import { CalibrationsModule } from '@/modules/calibrations/calibrations.module';
import { FishModule } from '@/modules/fish/fish.module';
import { ThresholdsModule } from '@/modules/thresholds/thresholds.module';
import { AckModule } from '@/modules/ack/ack.module';

@Module({
  imports: [
    CacheModule.register({
      isGlobal: true,
      ttl: 60000,
    }),
    ThrottlerModule.forRoot([{
      ttl: 60,
      limit: 10,
    }]),
    CoreModule,
    AuthModule,
    UsersModule,
    DevicesModule,
    EventsModule,
    MqttModule,
    SensorsModule,
    FishModule,
    CalibrationsModule,
    FeedModule,
    AlertsModule,
    ThresholdsModule,
    AckModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}