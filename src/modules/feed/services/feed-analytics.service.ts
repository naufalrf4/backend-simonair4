import { Injectable } from '@nestjs/common';
import { FeedRepository } from '../feed.repository';
import { FishService } from '../../fish/fish.service';
import { FeedData } from '../entities/feed-data.entity';
import { FishGrowth } from '../../fish/entities/fish-growth.entity';
import { InsufficientFeedDataException } from '../exceptions/feed.exceptions';
import { FeedAnalyticsResponseDto } from '../dto/feed-analytics-response.dto';
import { User } from 'src/modules/users/entities/user.entity';

@Injectable()
export class FeedAnalyticsService {
  constructor(
    private readonly feedRepository: FeedRepository,
    private readonly fishService: FishService,
  ) {}

  async calculateFeedAnalytics(
    user: User,
    deviceId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<FeedAnalyticsResponseDto> {
    const feedHistory = await this.feedRepository.findByDeviceId(
      deviceId,
      startDate,
      endDate,
    );
    const growthHistory = await this.fishService.findAll(
      user,
      deviceId,
      startDate,
      endDate,
    );

    if (feedHistory.length === 0 || growthHistory.length < 2) {
      throw new InsufficientFeedDataException();
    }

    const fcr = this.calculateFCR(feedHistory, growthHistory);
    const consumption = this.calculateTotalConsumption(feedHistory);

    return {
      feedConversionRatio: parseFloat(fcr.toFixed(2)),
      totalFeedConsumedKg: parseFloat(consumption.totalAmount.toFixed(2)),
      consumptionByType: {
        natural: parseFloat(consumption.byType.natural.toFixed(2)),
        artificial: parseFloat(consumption.byType.artificial.toFixed(2)),
      },
      correlation: 'Positive', // Simplified for now
      summary: `Feed efficiency is moderate with a Feed Conversion Ratio of ${fcr.toFixed(
        2,
      )}.`,
    };
  }

  private calculateFCR(
    feedHistory: FeedData[],
    growthHistory: FishGrowth[],
  ): number {
    const totalFeed = feedHistory.reduce(
      (sum, record) => sum + record.feed_amount_kg,
      0,
    );
    const initialWeight = growthHistory[0]?.weight_gram ?? 0;
    const finalWeight = growthHistory[growthHistory.length - 1]?.weight_gram ?? 0;
    const weightGain = (finalWeight - initialWeight) / 1000; // Convert to kg

    if (weightGain <= 0) {
      return 0; // Avoid division by zero or negative FCR
    }

    return totalFeed / weightGain;
  }

  private calculateTotalConsumption(feedHistory: FeedData[]): {
    totalAmount: number;
    byType: { natural: number; artificial: number };
  } {
    let totalAmount = 0;
    const byType = { natural: 0, artificial: 0 };

    for (const record of feedHistory) {
      totalAmount += record.feed_amount_kg;
      if (record.feed_type === 'natural') {
        byType.natural += record.feed_amount_kg;
      } else if (record.feed_type === 'artificial') {
        byType.artificial += record.feed_amount_kg;
      }
    }

    return { totalAmount, byType };
  }
}