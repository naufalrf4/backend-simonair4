import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CacheModule } from '@nestjs/cache-manager';
import { ManualMeasurement } from './entities/manual-measurement.entity';
import { ManualMeasurementsService } from './services/manual-measurements.service';
import { MeasurementComparisonService } from './services/measurement-comparison.service';
import { ComparisonCacheService } from './services/comparison-cache.service';
import { ManualMeasurementsController } from './manual-measurements.controller';
import { ManualMeasurementsRepository } from './repositories/manual-measurements.repository';
import { DevicesModule } from '../devices/devices.module';
import { SensorsModule } from '../sensors/sensors.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ManualMeasurement]),
    CacheModule.register(),
    DevicesModule,
    SensorsModule,
  ],
  providers: [
    ManualMeasurementsService,
    MeasurementComparisonService,
    ComparisonCacheService,
    ManualMeasurementsRepository,
  ],
  controllers: [ManualMeasurementsController],
  exports: [
    ManualMeasurementsService,
    MeasurementComparisonService,
    ManualMeasurementsRepository,
  ],
})
export class ManualMeasurementsModule {}
