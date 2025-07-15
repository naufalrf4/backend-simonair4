import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CalibrationsController } from './calibrations.controller';
import { CalibrationsService } from './calibrations.service';
import { Calibration } from './entities/calibration.entity';
import { CalibrationRepository } from './calibration.repository';
import { MqttModule } from '../mqtt/mqtt.module';
import { DevicesModule } from '../devices/devices.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Calibration]),
    forwardRef(() => MqttModule),
    DevicesModule,
  ],
  controllers: [CalibrationsController],
  providers: [CalibrationsService, CalibrationRepository],
  exports: [CalibrationsService, CalibrationRepository],
})

export class CalibrationsModule {}