import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FishGrowth } from './entities/fish-growth.entity';
import { FishController } from './fish.controller';
import { FishService } from './fish.service';
import { FishGrowthRepository } from './fish-growth.repository';
import { FishAnalyticsService } from './services/fish-analytics.service';
import { FishCacheService } from './services/fish-cache.service';
import { FishBackgroundService } from './services/fish-background.service';
import { FishExportService } from './services/fish-export.service';
import { DevicesModule } from '../devices/devices.module';
import { AuthModule } from 'src/core/auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([FishGrowth]), AuthModule, DevicesModule],
  controllers: [FishController],
  providers: [
    FishService,
    FishGrowthRepository,
    FishAnalyticsService,
    FishCacheService,
    FishBackgroundService,
    FishExportService
  ],
  exports: [FishService, FishAnalyticsService, FishCacheService, FishBackgroundService, FishExportService],
})
export class FishModule {
  constructor(
    private readonly cacheService: FishCacheService,
    private readonly backgroundService: FishBackgroundService
  ) {
    // Start cache cleanup interval
    this.cacheService.startCleanupInterval();
  }
}
