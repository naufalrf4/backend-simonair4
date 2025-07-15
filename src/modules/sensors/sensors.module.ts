import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SensorData } from './entities/sensor-data.entity';
import { SensorsController } from './sensors.controller';
import { SensorsService } from './sensors.service';
import { SensorDataRepository } from './sensor-data.repository';
import { DevicesModule } from '../devices/devices.module';
import { CalibrationsModule } from '../calibrations/calibrations.module';
import { AlertsModule } from '../alerts/alerts.module';
import { ThresholdsModule } from '../thresholds/thresholds.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([SensorData]),
    DevicesModule,
    forwardRef(() => CalibrationsModule),
    AlertsModule,
    forwardRef(() => ThresholdsModule),
  ],
  controllers: [SensorsController],
  providers: [SensorsService, SensorDataRepository],
  exports: [SensorsService],
})

export class SensorsModule {}