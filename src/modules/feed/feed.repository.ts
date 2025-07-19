import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, FindManyOptions, FindOneOptions } from 'typeorm';
import { FeedData } from './entities/feed-data.entity';
import { CreateFeedDto } from './dto/create-feed.dto';

@Injectable()
export class FeedRepository {
  constructor(
    @InjectRepository(FeedData)
    private readonly feedDataRepository: Repository<FeedData>,
  ) {}

  create(createFeedDto: CreateFeedDto): FeedData {
    return this.feedDataRepository.create(createFeedDto);
  }

  save(feedData: FeedData): Promise<FeedData> {
    return this.feedDataRepository.save(feedData);
  }

  findAll(options: FindManyOptions<FeedData>): Promise<FeedData[]> {
    return this.feedDataRepository.find(options);
  }

  findOne(options: FindOneOptions<FeedData>): Promise<FeedData | null> {
    return this.feedDataRepository.findOne(options);
  }

  async update(id: string, updateData: Partial<FeedData>): Promise<FeedData> {
    await this.feedDataRepository.update(id, updateData);
    const updated = await this.findOne({ where: { id } });
    if (!updated) {
      throw new Error('Update failed, record not found');
    }
    return updated;
  }

  async remove(id: string): Promise<void> {
    await this.feedDataRepository.delete(id);
  }

  async findByDeviceId(
    deviceId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<FeedData[]> {
    const where: any = { device_id: deviceId };
    if (startDate && endDate) {
      where.created_at = Between(startDate, endDate);
    }
    return this.findAll({ where, order: { created_at: 'ASC' } });
  }

  async updateSchedule(
    id: string,
    schedule: Record<string, any>,
  ): Promise<FeedData> {
    await this.feedDataRepository.update(id, { feeding_schedule: schedule });
    const updated = await this.findOne({ where: { id } });
    if (!updated) {
      throw new Error('Update failed, record not found');
    }
    return updated;
  }
}
