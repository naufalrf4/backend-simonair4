import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThresholdsController } from './thresholds.controller';
import { ThresholdsService } from './thresholds.service';
import { ThresholdsRepository } from './thresholds.repository';
import { Threshold } from './entities/threshold.entity';
import { DevicesModule } from '../devices/devices.module';
import { MqttModule } from '../mqtt/mqtt.module';
import { SensorsModule } from '../sensors/sensors.module';
import { AckModule } from '../ack/ack.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Threshold]),
    DevicesModule,
    forwardRef(() => AckModule),
    forwardRef(() => SensorsModule),
  ],
  controllers: [ThresholdsController],
  providers: [ThresholdsService, ThresholdsRepository],
  exports: [ThresholdsService],
})
export class ThresholdsModule {}