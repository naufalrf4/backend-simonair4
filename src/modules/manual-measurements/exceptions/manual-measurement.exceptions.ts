import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * Base exception class for manual measurement errors
 */
export abstract class ManualMeasurementException extends HttpException {
  public readonly correlationId: string;
  public readonly timestamp: Date;
  public readonly context: Record<string, any>;

  constructor(
    message: string,
    status: HttpStatus,
    correlationId: string,
    context: Record<string, any> = {},
  ) {
    super(message, status);
    this.correlationId = correlationId;
    this.timestamp = new Date();
    this.context = context;
  }

  toJSON() {
    return {
      message: this.message,
      statusCode: this.getStatus(),
      correlationId: this.correlationId,
      timestamp: this.timestamp.toISOString(),
      context: this.context,
      error: this.constructor.name,
    };
  }
}

/**
 * Exception thrown when measurement validation fails
 */
export class MeasurementValidationException extends ManualMeasurementException {
  constructor(
    message: string,
    correlationId: string,
    validationErrors: Record<string, string[]>,
    context: Record<string, any> = {},
  ) {
    super(message, HttpStatus.BAD_REQUEST, correlationId, {
      ...context,
      validationErrors,
    });
  }
}

/**
 * Exception thrown when sensor values are outside acceptable ranges
 */
export class SensorValueOutOfRangeException extends ManualMeasurementException {
  constructor(
    sensorType: string,
    value: number,
    minValue: number,
    maxValue: number,
    correlationId: string,
    context: Record<string, any> = {},
  ) {
    const message = `${sensorType} value ${value} is outside acceptable range (${minValue} - ${maxValue})`;
    super(message, HttpStatus.BAD_REQUEST, correlationId, {
      ...context,
      sensorType,
      value,
      minValue,
      maxValue,
    });
  }
}

/**
 * Exception thrown when measurement values are biologically implausible
 */
export class BiologicallyImplausibleException extends ManualMeasurementException {
  constructor(
    measurements: Record<string, number>,
    reason: string,
    correlationId: string,
    context: Record<string, any> = {},
  ) {
    const message = `Biologically implausible measurement combination: ${reason}`;
    super(message, HttpStatus.BAD_REQUEST, correlationId, {
      ...context,
      measurements,
      reason,
    });
  }
}

/**
 * Exception thrown when attempting to create duplicate measurements
 */
export class DuplicateMeasurementException extends ManualMeasurementException {
  constructor(
    deviceId: string,
    timestamp: string,
    correlationId: string,
    context: Record<string, any> = {},
  ) {
    const message = `Manual measurement already exists for device ${deviceId} at timestamp ${timestamp}`;
    super(message, HttpStatus.CONFLICT, correlationId, {
      ...context,
      deviceId,
      timestamp,
    });
  }
}

/**
 * Exception thrown when measurement timestamp is in the future
 */
export class FutureMeasurementException extends ManualMeasurementException {
  constructor(
    timestamp: string,
    correlationId: string,
    context: Record<string, any> = {},
  ) {
    const message = `Measurement timestamp cannot be in the future: ${timestamp}`;
    super(message, HttpStatus.BAD_REQUEST, correlationId, {
      ...context,
      timestamp,
    });
  }
}

/**
 * Exception thrown when user lacks permission to access device
 */
export class DeviceAccessDeniedException extends ManualMeasurementException {
  constructor(
    deviceId: string,
    userId: string,
    correlationId: string,
    context: Record<string, any> = {},
  ) {
    const message = `User ${userId} does not have access to device ${deviceId}`;
    super(message, HttpStatus.FORBIDDEN, correlationId, {
      ...context,
      deviceId,
      userId,
    });
  }
}

/**
 * Exception thrown when device is not found
 */
export class DeviceNotFoundException extends ManualMeasurementException {
  constructor(
    deviceId: string,
    correlationId: string,
    context: Record<string, any> = {},
  ) {
    const message = `Device with ID ${deviceId} not found`;
    super(message, HttpStatus.NOT_FOUND, correlationId, {
      ...context,
      deviceId,
    });
  }
}

/**
 * Exception thrown when manual measurement is not found
 */
export class ManualMeasurementNotFoundException extends ManualMeasurementException {
  constructor(
    measurementId: string,
    correlationId: string,
    context: Record<string, any> = {},
  ) {
    const message = `Manual measurement with ID ${measurementId} not found`;
    super(message, HttpStatus.NOT_FOUND, correlationId, {
      ...context,
      measurementId,
    });
  }
}

/**
 * Exception thrown when sensor data comparison fails
 */
export class ComparisonFailedException extends ManualMeasurementException {
  constructor(
    reason: string,
    correlationId: string,
    context: Record<string, any> = {},
  ) {
    const message = `Sensor data comparison failed: ${reason}`;
    super(message, HttpStatus.INTERNAL_SERVER_ERROR, correlationId, {
      ...context,
      reason,
    });
  }
}

/**
 * Exception thrown when sensor data is not available for comparison
 */
export class SensorDataNotAvailableException extends ManualMeasurementException {
  constructor(
    deviceId: string,
    timestamp: string,
    timeWindow: number,
    correlationId: string,
    context: Record<string, any> = {},
  ) {
    const message = `No sensor data available for device ${deviceId} within ${timeWindow} minutes of ${timestamp}`;
    super(message, HttpStatus.NOT_FOUND, correlationId, {
      ...context,
      deviceId,
      timestamp,
      timeWindow,
    });
  }
}

/**
 * Exception thrown when measurement data export fails
 */
export class ExportFailedException extends ManualMeasurementException {
  constructor(
    format: string,
    reason: string,
    correlationId: string,
    context: Record<string, any> = {},
  ) {
    const message = `Export to ${format} failed: ${reason}`;
    super(message, HttpStatus.INTERNAL_SERVER_ERROR, correlationId, {
      ...context,
      format,
      reason,
    });
  }
}

/**
 * Exception thrown when database operations fail
 */
export class DatabaseOperationException extends ManualMeasurementException {
  constructor(
    operation: string,
    error: Error,
    correlationId: string,
    context: Record<string, any> = {},
  ) {
    const message = `Database operation '${operation}' failed: ${error.message}`;
    super(message, HttpStatus.INTERNAL_SERVER_ERROR, correlationId, {
      ...context,
      operation,
      originalError: error.message,
    });
  }
}

/**
 * Exception thrown when rate limiting is exceeded
 */
export class RateLimitExceededException extends ManualMeasurementException {
  constructor(
    userId: string,
    operation: string,
    limit: number,
    timeWindow: number,
    correlationId: string,
    context: Record<string, any> = {},
  ) {
    const message = `Rate limit exceeded: ${limit} ${operation} operations allowed per ${timeWindow} seconds`;
    super(message, HttpStatus.TOO_MANY_REQUESTS, correlationId, {
      ...context,
      userId,
      operation,
      limit,
      timeWindow,
    });
  }
}

/**
 * Exception thrown when measurement values show significant discrepancy with sensor data
 */
export class MeasurementDiscrepancyException extends ManualMeasurementException {
  constructor(
    measurementType: string,
    manualValue: number,
    sensorValue: number,
    discrepancyPercentage: number,
    threshold: number,
    correlationId: string,
    context: Record<string, any> = {},
  ) {
    const message = `Significant discrepancy detected: ${measurementType} manual value ${manualValue} differs from sensor value ${sensorValue} by ${discrepancyPercentage}% (threshold: ${threshold}%)`;
    super(message, HttpStatus.UNPROCESSABLE_ENTITY, correlationId, {
      ...context,
      measurementType,
      manualValue,
      sensorValue,
      discrepancyPercentage,
      threshold,
    });
  }
}

/**
 * Exception thrown when data quality issues are detected
 */
export class DataQualityException extends ManualMeasurementException {
  constructor(
    qualityIssues: string[],
    correlationId: string,
    context: Record<string, any> = {},
  ) {
    const message = `Data quality issues detected: ${qualityIssues.join(', ')}`;
    super(message, HttpStatus.UNPROCESSABLE_ENTITY, correlationId, {
      ...context,
      qualityIssues,
    });
  }
}

/**
 * Exception thrown when external service integration fails
 */
export class ExternalServiceException extends ManualMeasurementException {
  constructor(
    serviceName: string,
    operation: string,
    error: Error,
    correlationId: string,
    context: Record<string, any> = {},
  ) {
    const message = `External service ${serviceName} operation '${operation}' failed: ${error.message}`;
    super(message, HttpStatus.SERVICE_UNAVAILABLE, correlationId, {
      ...context,
      serviceName,
      operation,
      originalError: error.message,
    });
  }
}

/**
 * Exception factory for creating exceptions with correlation IDs
 */
export class ManualMeasurementExceptionFactory {
  static generateCorrelationId(): string {
    return `mm-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  static createValidationException(
    message: string,
    validationErrors: Record<string, string[]>,
    context: Record<string, any> = {},
  ): MeasurementValidationException {
    return new MeasurementValidationException(
      message,
      this.generateCorrelationId(),
      validationErrors,
      context,
    );
  }

  static createSensorValueOutOfRangeException(
    sensorType: string,
    value: number,
    minValue: number,
    maxValue: number,
    context: Record<string, any> = {},
  ): SensorValueOutOfRangeException {
    return new SensorValueOutOfRangeException(
      sensorType,
      value,
      minValue,
      maxValue,
      this.generateCorrelationId(),
      context,
    );
  }

  static createDuplicateMeasurementException(
    deviceId: string,
    timestamp: string,
    context: Record<string, any> = {},
  ): DuplicateMeasurementException {
    return new DuplicateMeasurementException(
      deviceId,
      timestamp,
      this.generateCorrelationId(),
      context,
    );
  }

  static createDeviceAccessDeniedException(
    deviceId: string,
    userId: string,
    context: Record<string, any> = {},
  ): DeviceAccessDeniedException {
    return new DeviceAccessDeniedException(
      deviceId,
      userId,
      this.generateCorrelationId(),
      context,
    );
  }

  static createComparisonFailedException(
    reason: string,
    context: Record<string, any> = {},
  ): ComparisonFailedException {
    return new ComparisonFailedException(
      reason,
      this.generateCorrelationId(),
      context,
    );
  }

  static createDatabaseOperationException(
    operation: string,
    error: Error,
    context: Record<string, any> = {},
  ): DatabaseOperationException {
    return new DatabaseOperationException(
      operation,
      error,
      this.generateCorrelationId(),
      context,
    );
  }
}
