import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { FeedRepository } from './feed.repository';
import { DevicesService } from '../devices/devices.service';
import { FishService } from '../fish/fish.service';
import { FeedData } from './entities/feed-data.entity';
import { CreateFeedDto } from './dto/create-feed.dto';
import { UpdateFeedDto } from './dto/update-feed.dto';
import { User } from '../users/entities/user.entity';
import { UserRole } from '../users/entities/user.entity';
import { FeedAnalyticsService } from './services/feed-analytics.service';
import { FeedAnalyticsResponseDto } from './dto/feed-analytics-response.dto';

@Injectable()
export class FeedService {
  constructor(
    private readonly feedRepository: FeedRepository,
    private readonly devicesService: DevicesService,
    private readonly fishService: FishService,
    private readonly feedAnalyticsService: FeedAnalyticsService,
  ) {}

  async create(user: User, createFeedDto: CreateFeedDto): Promise<FeedData> {
    await this.validateDeviceAccess(user, createFeedDto.device_id);
    if (!['natural', 'artificial'].includes(createFeedDto.feed_type)) {
      throw new BadRequestException(
        'Invalid feed type. Must be "natural" or "artificial".',
      );
    }
    const feedData = this.feedRepository.create(createFeedDto);
    return this.feedRepository.save(feedData);
  }

  async findAll(
    user: User,
    deviceId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<FeedData[]> {
    await this.validateDeviceAccess(user, deviceId);
    return this.feedRepository.findByDeviceId(deviceId, startDate, endDate);
  }

  async findOne(user: User, id: string): Promise<FeedData> {
    const feedData = await this.feedRepository.findOne({ where: { id } });
    if (!feedData) {
      throw new NotFoundException(`FeedData with ID "${id}" not found`);
    }
    await this.validateDeviceAccess(user, feedData.device_id);
    return feedData;
  }

  async update(
    user: User,
    id: string,
    updateFeedDto: UpdateFeedDto,
  ): Promise<FeedData> {
    const feedData = await this.findOne(user, id);
    Object.assign(feedData, updateFeedDto);
    return this.feedRepository.save(feedData);
  }

  async remove(user: User, id: string): Promise<void> {
    const feedData = await this.findOne(user, id);
    await this.feedRepository.remove(feedData.id);
  }

  async updateSchedule(
    user: User,
    id: string,
    schedule: Record<string, any>,
  ): Promise<FeedData> {
    const feedData = await this.findOne(user, id);
    // Add schedule validation logic here if needed
    return this.feedRepository.updateSchedule(id, schedule);
  }

  async getAnalytics(
    user: User,
    deviceId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<FeedAnalyticsResponseDto> {
    await this.validateDeviceAccess(user, deviceId);
    return this.feedAnalyticsService.calculateFeedAnalytics(user, deviceId, startDate, endDate);
  }

  private async validateDeviceAccess(
    user: User,
    deviceId: string,
  ): Promise<void> {
    if (user.role === UserRole.ADMIN || user.role === UserRole.SUPERUSER) {
      return;
    }
    const device = await this.devicesService.findOne(deviceId, user);
    if (device.user.id !== user.id) {
      throw new ForbiddenException('You do not have access to this device.');
    }
  }
}
