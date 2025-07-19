import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindManyOptions, FindOneOptions, SelectQueryBuilder, IsNull } from 'typeorm';
import { FishGrowth } from './entities/fish-growth.entity';
import { CreateFishGrowthDto } from './dto/create-fish-growth.dto';
import { UpdateFishGrowthDto } from './dto/update-fish-growth.dto';
import { FishGrowthQueryDto } from './dto/fish-growth-query.dto';
import { BulkFishGrowthDto } from './dto/bulk-fish-growth.dto';
import {
  FishGrowthNotFoundException,
  DatabaseOperationException,
  BulkOperationException,
  InsufficientDataException,
  DataIntegrityException,
} from './exceptions';

export interface PaginationResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface GrowthStatistics {
  totalRecords: number;
  deviceCount: number;
  dateRange: {
    earliest: Date;
    latest: Date;
  };
  measurementSummary: {
    avgLength: number;
    avgWeight: number;
    avgBiomass: number;
    minLength: number;
    maxLength: number;
    minWeight: number;
    maxWeight: number;
  };
  growthMetrics: {
    avgGrowthRate: number;
    totalBiomass: number;
    conditionIndicators: Record<string, number>;
  };
}

export interface DataIntegrityIssue {
  type: string;
  count: number;
  severity: 'low' | 'medium' | 'high';
  description: string;
}

export interface DataIntegrityReport {
  totalRecords: number;
  validRecords: number;
  invalidRecords: number;
  issues: DataIntegrityIssue[];
  recommendations: string[];
}

export interface BulkOperationResult {
  successful: number;
  failed: number;
  errors: string[];
}

@Injectable()
export class FishGrowthRepository {
  constructor(
    @InjectRepository(FishGrowth)
    private readonly fishGrowthRepository: Repository<FishGrowth>,
  ) {}

  create(createFishGrowthDto: CreateFishGrowthDto): FishGrowth {
    return this.fishGrowthRepository.create(createFishGrowthDto);
  }

  save(fishGrowth: FishGrowth): Promise<FishGrowth> {
    return this.fishGrowthRepository.save(fishGrowth);
  }

  findAll(options: FindManyOptions<FishGrowth>): Promise<FishGrowth[]> {
    return this.fishGrowthRepository.find(options);
  }

  findOne(options: FindOneOptions<FishGrowth>): Promise<FishGrowth | null> {
    return this.fishGrowthRepository.findOne(options);
  }

  async remove(id: string): Promise<void> {
    await this.fishGrowthRepository.delete(id);
  }

  /**
   * Find records with pagination support
   */
  async findWithPagination(
    queryDto: FishGrowthQueryDto,
    correlationId?: string,
  ): Promise<PaginationResult<FishGrowth>> {
    try {
      const { limit = 10, offset = 0, sortBy = 'measurement_date', sortOrder = 'DESC' } = queryDto;
      const page = Math.floor(offset / limit) + 1;
      
      const queryBuilder = this.createQueryBuilder('fish_growth');
      
      // Apply filters
      this.applyFilters(queryBuilder, queryDto);
      
      // Apply sorting
      queryBuilder.orderBy(`fish_growth.${sortBy}`, sortOrder);
      
      // Apply pagination
      queryBuilder.skip(offset).take(limit);
      
      // Execute query
      const [data, total] = await queryBuilder.getManyAndCount();
      
      const totalPages = Math.ceil(total / limit);
      
      return {
        data,
        total,
        page,
        limit,
        totalPages,
        hasNextPage: offset + limit < total,
        hasPreviousPage: offset > 0,
      };
    } catch (error) {
      throw new DatabaseOperationException(
        'findWithPagination',
        error.message,
        correlationId,
        { queryDto },
      );
    }
  }

  /**
   * Find records by date range
   */
  async findByDateRange(
    startDate: Date,
    endDate: Date,
    deviceIds?: string[],
    correlationId?: string,
  ): Promise<FishGrowth[]> {
    try {
      const queryBuilder = this.createQueryBuilder('fish_growth');
      
      queryBuilder.where('fish_growth.measurement_date BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      });
      
      if (deviceIds && deviceIds.length > 0) {
        queryBuilder.andWhere('fish_growth.device_id IN (:...deviceIds)', { deviceIds });
      }
      
      queryBuilder.orderBy('fish_growth.measurement_date', 'DESC');
      
      return await queryBuilder.getMany();
    } catch (error) {
      throw new DatabaseOperationException(
        'findByDateRange',
        error.message,
        correlationId,
        { startDate, endDate, deviceIds },
      );
    }
  }

  /**
   * Find latest records by device
   */
  async findLatestByDevice(
    deviceId: string,
    limit: number = 10,
    correlationId?: string,
  ): Promise<FishGrowth[]> {
    try {
      return await this.fishGrowthRepository.find({
        where: { device_id: deviceId },
        order: { measurement_date: 'DESC' },
        take: limit,
        relations: ['device'],
      });
    } catch (error) {
      throw new DatabaseOperationException(
        'findLatestByDevice',
        error.message,
        correlationId,
        { deviceId, limit },
      );
    }
  }

  /**
   * Bulk insert records
   */
  async bulkInsert(
    records: CreateFishGrowthDto[],
    correlationId?: string,
  ): Promise<BulkOperationResult> {
    const results: BulkOperationResult = { successful: 0, failed: 0, errors: [] };
    
    for (let i = 0; i < records.length; i++) {
      try {
        const record = this.create(records[i]);
        await this.save(record);
        results.successful++;
      } catch (error) {
        results.failed++;
        results.errors.push(`Record ${i + 1}: ${error.message}`);
      }
    }
    
    if (results.failed > 0) {
      throw new BulkOperationException(
        'insert',
        results.successful,
        results.failed,
        results.errors,
        correlationId,
        { totalRecords: records.length },
      );
    }
    
    return results;
  }

  /**
   * Bulk update records
   */
  async bulkUpdate(
    updates: Array<{ id: string; data: UpdateFishGrowthDto }>,
    correlationId?: string,
  ): Promise<BulkOperationResult> {
    const results: BulkOperationResult = { successful: 0, failed: 0, errors: [] };
    
    for (let i = 0; i < updates.length; i++) {
      try {
        const { id, data } = updates[i];
        const existing = await this.findOne({ where: { id } });
        
        if (!existing) {
          results.failed++;
          results.errors.push(`Record ${i + 1}: Fish growth record not found`);
          continue;
        }
        
        Object.assign(existing, data);
        await this.save(existing);
        results.successful++;
      } catch (error) {
        results.failed++;
        results.errors.push(`Record ${i + 1}: ${error.message}`);
      }
    }
    
    if (results.failed > 0) {
      throw new BulkOperationException(
        'update',
        results.successful,
        results.failed,
        results.errors,
        correlationId,
        { totalRecords: updates.length },
      );
    }
    
    return results;
  }

  /**
   * Bulk delete records
   */
  async bulkDelete(
    ids: string[],
    correlationId?: string,
  ): Promise<BulkOperationResult> {
    const results: BulkOperationResult = { successful: 0, failed: 0, errors: [] };
    
    for (let i = 0; i < ids.length; i++) {
      try {
        const result = await this.fishGrowthRepository.delete(ids[i]);
        if (result.affected === 0) {
          results.failed++;
          results.errors.push(`Record ${i + 1}: Fish growth record not found`);
        } else {
          results.successful++;
        }
      } catch (error) {
        results.failed++;
        results.errors.push(`Record ${i + 1}: ${error.message}`);
      }
    }
    
    if (results.failed > 0) {
      throw new BulkOperationException(
        'delete',
        results.successful,
        results.failed,
        results.errors,
        correlationId,
        { totalRecords: ids.length },
      );
    }
    
    return results;
  }

  /**
   * Get growth statistics for analytics
   */
  async getGrowthStatistics(
    deviceIds?: string[],
    startDate?: Date,
    endDate?: Date,
    correlationId?: string,
  ): Promise<GrowthStatistics> {
    try {
      const queryBuilder = this.createQueryBuilder('fish_growth');
      
      if (deviceIds && deviceIds.length > 0) {
        queryBuilder.where('fish_growth.device_id IN (:...deviceIds)', { deviceIds });
      }
      
      if (startDate) {
        queryBuilder.andWhere('fish_growth.measurement_date >= :startDate', { startDate });
      }
      
      if (endDate) {
        queryBuilder.andWhere('fish_growth.measurement_date <= :endDate', { endDate });
      }
      
      const records = await queryBuilder.getMany();
      
      if (records.length === 0) {
        throw new InsufficientDataException(
          'growth statistics',
          1,
          0,
          correlationId,
          { deviceIds, startDate, endDate },
        );
      }
      
      const deviceSet = new Set(records.map(r => r.device_id));
      const lengths = records.filter(r => r.length_cm != null).map(r => r.length_cm);
      const weights = records.filter(r => r.weight_gram != null).map(r => r.weight_gram);
      const biomasses = records.filter(r => r.biomass_kg != null).map(r => r.biomass_kg);
      const conditionIndicators = records.reduce((acc, r) => {
        if (r.condition_indicator) {
          acc[r.condition_indicator] = (acc[r.condition_indicator] || 0) + 1;
        }
        return acc;
      }, {} as Record<string, number>);
      
      const sortedDates = records.map(r => r.measurement_date).sort();
      
      const biomassValues = biomasses.filter(b => b !== null) as number[];
      
      return {
        totalRecords: records.length,
        deviceCount: deviceSet.size,
        dateRange: {
          earliest: sortedDates[0],
          latest: sortedDates[sortedDates.length - 1],
        },
        measurementSummary: {
          avgLength: lengths.length > 0 ? lengths.reduce((a, b) => a + b, 0) / lengths.length : 0,
          avgWeight: weights.length > 0 ? weights.reduce((a, b) => a + b, 0) / weights.length : 0,
          avgBiomass: biomassValues.length > 0 ? biomassValues.reduce((a, b) => a + b, 0) / biomassValues.length : 0,
          minLength: lengths.length > 0 ? Math.min(...lengths) : 0,
          maxLength: lengths.length > 0 ? Math.max(...lengths) : 0,
          minWeight: weights.length > 0 ? Math.min(...weights) : 0,
          maxWeight: weights.length > 0 ? Math.max(...weights) : 0,
        },
        growthMetrics: {
          avgGrowthRate: this.calculateAverageGrowthRate(records),
          totalBiomass: biomassValues.length > 0 ? biomassValues.reduce((a, b) => a + b, 0) : 0,
          conditionIndicators,
        },
      };
    } catch (error) {
      if (error instanceof InsufficientDataException) {
        throw error;
      }
      throw new DatabaseOperationException(
        'getGrowthStatistics',
        error.message,
        correlationId,
        { deviceIds, startDate, endDate },
      );
    }
  }

  /**
   * Find duplicate records
   */
  async findDuplicates(correlationId?: string): Promise<FishGrowth[]> {
    try {
      const queryBuilder = this.createQueryBuilder('fish_growth');
      
      queryBuilder
        .select([
          'fish_growth.device_id',
          'fish_growth.measurement_date',
          'COUNT(*) as count',
        ])
        .groupBy('fish_growth.device_id')
        .addGroupBy('fish_growth.measurement_date')
        .having('COUNT(*) > 1');
      
      const duplicates = await queryBuilder.getRawMany();
      
      if (duplicates.length === 0) {
        return [];
      }
      
      const duplicateRecords: FishGrowth[] = [];
      for (const duplicate of duplicates) {
        const records = await this.fishGrowthRepository.find({
          where: {
            device_id: duplicate.device_id,
            measurement_date: duplicate.measurement_date,
          },
          order: { created_at: 'ASC' },
        });
        duplicateRecords.push(...records);
      }
      
      return duplicateRecords;
    } catch (error) {
      throw new DatabaseOperationException(
        'findDuplicates',
        error.message,
        correlationId,
      );
    }
  }

  /**
   * Validate data integrity
   */
  async validateDataIntegrity(correlationId?: string): Promise<DataIntegrityReport> {
    try {
      const totalRecords = await this.fishGrowthRepository.count();
      let validRecords = 0;
      let invalidRecords = 0;
      const issues: DataIntegrityIssue[] = [];
      const recommendations: string[] = [];
      
      // Check for missing required fields
      const missingLength = await this.fishGrowthRepository.count({
        where: { length_cm: IsNull() },
      });
      
      const missingWeight = await this.fishGrowthRepository.count({
        where: { weight_gram: IsNull() },
      });
      
      const missingMeasurementDate = await this.fishGrowthRepository.count({
        where: { measurement_date: IsNull() },
      });
      
      // Check for invalid measurement values
      const invalidLengthQuery = await this.fishGrowthRepository
        .createQueryBuilder('fish_growth')
        .where('fish_growth.length_cm < 0 OR fish_growth.length_cm > 200')
        .getCount();
      
      const invalidWeightQuery = await this.fishGrowthRepository
        .createQueryBuilder('fish_growth')
        .where('fish_growth.weight_gram < 0 OR fish_growth.weight_gram > 50000')
        .getCount();
      
      // Check for future dates
      const futureDates = await this.fishGrowthRepository
        .createQueryBuilder('fish_growth')
        .where('fish_growth.measurement_date > :currentDate', { currentDate: new Date() })
        .getCount();
      
      // Check for duplicates
      const duplicates = await this.findDuplicates(correlationId);
      
      // Calculate valid records
      validRecords = totalRecords - missingLength - missingWeight - missingMeasurementDate - 
                    invalidLengthQuery - invalidWeightQuery - futureDates - duplicates.length;
      invalidRecords = totalRecords - validRecords;
      
      // Add issues
      if (missingLength > 0) {
        issues.push({
          type: 'missing_length',
          count: missingLength,
          severity: 'medium' as const,
          description: `${missingLength} records missing length measurements`,
        });
      }
      
      if (missingWeight > 0) {
        issues.push({
          type: 'missing_weight',
          count: missingWeight,
          severity: 'medium' as const,
          description: `${missingWeight} records missing weight measurements`,
        });
      }
      
      if (missingMeasurementDate > 0) {
        issues.push({
          type: 'missing_measurement_date',
          count: missingMeasurementDate,
          severity: 'high' as const,
          description: `${missingMeasurementDate} records missing measurement dates`,
        });
      }
      
      if (invalidLengthQuery > 0) {
        issues.push({
          type: 'invalid_length',
          count: invalidLengthQuery,
          severity: 'high' as const,
          description: `${invalidLengthQuery} records with invalid length values`,
        });
      }
      
      if (invalidWeightQuery > 0) {
        issues.push({
          type: 'invalid_weight',
          count: invalidWeightQuery,
          severity: 'high' as const,
          description: `${invalidWeightQuery} records with invalid weight values`,
        });
      }
      
      if (futureDates > 0) {
        issues.push({
          type: 'future_dates',
          count: futureDates,
          severity: 'high' as const,
          description: `${futureDates} records with future measurement dates`,
        });
      }
      
      if (duplicates.length > 0) {
        issues.push({
          type: 'duplicates',
          count: duplicates.length,
          severity: 'medium' as const,
          description: `${duplicates.length} duplicate records found`,
        });
      }
      
      // Add recommendations
      if (issues.length > 0) {
        recommendations.push('Review and correct data quality issues');
        recommendations.push('Implement data validation at input level');
        recommendations.push('Set up automated data quality monitoring');
      }
      
      if (duplicates.length > 0) {
        recommendations.push('Remove duplicate records and implement unique constraints');
      }
      
      return {
        totalRecords,
        validRecords,
        invalidRecords,
        issues,
        recommendations,
      };
    } catch (error) {
      throw new DatabaseOperationException(
        'validateDataIntegrity',
        error.message,
        correlationId,
      );
    }
  }

  /**
   * Create query builder with optimized joins
   */
  private createQueryBuilder(alias: string): SelectQueryBuilder<FishGrowth> {
    return this.fishGrowthRepository
      .createQueryBuilder(alias)
      .leftJoinAndSelect(`${alias}.device`, 'device');
  }

  /**
   * Apply filters to query builder
   */
  private applyFilters(
    queryBuilder: SelectQueryBuilder<FishGrowth>,
    queryDto: FishGrowthQueryDto,
  ): void {
    const { startDate, endDate, minLength, maxLength, minWeight, maxWeight, conditionIndicator, search } = queryDto;
    
    if (startDate) {
      queryBuilder.andWhere('fish_growth.measurement_date >= :startDate', { startDate });
    }
    
    if (endDate) {
      queryBuilder.andWhere('fish_growth.measurement_date <= :endDate', { endDate });
    }
    
    if (minLength !== undefined) {
      queryBuilder.andWhere('fish_growth.length_cm >= :minLength', { minLength });
    }
    
    if (maxLength !== undefined) {
      queryBuilder.andWhere('fish_growth.length_cm <= :maxLength', { maxLength });
    }
    
    if (minWeight !== undefined) {
      queryBuilder.andWhere('fish_growth.weight_gram >= :minWeight', { minWeight });
    }
    
    if (maxWeight !== undefined) {
      queryBuilder.andWhere('fish_growth.weight_gram <= :maxWeight', { maxWeight });
    }
    
    if (conditionIndicator) {
      queryBuilder.andWhere('fish_growth.condition_indicator = :conditionIndicator', { conditionIndicator });
    }
    
    if (search) {
      queryBuilder.andWhere('fish_growth.notes ILIKE :search', { search: `%${search}%` });
    }
  }

  /**
   * Calculate average growth rate
   */
  private calculateAverageGrowthRate(records: FishGrowth[]): number {
    if (records.length < 2) return 0;
    
    const deviceGroups = records.reduce((acc, record) => {
      if (!acc[record.device_id]) {
        acc[record.device_id] = [];
      }
      acc[record.device_id].push(record);
      return acc;
    }, {} as Record<string, FishGrowth[]>);
    
    let totalGrowthRate = 0;
    let deviceCount = 0;
    
    for (const [deviceId, deviceRecords] of Object.entries(deviceGroups)) {
      if (deviceRecords.length < 2) continue;
      
      const sortedRecords = deviceRecords.sort((a, b) => 
        new Date(a.measurement_date).getTime() - new Date(b.measurement_date).getTime()
      );
      
      const firstRecord = sortedRecords[0];
      const lastRecord = sortedRecords[sortedRecords.length - 1];
      
      if (firstRecord.length_cm && lastRecord.length_cm) {
        const lengthDiff = lastRecord.length_cm - firstRecord.length_cm;
        const timeDiff = (new Date(lastRecord.measurement_date).getTime() - 
                         new Date(firstRecord.measurement_date).getTime()) / (1000 * 60 * 60 * 24);
        
        if (timeDiff > 0) {
          totalGrowthRate += lengthDiff / timeDiff;
          deviceCount++;
        }
      }
    }
    
    return deviceCount > 0 ? totalGrowthRate / deviceCount : 0;
  }
}
