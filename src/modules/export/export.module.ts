import { Module } from '@nestjs/common';
import { ExportService } from './export.service';
import { ExportController } from './export.controller';
import { SensorsModule } from '../sensors/sensors.module';
import { FishModule } from '../fish/fish.module';
import { FeedModule } from '../feed/feed.module';
import { DevicesModule } from '../devices/devices.module';

@Module({
  imports: [SensorsModule, FishModule, FeedModule, DevicesModule],
  providers: [ExportService],
  controllers: [ExportController],
})
export class ExportModule {}
