import { Injectable, Logger, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ManualMeasurementsRepository } from '../repositories/manual-measurements.repository';
import { MeasurementComparisonService } from './measurement-comparison.service';
import { DevicesService } from '../../devices/devices.service';
import { SensorsService } from '../../sensors/sensors.service';
import { ManualMeasurement } from '../entities/manual-measurement.entity';
import { CreateManualMeasurementDto } from '../dto/create-manual-measurement.dto';
import { ManualMeasurementQueryDto } from '../dto/manual-measurement-query.dto';
import { ManualMeasurementResponseDto } from '../dto/manual-measurement-response.dto';
import { MeasurementComparisonResponseDto } from '../dto/measurement-comparison-response.dto';
import { PaginatedResult } from '../repositories/manual-measurements.repository';
import {
  ManualMeasurementNotFoundException,
  MeasurementValidationException,
  DuplicateMeasurementException,
  DeviceAccessDeniedException,
  DatabaseOperationException,
  ComparisonFailedException,
} from '../exceptions/manual-measurement.exceptions';

export interface ManualMeasurementWithComparison {
  measurement: ManualMeasurement;
  comparison?: MeasurementComparisonResponseDto;
}

export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string[]>;
  warnings: Record<string, string[]>;
}

export interface DuplicateCheckResult {
  exists: boolean;
  existingMeasurement?: ManualMeasurement;
  timeDifference?: number; // in minutes
  recommendation?: string;
}

@Injectable()
export class ManualMeasurementsService {
  private readonly logger = new Logger(ManualMeasurementsService.name);
  
  // Configuration values
  private readonly DUPLICATE_TOLERANCE_MINUTES = 5;
  private readonly MAX_MEASUREMENT_AGE_DAYS = 30;
  
  // Biological and technical ranges for sensor values
  private readonly SENSOR_RANGES = {
    temperature: { min: 15, max: 35, optimal: { min: 24, max: 28 } },
    ph: { min: 6.0, max: 8.5, optimal: { min: 6.8, max: 7.5 } },
    tds: { min: 0, max: 2000, optimal: { min: 300, max: 800 } },
    do_level: { min: 0, max: 20, optimal: { min: 6, max: 12 } },
  };

  constructor(
    private readonly repository: ManualMeasurementsRepository,
    private readonly comparisonService: MeasurementComparisonService,
    private readonly devicesService: DevicesService,
    private readonly sensorsService: SensorsService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Create a new manual measurement with validation and optional comparison
   */
  async create(
    userId: string,
    deviceId: string,
    dto: CreateManualMeasurementDto,
  ): Promise<ManualMeasurementWithComparison> {
    try {
      // Validate device access
      await this.validateDeviceAccess(userId, deviceId);

      // Validate measurement values
      const validation = await this.validateMeasurementValues(dto);
      if (!validation.isValid) {
        throw new MeasurementValidationException(
          'Invalid measurement values provided',
          this.generateCorrelationId(),
          validation.errors,
          { deviceId, userId, dto },
        );
      }

      // Check for duplicates if requested
      const duplicateCheck = await this.checkForDuplicates(
        deviceId,
        new Date(dto.measurement_timestamp),
      );
      
      if (duplicateCheck.exists) {
        this.logger.warn(
          `Potential duplicate measurement detected for device ${deviceId}`,
          {
            deviceId,
            userId,
            timestamp: dto.measurement_timestamp,
            existingMeasurement: duplicateCheck.existingMeasurement?.id,
            timeDifference: duplicateCheck.timeDifference,
          },
        );
        
        // Optionally throw error or warn based on configuration
        const allowDuplicates = this.configService.get<boolean>('manual-measurements.allowDuplicates', false);
        if (!allowDuplicates) {
          throw new DuplicateMeasurementException(
            'A measurement already exists for this device around the specified time',
            this.generateCorrelationId(),
            JSON.stringify(duplicateCheck),
          );
        }
      }

      // Create the measurement
      const measurement = await this.repository.create(dto, userId, deviceId);

      this.logger.debug(
        `Created manual measurement for device ${deviceId}`,
        {
          measurementId: measurement.id,
          deviceId,
          userId,
          timestamp: dto.measurement_timestamp,
          hasComparison: dto.compare_with_sensor,
        },
      );

      // Generate comparison if requested
      let comparison: MeasurementComparisonResponseDto | undefined;
      if (dto.compare_with_sensor) {
        try {
          const report = await this.comparisonService.generateComparisonReport(measurement);
          comparison = this.mapComparisonReportToDto(report);
          
          this.logger.debug(
            `Generated comparison for measurement ${measurement.id}`,
            {
              measurementId: measurement.id,
              deviceId,
              overallAccuracy: report.overall_accuracy,
              accuracyScore: report.accuracy_score,
            },
          );
        } catch (error) {
          // Log comparison error but don't fail the measurement creation
          this.logger.warn(
            `Failed to generate comparison for measurement ${measurement.id}`,
            {
              error: error.message,
              measurementId: measurement.id,
              deviceId,
            },
          );
        }
      }

      return {
        measurement,
        comparison,
      };

    } catch (error) {
      this.logger.error(
        `Failed to create manual measurement for device ${deviceId}`,
        {
          error: error.message,
          deviceId,
          userId,
          dto,
        },
      );

      if (error instanceof ManualMeasurementNotFoundException ||
          error instanceof MeasurementValidationException ||
          error instanceof DuplicateMeasurementException ||
          error instanceof DeviceAccessDeniedException) {
        throw error;
      }

      throw new DatabaseOperationException(
        'CREATE',
        error as Error,
        this.generateCorrelationId(),
        { deviceId, userId, dto },
      );
    }
  }

  /**
   * Find all manual measurements for a device with pagination and filtering
   */
  async findAll(
    userId: string,
    deviceId: string,
    query: ManualMeasurementQueryDto,
  ): Promise<PaginatedResult<ManualMeasurement>> {
    try {
      // Validate device access
      await this.validateDeviceAccess(userId, deviceId);

      const result = await this.repository.findByDeviceId(deviceId, {
        page: query.page || 1,
        limit: query.limit || 20,
        sortBy: query.sortBy || 'measurement_timestamp',
        sortOrder: query.sortOrder || 'DESC',
        includeRelations: query.include_comparison || false,
      });

      this.logger.debug(
        `Retrieved ${result.data.length} manual measurements for device ${deviceId}`,
        {
          deviceId,
          userId,
          total: result.total,
          page: result.page,
          filters: {
            startDate: query.startDate,
            endDate: query.endDate,
            measurementType: query.measurement_type,
            search: query.search,
          },
        },
      );

      return result;

    } catch (error) {
      this.logger.error(
        `Failed to retrieve manual measurements for device ${deviceId}`,
        {
          error: error.message,
          deviceId,
          userId,
          query,
        },
      );

      if (error instanceof DeviceAccessDeniedException) {
        throw error;
      }

      throw new DatabaseOperationException(
        'READ',
        error as Error,
        this.generateCorrelationId(),
        { deviceId, userId, query },
      );
    }
  }

  /**
   * Find a single manual measurement by ID with access control
   */
  async findOne(userId: string, id: string): Promise<ManualMeasurement> {
    try {
      const measurement = await this.repository.findById(id, true);
      
      // Validate device access
      await this.validateDeviceAccess(userId, measurement.device_id);

      this.logger.debug(
        `Retrieved manual measurement ${id}`,
        {
          measurementId: id,
          deviceId: measurement.device_id,
          userId,
        },
      );

      return measurement;

    } catch (error) {
      this.logger.error(
        `Failed to retrieve manual measurement ${id}`,
        {
          error: error.message,
          measurementId: id,
          userId,
        },
      );

      if (error instanceof ManualMeasurementNotFoundException ||
          error instanceof DeviceAccessDeniedException) {
        throw error;
      }

      throw new DatabaseOperationException(
        'READ',
        error as Error,
        this.generateCorrelationId(),
        { measurementId: id, userId },
      );
    }
  }

  /**
   * Compare a manual measurement with sensor data on demand
   */
  async compareWithSensorData(
    userId: string,
    measurementId: string,
    timeWindowMinutes: number = 5,
  ): Promise<MeasurementComparisonResponseDto> {
    try {
      const measurement = await this.findOne(userId, measurementId);

      const report = await this.comparisonService.generateComparisonReport(
        measurement,
        timeWindowMinutes,
        false, // Don't use cache for on-demand comparisons
      );

      this.logger.debug(
        `Generated on-demand comparison for measurement ${measurementId}`,
        {
          measurementId,
          deviceId: measurement.device_id,
          userId,
          timeWindow: timeWindowMinutes,
          overallAccuracy: report.overall_accuracy,
        },
      );

      return this.mapComparisonReportToDto(report);

    } catch (error) {
      this.logger.error(
        `Failed to generate comparison for measurement ${measurementId}`,
        {
          error: error.message,
          measurementId,
          userId,
          timeWindow: timeWindowMinutes,
        },
      );

      if (error instanceof ManualMeasurementNotFoundException ||
          error instanceof DeviceAccessDeniedException) {
        throw error;
      }

      throw new ComparisonFailedException(
        `Failed to compare measurement ${measurementId}: ${error.message}`,
        this.generateCorrelationId(),
        { measurementId, userId, timeWindow: timeWindowMinutes },
      );
    }
  }

  /**
   * Validate measurement values against biological and technical ranges
   */
  async validateMeasurementValues(dto: CreateManualMeasurementDto): Promise<ValidationResult> {
    const errors: Record<string, string[]> = {};
    const warnings: Record<string, string[]> = {};

    try {
      // Validate temperature
      if (dto.temperature !== null && dto.temperature !== undefined) {
        if (dto.temperature < this.SENSOR_RANGES.temperature.min || 
            dto.temperature > this.SENSOR_RANGES.temperature.max) {
          errors.temperature = [`Temperature must be between ${this.SENSOR_RANGES.temperature.min}°C and ${this.SENSOR_RANGES.temperature.max}°C`];
        } else if (dto.temperature < this.SENSOR_RANGES.temperature.optimal.min || 
                   dto.temperature > this.SENSOR_RANGES.temperature.optimal.max) {
          warnings.temperature = [`Temperature ${dto.temperature}°C is outside optimal range (${this.SENSOR_RANGES.temperature.optimal.min}°C - ${this.SENSOR_RANGES.temperature.optimal.max}°C)`];
        }
      }

      // Validate pH
      if (dto.ph !== null && dto.ph !== undefined) {
        if (dto.ph < this.SENSOR_RANGES.ph.min || dto.ph > this.SENSOR_RANGES.ph.max) {
          errors.ph = [`pH must be between ${this.SENSOR_RANGES.ph.min} and ${this.SENSOR_RANGES.ph.max}`];
        } else if (dto.ph < this.SENSOR_RANGES.ph.optimal.min || 
                   dto.ph > this.SENSOR_RANGES.ph.optimal.max) {
          warnings.ph = [`pH ${dto.ph} is outside optimal range (${this.SENSOR_RANGES.ph.optimal.min} - ${this.SENSOR_RANGES.ph.optimal.max})`];
        }
      }

      // Validate TDS
      if (dto.tds !== null && dto.tds !== undefined) {
        if (dto.tds < this.SENSOR_RANGES.tds.min || dto.tds > this.SENSOR_RANGES.tds.max) {
          errors.tds = [`TDS must be between ${this.SENSOR_RANGES.tds.min} ppm and ${this.SENSOR_RANGES.tds.max} ppm`];
        } else if (dto.tds < this.SENSOR_RANGES.tds.optimal.min || 
                   dto.tds > this.SENSOR_RANGES.tds.optimal.max) {
          warnings.tds = [`TDS ${dto.tds} ppm is outside optimal range (${this.SENSOR_RANGES.tds.optimal.min} ppm - ${this.SENSOR_RANGES.tds.optimal.max} ppm)`];
        }
      }

      // Validate DO level
      if (dto.do_level !== null && dto.do_level !== undefined) {
        if (dto.do_level < this.SENSOR_RANGES.do_level.min || 
            dto.do_level > this.SENSOR_RANGES.do_level.max) {
          errors.do_level = [`DO level must be between ${this.SENSOR_RANGES.do_level.min} mg/L and ${this.SENSOR_RANGES.do_level.max} mg/L`];
        } else if (dto.do_level < this.SENSOR_RANGES.do_level.optimal.min || 
                   dto.do_level > this.SENSOR_RANGES.do_level.optimal.max) {
          warnings.do_level = [`DO level ${dto.do_level} mg/L is outside optimal range (${this.SENSOR_RANGES.do_level.optimal.min} mg/L - ${this.SENSOR_RANGES.do_level.optimal.max} mg/L)`];
        }
      }

      // Validate timestamp
      const measurementDate = new Date(dto.measurement_timestamp);
      const now = new Date();
      const maxAge = this.MAX_MEASUREMENT_AGE_DAYS * 24 * 60 * 60 * 1000;
      
      if (measurementDate > now) {
        errors.measurement_timestamp = ['Measurement timestamp cannot be in the future'];
      } else if (now.getTime() - measurementDate.getTime() > maxAge) {
        warnings.measurement_timestamp = [`Measurement is older than ${this.MAX_MEASUREMENT_AGE_DAYS} days`];
      }

      // Validate at least one sensor value is provided
      if (!dto.temperature && !dto.ph && !dto.tds && !dto.do_level) {
        errors.values = ['At least one sensor value must be provided'];
      }

      const result: ValidationResult = {
        isValid: Object.keys(errors).length === 0,
        errors,
        warnings,
      };

      this.logger.debug(
        `Validated measurement values`,
        {
          isValid: result.isValid,
          errorCount: Object.keys(errors).length,
          warningCount: Object.keys(warnings).length,
          dto,
        },
      );

      return result;

    } catch (error) {
      this.logger.error(
        `Failed to validate measurement values`,
        {
          error: error.message,
          dto,
        },
      );

      return {
        isValid: false,
        errors: { validation: ['Failed to validate measurement values'] },
        warnings: {},
      };
    }
  }

  /**
   * Check for duplicate measurements within tolerance window
   */
  async checkForDuplicates(
    deviceId: string,
    timestamp: Date,
    toleranceMinutes: number = this.DUPLICATE_TOLERANCE_MINUTES,
  ): Promise<DuplicateCheckResult> {
    try {
      const duplicateCheck = await this.repository.checkDuplicates(
        deviceId,
        timestamp,
        toleranceMinutes,
      );

      if (duplicateCheck.exists && duplicateCheck.existingMeasurement) {
        const timeDifference = Math.abs(
          duplicateCheck.existingMeasurement.measurement_timestamp.getTime() - timestamp.getTime()
        ) / (60 * 1000); // Convert to minutes

        const result: DuplicateCheckResult = {
          exists: true,
          existingMeasurement: duplicateCheck.existingMeasurement,
          timeDifference,
          recommendation: timeDifference < 1 
            ? 'Consider updating the existing measurement instead of creating a new one'
            : 'Review if both measurements are necessary',
        };

        this.logger.debug(
          `Duplicate measurement detected for device ${deviceId}`,
          {
            deviceId,
            requestedTimestamp: timestamp.toISOString(),
            existingTimestamp: duplicateCheck.existingMeasurement.measurement_timestamp.toISOString(),
            timeDifference,
          },
        );

        return result;
      }

      return { exists: false };

    } catch (error) {
      this.logger.error(
        `Failed to check for duplicate measurements`,
        {
          error: error.message,
          deviceId,
          timestamp: timestamp.toISOString(),
        },
      );

      // Return false to allow measurement creation if duplicate check fails
      return { exists: false };
    }
  }

  // Private helper methods

  /**
   * Validate that the user has access to the specified device
   */
  private async validateDeviceAccess(userId: string, deviceId: string): Promise<void> {
    try {
      // Create a user object for device access check
      const user = { id: userId, role: 'USER' } as any;
      
      // This will throw ForbiddenException if access is denied
      await this.devicesService.findOne(deviceId, user);
    } catch (error) {
      if (error.status === 403 || error.status === 404) {
        throw new DeviceAccessDeniedException(
          deviceId,
          userId,
          this.generateCorrelationId(),
        );
      }

      this.logger.error(
        `Failed to validate device access`,
        {
          error: error.message,
          userId,
          deviceId,
        },
      );

      throw new DeviceAccessDeniedException(
        deviceId,
        userId,
        this.generateCorrelationId(),
      );
    }
  }

  /**
   * Map comparison report to DTO format
   */
  private mapComparisonReportToDto(report: any): MeasurementComparisonResponseDto {
    return {
      manual_measurement_id: report.manual_measurement_id,
      device_id: report.device_id,
      manual_timestamp: new Date(report.manual_timestamp),
      sensor_data_available: report.sensor_data_available || false,
      sensor_timestamp: report.sensor_timestamp ? new Date(report.sensor_timestamp) : null,
      time_difference_minutes: report.time_difference_minutes || null,
      search_window_minutes: report.search_window_minutes || 5,
      manual_values: {
        temperature: report.temperature?.manual_value,
        ph: report.ph?.manual_value,
        tds: report.tds?.manual_value,
        do_level: report.do_level?.manual_value,
      },
      sensor_values: report.sensor_data_available ? {
        temperature: report.temperature?.sensor_value,
        ph: report.ph?.sensor_value,
        tds: report.tds?.sensor_value,
        do_level: report.do_level?.sensor_value,
      } : null,
      absolute_differences: report.sensor_data_available ? {
        temperature: report.temperature?.absolute_difference,
        ph: report.ph?.absolute_difference,
        tds: report.tds?.absolute_difference,
        do_level: report.do_level?.absolute_difference,
      } : null,
      percentage_differences: report.sensor_data_available ? {
        temperature: report.temperature?.percentage_difference,
        ph: report.ph?.percentage_difference,
        tds: report.tds?.percentage_difference,
        do_level: report.do_level?.percentage_difference,
      } : null,
      accuracy_assessment: report.overall_accuracy || 'UNKNOWN',
      flags: report.flags || [],
      summary: report.summary || 'Comparison completed',
      recommendations: report.recommendations || [],
      compared_at: new Date(),
      comparison_quality_score: report.accuracy_score || 0,
    };
  }

  /**
   * Generate correlation ID for tracking
   */
  private generateCorrelationId(): string {
    return `mm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
