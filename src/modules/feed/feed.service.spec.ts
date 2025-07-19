import { Test, TestingModule } from '@nestjs/testing';
import { FeedService } from './feed.service';
import { FeedRepository } from './feed.repository';
import { DevicesService } from '../devices/devices.service';
import { FishService } from '../fish/fish.service';
import { FeedAnalyticsService } from './services/feed-analytics.service';
import { User, UserRole } from '../users/entities/user.entity';
import { FeedAnalyticsResponseDto } from './dto/feed-analytics-response.dto';
import { NotFoundException, ForbiddenException } from '@nestjs/common';

describe('FeedService', () => {
  let service: FeedService;
  let mockFeedRepository: jest.Mocked<FeedRepository>;
  let mockDevicesService: jest.Mocked<DevicesService>;
  let mockFishService: jest.Mocked<FishService>;
  let mockFeedAnalyticsService: jest.Mocked<FeedAnalyticsService>;

  const mockUser: User = {
    id: 'user-123',
    email: 'test@example.com',
    full_name: 'Test User',
    role: UserRole.USER,
  } as User;

  const mockAdminUser: User = {
    id: 'admin-123',
    email: 'admin@example.com',
    full_name: 'Admin User',
    role: UserRole.ADMIN,
  } as User;

  const mockDevice = {
    id: 'device-123',
    device_id: 'SMNR-1234',
    user_id: 'user-123',
    user: { id: 'user-123' },
  };

  const mockAnalyticsResponse: FeedAnalyticsResponseDto = {
    feedConversionRatio: 2.5,
    totalFeedConsumedKg: 10,
    consumptionByType: {
      natural: 6,
      artificial: 4,
    },
    correlation: 'Positive',
    summary: 'Feed efficiency is moderate with a Feed Conversion Ratio of 2.5.',
  };

  beforeEach(async () => {
    const mockFeedRepositoryValue = {
      create: jest.fn(),
      save: jest.fn(),
      findByDeviceId: jest.fn(),
      findOne: jest.fn(),
      remove: jest.fn(),
      updateSchedule: jest.fn(),
    };

    const mockDevicesServiceValue = {
      findOne: jest.fn(),
    };

    const mockFishServiceValue = {
      findAll: jest.fn(),
    };

    const mockFeedAnalyticsServiceValue = {
      calculateFeedAnalytics: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FeedService,
        {
          provide: FeedRepository,
          useValue: mockFeedRepositoryValue,
        },
        {
          provide: DevicesService,
          useValue: mockDevicesServiceValue,
        },
        {
          provide: FishService,
          useValue: mockFishServiceValue,
        },
        {
          provide: FeedAnalyticsService,
          useValue: mockFeedAnalyticsServiceValue,
        },
      ],
    }).compile();

    service = module.get<FeedService>(FeedService);
    mockFeedRepository = module.get(FeedRepository);
    mockDevicesService = module.get(DevicesService);
    mockFishService = module.get(FishService);
    mockFeedAnalyticsService = module.get(FeedAnalyticsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getAnalytics', () => {
    it('should return analytics for a device', async () => {
      mockDevicesService.findOne.mockResolvedValue(mockDevice as any);
      mockFeedAnalyticsService.calculateFeedAnalytics.mockResolvedValue(mockAnalyticsResponse);

      const result = await service.getAnalytics(mockUser, 'SMNR-1234');

      expect(result).toEqual(mockAnalyticsResponse);
      expect(mockDevicesService.findOne).toHaveBeenCalledWith('SMNR-1234', mockUser);
      expect(mockFeedAnalyticsService.calculateFeedAnalytics).toHaveBeenCalledWith(
        mockUser,
        'SMNR-1234',
        undefined,
        undefined
      );
    });

    it('should pass date range parameters to analytics service', async () => {
      mockDevicesService.findOne.mockResolvedValue(mockDevice as any);
      mockFeedAnalyticsService.calculateFeedAnalytics.mockResolvedValue(mockAnalyticsResponse);

      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      const result = await service.getAnalytics(mockUser, 'SMNR-1234', startDate, endDate);

      expect(result).toEqual(mockAnalyticsResponse);
      expect(mockFeedAnalyticsService.calculateFeedAnalytics).toHaveBeenCalledWith(
        mockUser,
        'SMNR-1234',
        startDate,
        endDate
      );
    });

    it('should allow admin users to access any device', async () => {
      mockDevicesService.findOne.mockResolvedValue({
        ...mockDevice,
        user_id: 'other-user',
        user: { id: 'other-user' },
      } as any);
      mockFeedAnalyticsService.calculateFeedAnalytics.mockResolvedValue(mockAnalyticsResponse);

      const result = await service.getAnalytics(mockAdminUser, 'SMNR-1234');

      expect(result).toEqual(mockAnalyticsResponse);
    });

    it('should throw ForbiddenException for unauthorized device access', async () => {
      mockDevicesService.findOne.mockResolvedValue({
        ...mockDevice,
        user_id: 'other-user',
        user: { id: 'other-user' },
      } as any);

      await expect(service.getAnalytics(mockUser, 'SMNR-1234')).rejects.toThrow(
        ForbiddenException
      );
    });

    it('should throw NotFoundException for non-existent device', async () => {
      mockDevicesService.findOne.mockRejectedValue(new NotFoundException());

      await expect(service.getAnalytics(mockUser, 'SMNR-9999')).rejects.toThrow(
        NotFoundException
      );
    });
  });
});