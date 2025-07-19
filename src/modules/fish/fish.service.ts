import {
  Injectable,
  Logger,
  Inject,
  forwardRef,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { FishGrowthRepository } from './fish-growth.repository';
import { DevicesService } from '../devices/devices.service';
import { FishAnalyticsService } from './services/fish-analytics.service';
import { FishCacheService } from './services/fish-cache.service';
import { CreateFishGrowthDto, UpdateFishGrowthDto, BulkFishGrowthDto, FishGrowthQueryDto } from './dto';
import { FishGrowth } from './entities/fish-growth.entity';
import { User } from '../users/entities/user.entity';
import { UserRole } from '../users/entities/user.entity';
import { Between } from 'typeorm';
import {
  DeviceAccessDeniedException,
  DeviceNotFoundException,
  DuplicateMeasurementException,
  InvalidMeasurementDateException,
  InvalidMeasurementValueException,
  BiologicallyImplausibleMeasurementException,
  BulkOperationException,
  AnalyticsCalculationException,
} from './exceptions/fish-growth.exceptions';
import { validate } from 'class-validator';
import { plainToClass } from 'class-transformer';

@Injectable()
export class FishService {
  private readonly logger = new Logger(FishService.name);

  constructor(
    private readonly fishGrowthRepository: FishGrowthRepository,
    private readonly devicesService: DevicesService,
    @Inject(forwardRef(() => FishAnalyticsService))
    private readonly analyticsService: FishAnalyticsService,
    private readonly cacheService: FishCacheService,
  ) {}

  async create(
    user: User,
    deviceId: string,
    createFishGrowthDto: CreateFishGrowthDto,
  ): Promise<FishGrowth> {
    await this.validateDeviceAccess(user, deviceId);
    await this.validateMeasurementDate(createFishGrowthDto.measurement_date);
    await this.validateMeasurementValues(createFishGrowthDto);
    await this.handleDuplicateMeasurements(deviceId, createFishGrowthDto.measurement_date);

    const { length_cm, weight_gram } = createFishGrowthDto;
    const newGrowthRecord = this.fishGrowthRepository.create(createFishGrowthDto);
    newGrowthRecord.device_id = deviceId;
    newGrowthRecord.biomass_kg = this.calculateBiomass(length_cm, weight_gram);
    newGrowthRecord.condition_indicator = this.calculateConditionIndicator(length_cm, weight_gram);

    try {
      return await this.fishGrowthRepository.save(newGrowthRecord);
    } catch (error) {
      this.logger.error('Error saving fish growth record', error.stack);
      throw error;
    }
  }

  async findAll(
    user: User,
    deviceId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<FishGrowth[]> {
    await this.validateDeviceAccess(user, deviceId);
    const where: any = { device_id: deviceId };
    if (startDate && endDate) {
      where.measurement_date = Between(startDate, endDate);
    }
    return this.fishGrowthRepository.findAll({
      where,
      order: { measurement_date: 'ASC' },
    });
  }

  async findOne(user: User, id: string): Promise<FishGrowth> {
    const growthRecord = await this.fishGrowthRepository.findOne({ where: { id } });
    if (!growthRecord) {
      throw new NotFoundException(`Fish growth record with ID "${id}" not found`);
    }
    await this.validateDeviceAccess(user, growthRecord.device_id);
    return growthRecord;
  }

  async update(
    user: User,
    id: string,
    updateFishGrowthDto: UpdateFishGrowthDto,
  ): Promise<FishGrowth> {
    const growthRecord = await this.findOne(user, id);
    await this.validateMeasurementDate(updateFishGrowthDto.measurement_date);
    await this.validateMeasurementValues(updateFishGrowthDto);
    const { length_cm, weight_gram } = {
      ...growthRecord,
      ...updateFishGrowthDto,
    };
    const updatedData = { ...updateFishGrowthDto };
    if (updateFishGrowthDto.length_cm || updateFishGrowthDto.weight_gram) {
      updatedData['biomass_kg'] = this.calculateBiomass(length_cm, weight_gram);
      updatedData['condition_indicator'] = this.calculateConditionIndicator(length_cm, weight_gram);
    }
    Object.assign(growthRecord, updatedData);
    try {
      return await this.fishGrowthRepository.save(growthRecord);
    } catch (error) {
      this.logger.error('Error updating fish growth record', error.stack);
      throw error;
    }
  }

  async remove(user: User, id: string): Promise<void> {
    await this.findOne(user, id);
    try {
      await this.fishGrowthRepository.remove(id);
    } catch (error) {
      this.logger.error('Error removing fish growth record', error.stack);
      throw error;
    }
  }

  async getAnalytics(user: User, deviceId: string, query?: any): Promise<any> {
    await this.validateDeviceAccess(user, deviceId);
    
    const cacheKey = `analytics_${deviceId}_${user.id}_${JSON.stringify(query)}`;
    
    return this.cacheService.getOrSet(
      cacheKey,
      async () => {
        try {
          // Get growth statistics
          const stats = await this.fishGrowthRepository.getGrowthStatistics([deviceId]);
          
          // Get growth rate analysis
          const growthRate = await this.analyticsService.calculateGrowthRate([deviceId]);
          
          // Get trend analysis
          const trendAnalysis = await this.analyticsService.calculateTrendAnalysis(deviceId);
          
          // Get comprehensive statistics
          const comprehensiveStats = await this.analyticsService.calculateStatistics([deviceId]);
          
          return {
            statistics: stats,
            growthRate: growthRate[0] || null,
            trendAnalysis,
            comprehensiveStats,
            deviceId,
            generatedAt: new Date().toISOString(),
          };
        } catch (error) {
          this.logger.error('Analytics calculation failed', error.stack);
          throw new AnalyticsCalculationException('analytics', error.message);
        }
      },
      10 * 60 * 1000, // 10 minutes cache
    );
  }

  async findAllWithPagination(
    user: User,
    deviceId: string,
    query: FishGrowthQueryDto,
  ): Promise<any> {
    await this.validateDeviceAccess(user, deviceId);
    
    const cacheKey = `pagination_${deviceId}_${JSON.stringify(query)}`;
    
    return this.cacheService.getOrSet(
      cacheKey,
      () => this.fishGrowthRepository.findWithPagination(query),
      5 * 60 * 1000, // 5 minutes cache
    );
  }

  async getGrowthTrends(user: User, deviceId: string, period: string = '90d'): Promise<any> {
    await this.validateDeviceAccess(user, deviceId);
    
    const cacheKey = this.cacheService.generateTrendsKey(deviceId, period);
    
    return this.cacheService.getOrSet(
      cacheKey,
      async () => {
        try {
          return await this.analyticsService.calculateTrendAnalysis(deviceId);
        } catch (error) {
          this.logger.error('Growth trends calculation failed', error.stack);
          throw new AnalyticsCalculationException('growth trends', error.message);
        }
      },
      15 * 60 * 1000, // 15 minutes cache
    );
  }

  async getPredictions(user: User, deviceId: string, days: number = 30): Promise<any> {
    await this.validateDeviceAccess(user, deviceId);
    
    const cacheKey = this.cacheService.generatePredictionsKey(deviceId, days);
    
    return this.cacheService.getOrSet(
      cacheKey,
      async () => {
        try {
          return await this.analyticsService.generatePredictions(deviceId, days);
        } catch (error) {
          this.logger.error('Predictions calculation failed', error.stack);
          throw new AnalyticsCalculationException('predictions', error.message);
        }
      },
      30 * 60 * 1000, // 30 minutes cache
    );
  }

  async getHealthMetrics(): Promise<any> {
    const cacheKey = 'health_metrics';
    
    return this.cacheService.getOrSet(
      cacheKey,
      async () => {
        try {
          const dataIntegrity = await this.fishGrowthRepository.validateDataIntegrity();
          
          return {
            totalRecords: dataIntegrity.totalRecords,
            dataIntegrity,
            cacheStats: this.cacheService.getStats(),
            cacheHitRate: this.cacheService.getHitRate(),
            memoryUsage: this.cacheService.getMemoryUsage(),
            serviceStatus: 'healthy',
            timestamp: new Date().toISOString(),
          };
        } catch (error) {
          this.logger.error('Health metrics calculation failed', error.stack);
          return {
            serviceStatus: 'unhealthy',
            error: error.message,
            timestamp: new Date().toISOString(),
          };
        }
      },
      2 * 60 * 1000, // 2 minutes cache for health metrics
    );
  }

  async validateDataIntegrity(deviceId: string): Promise<any> {
    try {
      return await this.fishGrowthRepository.validateDataIntegrity();
    } catch (error) {
      this.logger.error('Data integrity validation failed', error.stack);
      throw error;
    }
  }

  async bulkCreate(
    user: User,
    deviceId: string,
    bulkDto: BulkFishGrowthDto,
  ): Promise<any> {
    await this.validateDeviceAccess(user, deviceId);
    const results = { successful: 0, failed: 0, errors: [] as string[] };
    for (const measurement of bulkDto.measurements) {
      try {
        await this.create(user, deviceId, measurement);
        results.successful++;
      } catch (error: any) {
        results.failed++;
        results.errors.push(error?.message || 'Unknown error');
        if (!bulkDto.continueOnError) break;
      }
    }
    if (results.failed > 0) {
      throw new BulkOperationException('create', results.successful, results.failed, results.errors, undefined, { totalRecords: bulkDto.measurements.length });
    }
    return results;
  }

  async bulkUpdate(
    user: User,
    deviceId: string,
    updates: { id: string; data: UpdateFishGrowthDto }[],
  ): Promise<any> {
    await this.validateDeviceAccess(user, deviceId);
    try {
      return await this.fishGrowthRepository.bulkUpdate(updates);
    } catch (error) {
      this.logger.error('Bulk update failed', error.stack);
      throw error;
    }
  }

  async bulkRemove(
    user: User,
    deviceId: string,
    ids: string[],
  ): Promise<any> {
    await this.validateDeviceAccess(user, deviceId);
    try {
      return await this.fishGrowthRepository.bulkDelete(ids);
    } catch (error) {
      this.logger.error('Bulk remove failed', error.stack);
      throw error;
    }
  }

  private async validateDeviceAccess(user: User, deviceId: string): Promise<void> {
    // Device ownership and access check
    const device = await this.devicesService.findOne(deviceId, user);
    if (!device) {
      throw new DeviceNotFoundException(deviceId);
    }
    if (device.user.id !== user.id && user.role !== UserRole.ADMIN && user.role !== UserRole.SUPERUSER) {
      throw new DeviceAccessDeniedException(deviceId, user.id);
    }
    // Optionally update device last_seen timestamp
    await this.devicesService.updateLastSeen(deviceId);
  }

  private async validateMeasurementDate(date: Date | string | undefined): Promise<void> {
    if (!date) return;
    const now = new Date();
    const d = new Date(date);
    if (d > now) {
      throw new InvalidMeasurementDateException(d.toISOString(), 'Measurement date cannot be in the future');
    }
  }

  private async validateMeasurementValues(dto: any): Promise<void> {
    // Use class-validator for DTO validation
    const errors = await validate(plainToClass(CreateFishGrowthDto, dto));
    if (errors.length > 0) {
      const errorMessages = errors.map(error => Object.values(error.constraints || {}).join(', ')).join('; ');
      throw new InvalidMeasurementValueException('measurement', dto, errorMessages);
    }
  }

  private async handleDuplicateMeasurements(deviceId: string, date: Date | string): Promise<void> {
    // Check for duplicate measurement for same device and date
    let dateObj: Date;
    if (typeof date === 'string') {
      dateObj = new Date(date);
    } else {
      dateObj = date;
    }
    const existing = await this.fishGrowthRepository.findOne({ where: { device_id: deviceId, measurement_date: dateObj } });
    if (existing) {
      throw new DuplicateMeasurementException(deviceId, dateObj.toISOString());
    }
  }

  private calculateBiomass(length_cm?: number, weight_gram?: number): number | null {
    if (length_cm && weight_gram) {
      // Example formula: biomass = (length_cm * weight_gram) / 1000
      return Math.round((length_cm * weight_gram) / 1000 * 1000) / 1000;
    }
    return null;
  }

  private calculateConditionIndicator(length_cm?: number, weight_gram?: number): string | null {
    if (!length_cm || !weight_gram) return null;
    const k = (weight_gram / Math.pow(length_cm, 3)) * 100;
    if (k < 1) return 'Poor';
    if (k < 2) return 'Good';
    return 'Excellent';
  }
}
