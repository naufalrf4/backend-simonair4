import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FeedData } from './entities/feed-data.entity';
import { FeedController } from './feed.controller';
import { FeedService } from './feed.service';
import { FeedRepository } from './feed.repository';
import { DevicesModule } from '../devices/devices.module';
import { FishModule } from '../fish/fish.module';

@Module({
  imports: [TypeOrmModule.forFeature([FeedData]), DevicesModule, FishModule],
  controllers: [FeedController],
  providers: [FeedService, FeedRepository],
})
export class FeedModule {}
