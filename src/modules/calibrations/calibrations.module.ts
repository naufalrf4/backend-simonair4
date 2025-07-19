import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CalibrationsController } from './calibrations.controller';
import { DeviceCalibrationsController } from './device-calibrations.controller';
import { CalibrationsService } from './calibrations.service';
import { Calibration } from './entities/calibration.entity';
import { CalibrationRepository } from './calibration.repository';
import { MqttModule } from '../mqtt/mqtt.module';
import { DevicesModule } from '../devices/devices.module';
import { SensorsModule } from '../sensors/sensors.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Calibration]),
    forwardRef(() => MqttModule),
    forwardRef(() => DevicesModule),
    forwardRef(() => SensorsModule),
  ],
  controllers: [CalibrationsController, DeviceCalibrationsController],
  providers: [CalibrationsService, CalibrationRepository],
  exports: [CalibrationsService, CalibrationRepository],
})
export class CalibrationsModule {}
