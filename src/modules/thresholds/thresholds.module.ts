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
    // Import DevicesModule for device validation and ownership checks
    forwardRef(() => DevicesModule),
    // Import MqttModule for MQTT publishing functionality (forwardRef to avoid circular dependency)
    forwardRef(() => MqttModule),
    // Import AckModule for ACK handling (forwardRef to avoid circular dependency)
    forwardRef(() => AckModule),
    // Import SensorsModule for sensor data processing (forwardRef to avoid circular dependency)
    forwardRef(() => SensorsModule),
  ],
  controllers: [ThresholdsController],
  providers: [ThresholdsService, ThresholdsRepository],
  // Export service and repository for cross-module usage
  exports: [ThresholdsService, ThresholdsRepository],
})
export class ThresholdsModule {}
