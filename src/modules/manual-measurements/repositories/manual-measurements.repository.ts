import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder, Between, FindOptionsWhere, In } from 'typeorm';
import { ManualMeasurement } from '../entities/manual-measurement.entity';
import { CreateManualMeasurementDto } from '../dto/create-manual-measurement.dto';
import { ManualMeasurementQueryDto } from '../dto/manual-measurement-query.dto';
import { 
  DatabaseOperationException, 
  ManualMeasurementNotFoundException,
  DuplicateMeasurementException,
  ManualMeasurementExceptionFactory 
} from '../exceptions';

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

export interface DuplicateCheckResult {
  exists: boolean;
  existingMeasurement?: ManualMeasurement;
  conflictWindow?: {
    start: Date;
    end: Date;
  };
}

export interface QueryOptimizationOptions {
  useIndex?: string;
  forceIndex?: boolean;
  selectOnly?: (keyof ManualMeasurement)[];
  joinRelations?: string[];
}

@Injectable()
export class ManualMeasurementsRepository {
  private readonly logger = new Logger(ManualMeasurementsRepository.name);

  constructor(
    @InjectRepository(ManualMeasurement)
    private readonly repository: Repository<ManualMeasurement>,
  ) {}

  /**
   * Create a new manual measurement
   */
  async create(
    createDto: CreateManualMeasurementDto,
    userId: string,
    deviceId: string,
  ): Promise<ManualMeasurement> {
    try {
      const measurement = this.repository.create({
        ...createDto,
        measurement_timestamp: new Date(createDto.measurement_timestamp),
        measured_by: userId,
        device_id: deviceId,
      });

      const savedMeasurement = await this.repository.save(measurement);
      
      this.logger.debug(
        `Created manual measurement: ${savedMeasurement.id}`,
        {
          measurementId: savedMeasurement.id,
          deviceId,
          userId,
          timestamp: createDto.measurement_timestamp,
        },
      );

      return savedMeasurement;
    } catch (error) {
      this.logger.error(
        `Failed to create manual measurement for device ${deviceId}`,
        {
          error: error.message,
          deviceId,
          userId,
          createDto,
        },
      );

      if (error.code === '23505') { // PostgreSQL unique constraint violation
        throw ManualMeasurementExceptionFactory.createDuplicateMeasurementException(
          deviceId,
          createDto.measurement_timestamp,
          { userId, originalError: error.message },
        );
      }

      throw ManualMeasurementExceptionFactory.createDatabaseOperationException(
        'CREATE',
        error,
        { deviceId, userId, createDto },
      );
    }
  }

  /**
   * Find manual measurements by device ID with pagination
   */
  async findByDeviceId(
    deviceId: string,
    options: {
      page?: number;
      limit?: number;
      sortBy?: string;
      sortOrder?: 'ASC' | 'DESC';
      includeRelations?: boolean;
    } = {},
  ): Promise<PaginatedResult<ManualMeasurement>> {
    try {
      const {
        page = 1,
        limit = 20,
        sortBy = 'measurement_timestamp',
        sortOrder = 'DESC',
        includeRelations = false,
      } = options;

      const queryBuilder = this.repository
        .createQueryBuilder('mm')
        .where('mm.device_id = :deviceId', { deviceId });

      // Add relations if requested
      if (includeRelations) {
        queryBuilder
          .leftJoinAndSelect('mm.device', 'device')
          .leftJoinAndSelect('mm.user', 'user');
      }

      // Add sorting
      queryBuilder.orderBy(`mm.${sortBy}`, sortOrder);

      // Add pagination
      const offset = (page - 1) * limit;
      queryBuilder.skip(offset).take(limit);

      // Execute query with count
      const [data, total] = await queryBuilder.getManyAndCount();

      const totalPages = Math.ceil(total / limit);

      return {
        data,
        total,
        page,
        limit,
        totalPages,
        hasNext: page < totalPages,
        hasPrevious: page > 1,
      };
    } catch (error) {
      this.logger.error(
        `Failed to find measurements by device ID: ${deviceId}`,
        { error: error.message, deviceId, options },
      );

      throw ManualMeasurementExceptionFactory.createDatabaseOperationException(
        'SELECT_BY_DEVICE',
        error,
        { deviceId, options },
      );
    }
  }

  /**
   * Find manual measurements by date range
   */
  async findByDateRange(
    deviceId: string,
    startDate: Date,
    endDate: Date,
    options: {
      limit?: number;
      offset?: number;
      measurementTypes?: string[];
      includeRelations?: boolean;
    } = {},
  ): Promise<ManualMeasurement[]> {
    try {
      const {
        limit = 100,
        offset = 0,
        measurementTypes = [],
        includeRelations = false,
      } = options;

      const queryBuilder = this.repository
        .createQueryBuilder('mm')
        .where('mm.device_id = :deviceId', { deviceId })
        .andWhere('mm.measurement_timestamp BETWEEN :startDate AND :endDate', {
          startDate,
          endDate,
        });

      // Filter by measurement types if specified
      if (measurementTypes.length > 0) {
        const conditions = measurementTypes.map(type => {
          switch (type) {
            case 'temperature':
              return 'mm.temperature IS NOT NULL';
            case 'ph':
              return 'mm.ph IS NOT NULL';
            case 'tds':
              return 'mm.tds IS NOT NULL';
            case 'do_level':
              return 'mm.do_level IS NOT NULL';
            default:
              return null;
          }
        }).filter(Boolean);

        if (conditions.length > 0) {
          queryBuilder.andWhere(`(${conditions.join(' OR ')})`);
        }
      }

      // Add relations if requested
      if (includeRelations) {
        queryBuilder
          .leftJoinAndSelect('mm.device', 'device')
          .leftJoinAndSelect('mm.user', 'user');
      }

      // Add pagination and sorting
      queryBuilder
        .orderBy('mm.measurement_timestamp', 'DESC')
        .skip(offset)
        .take(limit);

      return await queryBuilder.getMany();
    } catch (error) {
      this.logger.error(
        `Failed to find measurements by date range for device: ${deviceId}`,
        {
          error: error.message,
          deviceId,
          startDate,
          endDate,
          options,
        },
      );

      throw ManualMeasurementExceptionFactory.createDatabaseOperationException(
        'SELECT_BY_DATE_RANGE',
        error,
        { deviceId, startDate, endDate, options },
      );
    }
  }

  /**
   * Find manual measurement by timestamp (for duplicate checking)
   */
  async findByTimestamp(
    deviceId: string,
    timestamp: Date,
    toleranceMinutes: number = 5,
  ): Promise<ManualMeasurement | null> {
    try {
      const startTime = new Date(timestamp.getTime() - toleranceMinutes * 60 * 1000);
      const endTime = new Date(timestamp.getTime() + toleranceMinutes * 60 * 1000);

      return await this.repository
        .createQueryBuilder('mm')
        .where('mm.device_id = :deviceId', { deviceId })
        .andWhere('mm.measurement_timestamp BETWEEN :startTime AND :endTime', {
          startTime,
          endTime,
        })
        .orderBy('ABS(EXTRACT(EPOCH FROM (mm.measurement_timestamp - :timestamp)))')
        .setParameter('timestamp', timestamp)
        .getOne();
    } catch (error) {
      this.logger.error(
        `Failed to find measurement by timestamp for device: ${deviceId}`,
        {
          error: error.message,
          deviceId,
          timestamp,
          toleranceMinutes,
        },
      );

      throw ManualMeasurementExceptionFactory.createDatabaseOperationException(
        'SELECT_BY_TIMESTAMP',
        error,
        { deviceId, timestamp, toleranceMinutes },
      );
    }
  }

  /**
   * Find measurements with advanced pagination and filtering
   */
  async findWithPagination(
    queryDto: ManualMeasurementQueryDto,
    deviceId?: string,
    userId?: string,
  ): Promise<PaginatedResult<ManualMeasurement>> {
    try {
      const queryBuilder = this.repository.createQueryBuilder('mm');

      // Apply device filter
      if (deviceId) {
        queryBuilder.where('mm.device_id = :deviceId', { deviceId });
      }

      // Apply user filter
      if (userId) {
        queryBuilder.andWhere('mm.measured_by = :userId', { userId });
      }

      // Apply date range filters
      if (queryDto.startDate) {
        queryBuilder.andWhere('mm.measurement_timestamp >= :startDate', {
          startDate: new Date(queryDto.startDate),
        });
      }

      if (queryDto.endDate) {
        queryBuilder.andWhere('mm.measurement_timestamp <= :endDate', {
          endDate: new Date(queryDto.endDate),
        });
      }

      // Apply measurement type filter
      if (queryDto.measurement_type) {
        const typeCondition = this.buildMeasurementTypeCondition(queryDto.measurement_type);
        if (typeCondition) {
          queryBuilder.andWhere(typeCondition);
        }
      }

      // Apply search filter
      if (queryDto.search) {
        queryBuilder.andWhere('mm.notes ILIKE :search', {
          search: `%${queryDto.search}%`,
        });
      }

      // Apply user filter by measured_by
      if (queryDto.measured_by) {
        queryBuilder.andWhere('mm.measured_by = :measuredBy', {
          measuredBy: queryDto.measured_by,
        });
      }

      // Add relations if comparison data is requested
      if (queryDto.include_comparison) {
        queryBuilder
          .leftJoinAndSelect('mm.device', 'device')
          .leftJoinAndSelect('mm.user', 'user');
      }

      // Add sorting
      const sortField = this.validateSortField(queryDto.sortBy);
      queryBuilder.orderBy(`mm.${sortField}`, queryDto.sortOrder);

      // Add pagination
      queryBuilder.skip(queryDto.skip).take(queryDto.take);

      // Execute query
      const [data, total] = await queryBuilder.getManyAndCount();

      const totalPages = Math.ceil(total / queryDto.take);

      return {
        data,
        total,
        page: queryDto.page,
        limit: queryDto.take,
        totalPages,
        hasNext: queryDto.page < totalPages,
        hasPrevious: queryDto.page > 1,
      };
    } catch (error) {
      this.logger.error(
        'Failed to find measurements with pagination',
        {
          error: error.message,
          queryDto,
          deviceId,
          userId,
        },
      );

      throw ManualMeasurementExceptionFactory.createDatabaseOperationException(
        'SELECT_WITH_PAGINATION',
        error,
        { queryDto, deviceId, userId },
      );
    }
  }

  /**
   * Check for duplicate measurements
   */
  async checkDuplicates(
    deviceId: string,
    timestamp: Date,
    toleranceMinutes: number = 5,
  ): Promise<DuplicateCheckResult> {
    try {
      const startTime = new Date(timestamp.getTime() - toleranceMinutes * 60 * 1000);
      const endTime = new Date(timestamp.getTime() + toleranceMinutes * 60 * 1000);

      const existingMeasurement = await this.repository
        .createQueryBuilder('mm')
        .where('mm.device_id = :deviceId', { deviceId })
        .andWhere('mm.measurement_timestamp BETWEEN :startTime AND :endTime', {
          startTime,
          endTime,
        })
        .getOne();

      return {
        exists: !!existingMeasurement,
        existingMeasurement: existingMeasurement || undefined,
        conflictWindow: {
          start: startTime,
          end: endTime,
        },
      };
    } catch (error) {
      this.logger.error(
        `Failed to check duplicates for device: ${deviceId}`,
        {
          error: error.message,
          deviceId,
          timestamp,
          toleranceMinutes,
        },
      );

      throw ManualMeasurementExceptionFactory.createDatabaseOperationException(
        'CHECK_DUPLICATES',
        error,
        { deviceId, timestamp, toleranceMinutes },
      );
    }
  }

  /**
   * Find a single measurement by ID with optional relations
   */
  async findById(
    id: string,
    includeRelations: boolean = false,
  ): Promise<ManualMeasurement> {
    try {
      const queryBuilder = this.repository
        .createQueryBuilder('mm')
        .where('mm.id = :id', { id });

      if (includeRelations) {
        queryBuilder
          .leftJoinAndSelect('mm.device', 'device')
          .leftJoinAndSelect('mm.user', 'user');
      }

      const measurement = await queryBuilder.getOne();

      if (!measurement) {
        throw new ManualMeasurementNotFoundException(
          id,
          ManualMeasurementExceptionFactory.generateCorrelationId(),
        );
      }

      return measurement;
    } catch (error) {
      if (error instanceof ManualMeasurementNotFoundException) {
        throw error;
      }

      this.logger.error(
        `Failed to find measurement by ID: ${id}`,
        { error: error.message, id, includeRelations },
      );

      throw ManualMeasurementExceptionFactory.createDatabaseOperationException(
        'SELECT_BY_ID',
        error,
        { id, includeRelations },
      );
    }
  }

  /**
   * Update a manual measurement
   */
  async update(
    id: string,
    updateData: Partial<ManualMeasurement>,
  ): Promise<ManualMeasurement> {
    try {
      const measurement = await this.findById(id);
      
      Object.assign(measurement, updateData);

      const updatedMeasurement = await this.repository.save(measurement);

      this.logger.debug(
        `Updated manual measurement: ${id}`,
        { measurementId: id, updateData },
      );

      return updatedMeasurement;
    } catch (error) {
      this.logger.error(
        `Failed to update measurement: ${id}`,
        { error: error.message, id, updateData },
      );

      throw ManualMeasurementExceptionFactory.createDatabaseOperationException(
        'UPDATE',
        error,
        { id, updateData },
      );
    }
  }

  /**
   * Delete a manual measurement
   */
  async delete(id: string): Promise<void> {
    try {
      const measurement = await this.findById(id);
      await this.repository.remove(measurement);

      this.logger.debug(
        `Deleted manual measurement: ${id}`,
        { measurementId: id },
      );
    } catch (error) {
      this.logger.error(
        `Failed to delete measurement: ${id}`,
        { error: error.message, id },
      );

      throw ManualMeasurementExceptionFactory.createDatabaseOperationException(
        'DELETE',
        error,
        { id },
      );
    }
  }

  /**
   * Get measurements count by device
   */
  async getCountByDevice(deviceId: string): Promise<number> {
    try {
      return await this.repository.count({
        where: { device_id: deviceId },
      });
    } catch (error) {
      this.logger.error(
        `Failed to get count for device: ${deviceId}`,
        { error: error.message, deviceId },
      );

      throw ManualMeasurementExceptionFactory.createDatabaseOperationException(
        'COUNT_BY_DEVICE',
        error,
        { deviceId },
      );
    }
  }

  /**
   * Get measurements statistics for a device
   */
  async getDeviceStatistics(
    deviceId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<{
    total: number;
    byType: Record<string, number>;
    dateRange: { start: Date; end: Date } | null;
    avgValuesPerMeasurement: number;
  }> {
    try {
      const queryBuilder = this.repository
        .createQueryBuilder('mm')
        .where('mm.device_id = :deviceId', { deviceId });

      if (startDate) {
        queryBuilder.andWhere('mm.measurement_timestamp >= :startDate', { startDate });
      }

      if (endDate) {
        queryBuilder.andWhere('mm.measurement_timestamp <= :endDate', { endDate });
      }

      const measurements = await queryBuilder.getMany();

      const total = measurements.length;
      const byType: Record<string, number> = {
        temperature: 0,
        ph: 0,
        tds: 0,
        do_level: 0,
      };

      let totalValues = 0;

      measurements.forEach(measurement => {
        let valueCount = 0;
        if (measurement.temperature !== null) {
          byType.temperature++;
          valueCount++;
        }
        if (measurement.ph !== null) {
          byType.ph++;
          valueCount++;
        }
        if (measurement.tds !== null) {
          byType.tds++;
          valueCount++;
        }
        if (measurement.do_level !== null) {
          byType.do_level++;
          valueCount++;
        }
        totalValues += valueCount;
      });

      let dateRange: { start: Date; end: Date } | null = null;
      if (measurements.length > 0) {
        const timestamps = measurements.map(m => m.measurement_timestamp);
        dateRange = {
          start: new Date(Math.min(...timestamps.map(t => t.getTime()))),
          end: new Date(Math.max(...timestamps.map(t => t.getTime()))),
        };
      }

      return {
        total,
        byType,
        dateRange,
        avgValuesPerMeasurement: total > 0 ? totalValues / total : 0,
      };
    } catch (error) {
      this.logger.error(
        `Failed to get statistics for device: ${deviceId}`,
        { error: error.message, deviceId, startDate, endDate },
      );

      throw ManualMeasurementExceptionFactory.createDatabaseOperationException(
        'GET_STATISTICS',
        error,
        { deviceId, startDate, endDate },
      );
    }
  }

  /**
   * Find measurements for bulk operations
   */
  async findForBulkOperation(
    deviceIds: string[],
    startDate: Date,
    endDate: Date,
    batchSize: number = 1000,
  ): Promise<ManualMeasurement[][]> {
    try {
      const allMeasurements: ManualMeasurement[] = await this.repository
        .createQueryBuilder('mm')
        .where('mm.device_id IN (:...deviceIds)', { deviceIds })
        .andWhere('mm.measurement_timestamp BETWEEN :startDate AND :endDate', {
          startDate,
          endDate,
        })
        .orderBy('mm.measurement_timestamp', 'ASC')
        .getMany();

      // Split into batches
      const batches: ManualMeasurement[][] = [];
      for (let i = 0; i < allMeasurements.length; i += batchSize) {
        batches.push(allMeasurements.slice(i, i + batchSize));
      }

      return batches;
    } catch (error) {
      this.logger.error(
        'Failed to find measurements for bulk operation',
        {
          error: error.message,
          deviceIds,
          startDate,
          endDate,
          batchSize,
        },
      );

      throw ManualMeasurementExceptionFactory.createDatabaseOperationException(
        'BULK_OPERATION_SELECT',
        error,
        { deviceIds, startDate, endDate, batchSize },
      );
    }
  }

  /**
   * Build measurement type condition for query
   */
  private buildMeasurementTypeCondition(measurementType: string): string | null {
    switch (measurementType) {
      case 'temperature':
        return 'mm.temperature IS NOT NULL';
      case 'ph':
        return 'mm.ph IS NOT NULL';
      case 'tds':
        return 'mm.tds IS NOT NULL';
      case 'do_level':
        return 'mm.do_level IS NOT NULL';
      default:
        return null;
    }
  }

  /**
   * Validate sort field to prevent SQL injection
   */
  private validateSortField(sortBy?: string): string {
    const allowedFields = [
      'measurement_timestamp',
      'created_at',
      'temperature',
      'ph',
      'tds',
      'do_level',
    ];

    return allowedFields.includes(sortBy || '') ? sortBy! : 'measurement_timestamp';
  }
}
