import { Test, TestingModule } from '@nestjs/testing';
import { FeedAnalyticsService } from './feed-analytics.service';
import { FeedRepository } from '../feed.repository';
import { FishService } from '../../fish/fish.service';
import { User, UserRole } from '../../users/entities/user.entity';
import { FeedData } from '../entities/feed-data.entity';
import { FishGrowth } from '../../fish/entities/fish-growth.entity';
import { InsufficientFeedDataException } from '../exceptions/feed.exceptions';

describe('FeedAnalyticsService', () => {
  let service: FeedAnalyticsService;
  let mockFeedRepository: jest.Mocked<FeedRepository>;
  let mockFishService: jest.Mocked<FishService>;

  const mockUser: User = {
    id: 'user-123',
    email: 'test@example.com',
    full_name: 'Test User',
    role: UserRole.USER,
  } as User;

  const mockFeedData: FeedData[] = [
    {
      id: 'feed-1',
      device_id: 'device-123',
      feed_name: 'Natural Feed',
      feed_type: 'natural',
      feed_amount_kg: 2.5,
      feeding_schedule: { time: '10:00', days: ['Mon', 'Wed', 'Fri'] },
      created_at: new Date('2024-01-10T10:00:00Z'),
    } as unknown as FeedData,
    {
      id: 'feed-2',
      device_id: 'device-123',
      feed_name: 'Artificial Feed',
      feed_type: 'artificial',
      feed_amount_kg: 1.5,
      feeding_schedule: { time: '14:00', days: ['Tue', 'Thu'] },
      created_at: new Date('2024-01-11T10:00:00Z'),
    } as unknown as FeedData,
  ];

  const mockFishGrowthData: FishGrowth[] = [
    {
      id: 'growth-1',
      device_id: 'device-123',
      weight_gram: 500,
      length_cm: 10,
      measurement_date: new Date('2024-01-09'),
      biomass_kg: 0.5,
      condition_indicator: 'good',
      notes: 'Initial measurement',
      created_at: new Date('2024-01-09T10:00:00Z'),
    } as unknown as FishGrowth,
    {
      id: 'growth-2',
      device_id: 'device-123',
      weight_gram: 1000,
      length_cm: 15,
      measurement_date: new Date('2024-01-12'),
      biomass_kg: 1.0,
      condition_indicator: 'excellent',
      notes: 'Final measurement',
      created_at: new Date('2024-01-12T10:00:00Z'),
    } as unknown as FishGrowth,
  ];

  beforeEach(async () => {
    const mockFeedRepositoryValue = {
      findByDeviceId: jest.fn(),
    };

    const mockFishServiceValue = {
      findAll: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FeedAnalyticsService,
        {
          provide: FeedRepository,
          useValue: mockFeedRepositoryValue,
        },
        {
          provide: FishService,
          useValue: mockFishServiceValue,
        },
      ],
    }).compile();

    service = module.get<FeedAnalyticsService>(FeedAnalyticsService);
    mockFeedRepository = module.get(FeedRepository);
    mockFishService = module.get(FishService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('calculateFeedAnalytics', () => {
    it('should calculate feed analytics correctly', async () => {
      mockFeedRepository.findByDeviceId.mockResolvedValue(mockFeedData);
      mockFishService.findAll.mockResolvedValue(mockFishGrowthData);

      const result = await service.calculateFeedAnalytics(mockUser, 'device-123');

      expect(result).toBeDefined();
      expect(result.feedConversionRatio).toBeDefined();
      expect(result.totalFeedConsumedKg).toBe(4);
      expect(result.consumptionByType.natural).toBe(2.5);
      expect(result.consumptionByType.artificial).toBe(1.5);
      expect(result.correlation).toBe('Positive');
      expect(result.summary).toContain('Feed Conversion Ratio of');
    });

    it('should throw InsufficientFeedDataException when no feed data is available', async () => {
      mockFeedRepository.findByDeviceId.mockResolvedValue([]);
      mockFishService.findAll.mockResolvedValue(mockFishGrowthData);

      await expect(
        service.calculateFeedAnalytics(mockUser, 'device-123')
      ).rejects.toThrow(InsufficientFeedDataException);
    });

    it('should throw InsufficientFeedDataException when insufficient growth data is available', async () => {
      mockFeedRepository.findByDeviceId.mockResolvedValue(mockFeedData);
      mockFishService.findAll.mockResolvedValue([mockFishGrowthData[0]]);

      await expect(
        service.calculateFeedAnalytics(mockUser, 'device-123')
      ).rejects.toThrow(InsufficientFeedDataException);
    });

    it('should handle date range filtering', async () => {
      mockFeedRepository.findByDeviceId.mockResolvedValue(mockFeedData);
      mockFishService.findAll.mockResolvedValue(mockFishGrowthData);

      const startDate = new Date('2024-01-10T00:00:00Z');
      const endDate = new Date('2024-01-12T23:59:59Z');

      await service.calculateFeedAnalytics(mockUser, 'device-123', startDate, endDate);

      expect(mockFeedRepository.findByDeviceId).toHaveBeenCalledWith(
        'device-123',
        startDate,
        endDate
      );
      expect(mockFishService.findAll).toHaveBeenCalledWith(
        mockUser,
        'device-123',
        startDate,
        endDate
      );
    });
  });

  describe('calculateFCR', () => {
    it('should calculate FCR correctly', () => {
      const fcr = (service as any).calculateFCR(mockFeedData, mockFishGrowthData);
      
      // Total feed: 4kg, Weight gain: 0.5kg, Expected FCR: 8
      expect(fcr).toBe(8);
    });

    it('should return 0 when weight gain is zero or negative', () => {
      const reversedGrowthData = [
        mockFishGrowthData[1],
        mockFishGrowthData[0],
      ];

      const fcr = (service as any).calculateFCR(mockFeedData, reversedGrowthData);
      
      expect(fcr).toBe(0);
    });
  });

  describe('calculateTotalConsumption', () => {
    it('should calculate total consumption correctly', () => {
      const consumption = (service as any).calculateTotalConsumption(mockFeedData);
      
      expect(consumption.totalAmount).toBe(4);
      expect(consumption.byType.natural).toBe(2.5);
      expect(consumption.byType.artificial).toBe(1.5);
    });

    it('should handle empty feed data', () => {
      const consumption = (service as any).calculateTotalConsumption([]);
      
      expect(consumption.totalAmount).toBe(0);
      expect(consumption.byType.natural).toBe(0);
      expect(consumption.byType.artificial).toBe(0);
    });

    it('should handle unknown feed types', () => {
      const customFeedData = [
        {
          ...mockFeedData[0],
          feed_type: 'unknown',
        },
      ];

      const consumption = (service as any).calculateTotalConsumption(customFeedData);
      
      expect(consumption.totalAmount).toBe(2.5);
      expect(consumption.byType.natural).toBe(0);
      expect(consumption.byType.artificial).toBe(0);
    });
  });
});