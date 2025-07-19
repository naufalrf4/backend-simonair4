import {
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
  UnprocessableEntityException,
  InternalServerErrorException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';

/**
 * Base exception class for all fish growth related exceptions
 */
export abstract class FishGrowthException extends HttpException {
  public readonly correlationId: string;
  public readonly timestamp: Date;
  public readonly context: Record<string, any>;

  constructor(
    message: string,
    statusCode: HttpStatus,
    correlationId?: string,
    context?: Record<string, any>,
  ) {
    super(message, statusCode);
    this.correlationId = correlationId || this.generateCorrelationId();
    this.timestamp = new Date();
    this.context = context || {};
  }

  private generateCorrelationId(): string {
    return `fish-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  public getErrorResponse() {
    return {
      statusCode: this.getStatus(),
      timestamp: this.timestamp.toISOString(),
      error: this.constructor.name,
      message: this.message,
      correlationId: this.correlationId,
      context: this.context,
    };
  }
}

/**
 * Thrown when a fish growth record is not found
 */
export class FishGrowthNotFoundException extends FishGrowthException {
  constructor(
    identifier: string,
    correlationId?: string,
    context?: Record<string, any>,
  ) {
    super(
      `Fish growth record with identifier "${identifier}" not found`,
      HttpStatus.NOT_FOUND,
      correlationId,
      { identifier, ...context },
    );
  }
}

/**
 * Thrown when a fish growth record is not found by device and date
 */
export class FishGrowthNotFoundByDeviceException extends FishGrowthException {
  constructor(
    deviceId: string,
    date: string,
    correlationId?: string,
    context?: Record<string, any>,
  ) {
    super(
      `Fish growth record for device "${deviceId}" on date "${date}" not found`,
      HttpStatus.NOT_FOUND,
      correlationId,
      { deviceId, date, ...context },
    );
  }
}

/**
 * Thrown when measurement date is invalid (e.g., future date)
 */
export class InvalidMeasurementDateException extends FishGrowthException {
  constructor(
    date: string,
    reason: string,
    correlationId?: string,
    context?: Record<string, any>,
  ) {
    super(
      `Invalid measurement date: ${date}. ${reason}`,
      HttpStatus.BAD_REQUEST,
      correlationId,
      { date, reason, ...context },
    );
  }
}

/**
 * Thrown when measurement values are invalid
 */
export class InvalidMeasurementValueException extends FishGrowthException {
  constructor(
    field: string,
    value: any,
    reason: string,
    correlationId?: string,
    context?: Record<string, any>,
  ) {
    super(
      `Invalid measurement value for ${field}: ${value}. ${reason}`,
      HttpStatus.BAD_REQUEST,
      correlationId,
      { field, value, reason, ...context },
    );
  }
}

/**
 * Thrown when measurement combination is biologically implausible
 */
export class BiologicallyImplausibleMeasurementException extends FishGrowthException {
  constructor(
    length: number,
    weight: number,
    correlationId?: string,
    context?: Record<string, any>,
  ) {
    super(
      `Biologically implausible measurement combination: length=${length}cm, weight=${weight}g`,
      HttpStatus.BAD_REQUEST,
      correlationId,
      { length, weight, ...context },
    );
  }
}

/**
 * Thrown when a duplicate measurement exists for the same device and date
 */
export class DuplicateMeasurementException extends FishGrowthException {
  constructor(
    deviceId: string,
    date: string,
    existingId?: string,
    correlationId?: string,
    context?: Record<string, any>,
  ) {
    super(
      `Measurement already exists for device "${deviceId}" on date "${date}"`,
      HttpStatus.CONFLICT,
      correlationId,
      { deviceId, date, existingId, ...context },
    );
  }
}

/**
 * Thrown when user doesn't have access to the device
 */
export class DeviceAccessDeniedException extends FishGrowthException {
  constructor(
    deviceId: string,
    userId: string,
    correlationId?: string,
    context?: Record<string, any>,
  ) {
    super(
      `Access denied to device "${deviceId}" for user "${userId}"`,
      HttpStatus.FORBIDDEN,
      correlationId,
      { deviceId, userId, ...context },
    );
  }
}

/**
 * Thrown when device is not found
 */
export class DeviceNotFoundException extends FishGrowthException {
  constructor(
    deviceId: string,
    correlationId?: string,
    context?: Record<string, any>,
  ) {
    super(
      `Device "${deviceId}" not found`,
      HttpStatus.NOT_FOUND,
      correlationId,
      { deviceId, ...context },
    );
  }
}

/**
 * Thrown when insufficient data exists for analytics
 */
export class InsufficientDataException extends FishGrowthException {
  constructor(
    operation: string,
    required: number,
    available: number,
    correlationId?: string,
    context?: Record<string, any>,
  ) {
    super(
      `Insufficient data for ${operation}: requires ${required} records, available ${available}`,
      HttpStatus.BAD_REQUEST,
      correlationId,
      { operation, required, available, ...context },
    );
  }
}

/**
 * Thrown when analytics calculation fails
 */
export class AnalyticsCalculationException extends FishGrowthException {
  constructor(
    operation: string,
    error: string,
    correlationId?: string,
    context?: Record<string, any>,
  ) {
    super(
      `Analytics calculation failed for ${operation}: ${error}`,
      HttpStatus.UNPROCESSABLE_ENTITY,
      correlationId,
      { operation, error, ...context },
    );
  }
}

/**
 * Thrown when bulk operation fails
 */
export class BulkOperationException extends FishGrowthException {
  constructor(
    operation: string,
    successful: number,
    failed: number,
    errors: string[],
    correlationId?: string,
    context?: Record<string, any>,
  ) {
    super(
      `Bulk ${operation} partially failed: ${successful} successful, ${failed} failed`,
      HttpStatus.UNPROCESSABLE_ENTITY,
      correlationId,
      { operation, successful, failed, errors, ...context },
    );
  }
}

/**
 * Thrown when export operation fails
 */
export class ExportOperationException extends FishGrowthException {
  constructor(
    format: string,
    error: string,
    correlationId?: string,
    context?: Record<string, any>,
  ) {
    super(
      `Export to ${format} failed: ${error}`,
      HttpStatus.INTERNAL_SERVER_ERROR,
      correlationId,
      { format, error, ...context },
    );
  }
}

/**
 * Thrown when data integrity check fails
 */
export class DataIntegrityException extends FishGrowthException {
  constructor(
    check: string,
    details: string,
    correlationId?: string,
    context?: Record<string, any>,
  ) {
    super(
      `Data integrity check failed for ${check}: ${details}`,
      HttpStatus.UNPROCESSABLE_ENTITY,
      correlationId,
      { check, details, ...context },
    );
  }
}

/**
 * Thrown when calculation fails (biomass, condition indicator, etc.)
 */
export class CalculationException extends FishGrowthException {
  constructor(
    calculation: string,
    inputs: Record<string, any>,
    error: string,
    correlationId?: string,
    context?: Record<string, any>,
  ) {
    super(
      `Calculation failed for ${calculation}: ${error}`,
      HttpStatus.UNPROCESSABLE_ENTITY,
      correlationId,
      { calculation, inputs, error, ...context },
    );
  }
}

/**
 * Thrown when database operation fails
 */
export class DatabaseOperationException extends FishGrowthException {
  constructor(
    operation: string,
    error: string,
    correlationId?: string,
    context?: Record<string, any>,
  ) {
    super(
      `Database operation failed: ${operation} - ${error}`,
      HttpStatus.INTERNAL_SERVER_ERROR,
      correlationId,
      { operation, error, ...context },
    );
  }
}

/**
 * Thrown when external service integration fails
 */
export class ExternalServiceException extends FishGrowthException {
  constructor(
    service: string,
    operation: string,
    error: string,
    correlationId?: string,
    context?: Record<string, any>,
  ) {
    super(
      `External service ${service} failed for ${operation}: ${error}`,
      HttpStatus.SERVICE_UNAVAILABLE,
      correlationId,
      { service, operation, error, ...context },
    );
  }
}

/**
 * Thrown when concurrent access conflict occurs
 */
export class ConcurrentAccessException extends FishGrowthException {
  constructor(
    resource: string,
    operation: string,
    correlationId?: string,
    context?: Record<string, any>,
  ) {
    super(
      `Concurrent access conflict for ${resource} during ${operation}`,
      HttpStatus.CONFLICT,
      correlationId,
      { resource, operation, ...context },
    );
  }
}

/**
 * Thrown when rate limit is exceeded
 */
export class RateLimitExceededException extends FishGrowthException {
  constructor(
    operation: string,
    limit: number,
    window: string,
    correlationId?: string,
    context?: Record<string, any>,
  ) {
    super(
      `Rate limit exceeded for ${operation}: ${limit} requests per ${window}`,
      HttpStatus.TOO_MANY_REQUESTS,
      correlationId,
      { operation, limit, window, ...context },
    );
  }
}

/**
 * Thrown when cache operation fails
 */
export class CacheOperationException extends FishGrowthException {
  constructor(
    operation: string,
    key: string,
    error: string,
    correlationId?: string,
    context?: Record<string, any>,
  ) {
    super(
      `Cache operation failed: ${operation} for key ${key} - ${error}`,
      HttpStatus.INTERNAL_SERVER_ERROR,
      correlationId,
      { operation, key, error, ...context },
    );
  }
}

/**
 * Thrown when background job fails
 */
export class BackgroundJobException extends FishGrowthException {
  constructor(
    jobType: string,
    jobId: string,
    error: string,
    correlationId?: string,
    context?: Record<string, any>,
  ) {
    super(
      `Background job ${jobType} (${jobId}) failed: ${error}`,
      HttpStatus.INTERNAL_SERVER_ERROR,
      correlationId,
      { jobType, jobId, error, ...context },
    );
  }
}

/**
 * Thrown when an export job is not found
 */
export class ExportNotFoundException extends FishGrowthException {
  constructor(
    message: string,
    jobId?: string,
    correlationId?: string,
    context?: Record<string, any>,
  ) {
    super(
      message,
      HttpStatus.NOT_FOUND,
      correlationId,
      { jobId, ...context },
    );
  }
}

/**
 * Thrown when an export format is not supported
 */
export class ExportFormatNotSupportedException extends FishGrowthException {
  constructor(
    format: string,
    correlationId?: string,
    context?: Record<string, any>,
  ) {
    super(
      `Export format "${format}" is not supported`,
      HttpStatus.BAD_REQUEST,
      correlationId,
      { format, supportedFormats: ['csv', 'excel', 'json', 'pdf'], ...context },
    );
  }
}

/**
 * Thrown when export generation fails
 */
export class ExportGenerationException extends FishGrowthException {
  constructor(
    format: string,
    error: string,
    correlationId?: string,
    context?: Record<string, any>,
  ) {
    super(
      `Failed to generate ${format} export: ${error}`,
      HttpStatus.INTERNAL_SERVER_ERROR,
      correlationId,
      { format, error, ...context },
    );
  }
}
