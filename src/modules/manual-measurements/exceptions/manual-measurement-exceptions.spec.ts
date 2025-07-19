import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus } from '@nestjs/common';
import {
  ManualMeasurementException,
  MeasurementValidationException,
  SensorValueOutOfRangeException,
  BiologicallyImplausibleException,
  DuplicateMeasurementException,
  FutureMeasurementException,
  DeviceAccessDeniedException,
  DeviceNotFoundException,
  ManualMeasurementNotFoundException,
  ComparisonFailedException,
  SensorDataNotAvailableException,
  ExportFailedException,
  DatabaseOperationException,
  RateLimitExceededException,
  MeasurementDiscrepancyException,
  DataQualityException,
  ExternalServiceException,
  ManualMeasurementExceptionFactory,
} from './manual-measurement.exceptions';
import { ManualMeasurementErrorService } from './manual-measurement-error.service';

describe('Manual Measurement Exceptions', () => {
  let errorService: ManualMeasurementErrorService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ManualMeasurementErrorService],
    }).compile();

    errorService = module.get<ManualMeasurementErrorService>(ManualMeasurementErrorService);
  });

  describe('Exception Creation and Properties', () => {
    it('should create MeasurementValidationException with proper properties', () => {
      const correlationId = 'test-correlation-id';
      const validationErrors = {
        temperature: ['Temperature must be between 0 and 50'],
        ph: ['pH must be between 0 and 14'],
      };

      const exception = new MeasurementValidationException(
        'Validation failed',
        correlationId,
        validationErrors,
        { userId: 'user-123' },
      );

      expect(exception.message).toBe('Validation failed');
      expect(exception.getStatus()).toBe(HttpStatus.BAD_REQUEST);
      expect(exception.correlationId).toBe(correlationId);
      expect(exception.context.validationErrors).toEqual(validationErrors);
      expect(exception.context.userId).toBe('user-123');
      expect(exception.timestamp).toBeInstanceOf(Date);
    });

    it('should create SensorValueOutOfRangeException with proper properties', () => {
      const correlationId = 'test-correlation-id';
      const exception = new SensorValueOutOfRangeException(
        'temperature',
        60,
        0,
        50,
        correlationId,
        { deviceId: 'device-123' },
      );

      expect(exception.message).toBe('temperature value 60 is outside acceptable range (0 - 50)');
      expect(exception.getStatus()).toBe(HttpStatus.BAD_REQUEST);
      expect(exception.context.sensorType).toBe('temperature');
      expect(exception.context.value).toBe(60);
      expect(exception.context.minValue).toBe(0);
      expect(exception.context.maxValue).toBe(50);
    });

    it('should create BiologicallyImplausibleException with proper properties', () => {
      const correlationId = 'test-correlation-id';
      const measurements = { temperature: 40, ph: 2, do_level: 20 };
      const reason = 'Extremely high temperature with very low pH and high DO level';

      const exception = new BiologicallyImplausibleException(
        measurements,
        reason,
        correlationId,
      );

      expect(exception.message).toBe(`Biologically implausible measurement combination: ${reason}`);
      expect(exception.getStatus()).toBe(HttpStatus.BAD_REQUEST);
      expect(exception.context.measurements).toEqual(measurements);
      expect(exception.context.reason).toBe(reason);
    });

    it('should create DuplicateMeasurementException with proper properties', () => {
      const correlationId = 'test-correlation-id';
      const deviceId = 'device-123';
      const timestamp = '2024-01-15T10:30:00Z';

      const exception = new DuplicateMeasurementException(
        deviceId,
        timestamp,
        correlationId,
      );

      expect(exception.message).toBe(`Manual measurement already exists for device ${deviceId} at timestamp ${timestamp}`);
      expect(exception.getStatus()).toBe(HttpStatus.CONFLICT);
      expect(exception.context.deviceId).toBe(deviceId);
      expect(exception.context.timestamp).toBe(timestamp);
    });

    it('should create FutureMeasurementException with proper properties', () => {
      const correlationId = 'test-correlation-id';
      const futureTimestamp = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

      const exception = new FutureMeasurementException(
        futureTimestamp,
        correlationId,
      );

      expect(exception.message).toBe(`Measurement timestamp cannot be in the future: ${futureTimestamp}`);
      expect(exception.getStatus()).toBe(HttpStatus.BAD_REQUEST);
      expect(exception.context.timestamp).toBe(futureTimestamp);
    });

    it('should create DeviceAccessDeniedException with proper properties', () => {
      const correlationId = 'test-correlation-id';
      const deviceId = 'device-123';
      const userId = 'user-456';

      const exception = new DeviceAccessDeniedException(
        deviceId,
        userId,
        correlationId,
      );

      expect(exception.message).toBe(`User ${userId} does not have access to device ${deviceId}`);
      expect(exception.getStatus()).toBe(HttpStatus.FORBIDDEN);
      expect(exception.context.deviceId).toBe(deviceId);
      expect(exception.context.userId).toBe(userId);
    });

    it('should create ComparisonFailedException with proper properties', () => {
      const correlationId = 'test-correlation-id';
      const reason = 'Sensor data service unavailable';

      const exception = new ComparisonFailedException(
        reason,
        correlationId,
        { retryAttempts: 3 },
      );

      expect(exception.message).toBe(`Sensor data comparison failed: ${reason}`);
      expect(exception.getStatus()).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(exception.context.reason).toBe(reason);
      expect(exception.context.retryAttempts).toBe(3);
    });

    it('should create DatabaseOperationException with proper properties', () => {
      const correlationId = 'test-correlation-id';
      const operation = 'INSERT';
      const error = new Error('Connection timeout');

      const exception = new DatabaseOperationException(
        operation,
        error,
        correlationId,
      );

      expect(exception.message).toBe(`Database operation '${operation}' failed: ${error.message}`);
      expect(exception.getStatus()).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(exception.context.operation).toBe(operation);
      expect(exception.context.originalError).toBe(error.message);
    });

    it('should create RateLimitExceededException with proper properties', () => {
      const correlationId = 'test-correlation-id';
      const userId = 'user-123';
      const operation = 'CREATE_MEASUREMENT';
      const limit = 10;
      const timeWindow = 60;

      const exception = new RateLimitExceededException(
        userId,
        operation,
        limit,
        timeWindow,
        correlationId,
      );

      expect(exception.message).toBe(`Rate limit exceeded: ${limit} ${operation} operations allowed per ${timeWindow} seconds`);
      expect(exception.getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);
      expect(exception.context.userId).toBe(userId);
      expect(exception.context.operation).toBe(operation);
      expect(exception.context.limit).toBe(limit);
      expect(exception.context.timeWindow).toBe(timeWindow);
    });

    it('should create MeasurementDiscrepancyException with proper properties', () => {
      const correlationId = 'test-correlation-id';
      const measurementType = 'temperature';
      const manualValue = 30;
      const sensorValue = 25;
      const discrepancyPercentage = 20;
      const threshold = 15;

      const exception = new MeasurementDiscrepancyException(
        measurementType,
        manualValue,
        sensorValue,
        discrepancyPercentage,
        threshold,
        correlationId,
      );

      expect(exception.message).toBe(`Significant discrepancy detected: ${measurementType} manual value ${manualValue} differs from sensor value ${sensorValue} by ${discrepancyPercentage}% (threshold: ${threshold}%)`);
      expect(exception.getStatus()).toBe(HttpStatus.UNPROCESSABLE_ENTITY);
      expect(exception.context.measurementType).toBe(measurementType);
      expect(exception.context.manualValue).toBe(manualValue);
      expect(exception.context.sensorValue).toBe(sensorValue);
      expect(exception.context.discrepancyPercentage).toBe(discrepancyPercentage);
      expect(exception.context.threshold).toBe(threshold);
    });
  });

  describe('ManualMeasurementExceptionFactory', () => {
    it('should generate unique correlation IDs', () => {
      const id1 = ManualMeasurementExceptionFactory.generateCorrelationId();
      const id2 = ManualMeasurementExceptionFactory.generateCorrelationId();

      expect(id1).toBeDefined();
      expect(id2).toBeDefined();
      expect(id1).not.toBe(id2);
      expect(id1).toMatch(/^mm-\d+-[a-z0-9]+$/);
    });

    it('should create validation exception using factory', () => {
      const validationErrors = { temperature: ['Invalid temperature'] };
      const exception = ManualMeasurementExceptionFactory.createValidationException(
        'Validation failed',
        validationErrors,
        { userId: 'user-123' },
      );

      expect(exception).toBeInstanceOf(MeasurementValidationException);
      expect(exception.message).toBe('Validation failed');
      expect(exception.context.validationErrors).toEqual(validationErrors);
      expect(exception.context.userId).toBe('user-123');
    });

    it('should create sensor value out of range exception using factory', () => {
      const exception = ManualMeasurementExceptionFactory.createSensorValueOutOfRangeException(
        'pH',
        15,
        0,
        14,
        { deviceId: 'device-123' },
      );

      expect(exception).toBeInstanceOf(SensorValueOutOfRangeException);
      expect(exception.context.sensorType).toBe('pH');
      expect(exception.context.value).toBe(15);
      expect(exception.context.deviceId).toBe('device-123');
    });

    it('should create duplicate measurement exception using factory', () => {
      const exception = ManualMeasurementExceptionFactory.createDuplicateMeasurementException(
        'device-123',
        '2024-01-15T10:30:00Z',
        { userId: 'user-123' },
      );

      expect(exception).toBeInstanceOf(DuplicateMeasurementException);
      expect(exception.context.deviceId).toBe('device-123');
      expect(exception.context.timestamp).toBe('2024-01-15T10:30:00Z');
      expect(exception.context.userId).toBe('user-123');
    });

    it('should create device access denied exception using factory', () => {
      const exception = ManualMeasurementExceptionFactory.createDeviceAccessDeniedException(
        'device-123',
        'user-456',
        { attemptedOperation: 'CREATE_MEASUREMENT' },
      );

      expect(exception).toBeInstanceOf(DeviceAccessDeniedException);
      expect(exception.context.deviceId).toBe('device-123');
      expect(exception.context.userId).toBe('user-456');
      expect(exception.context.attemptedOperation).toBe('CREATE_MEASUREMENT');
    });

    it('should create comparison failed exception using factory', () => {
      const exception = ManualMeasurementExceptionFactory.createComparisonFailedException(
        'Network timeout',
        { retryAttempts: 2 },
      );

      expect(exception).toBeInstanceOf(ComparisonFailedException);
      expect(exception.context.reason).toBe('Network timeout');
      expect(exception.context.retryAttempts).toBe(2);
    });

    it('should create database operation exception using factory', () => {
      const error = new Error('Connection lost');
      const exception = ManualMeasurementExceptionFactory.createDatabaseOperationException(
        'SELECT',
        error,
        { table: 'manual_measurements' },
      );

      expect(exception).toBeInstanceOf(DatabaseOperationException);
      expect(exception.context.operation).toBe('SELECT');
      expect(exception.context.originalError).toBe(error.message);
      expect(exception.context.table).toBe('manual_measurements');
    });
  });

  describe('Exception JSON Serialization', () => {
    it('should serialize exception to JSON properly', () => {
      const correlationId = 'test-correlation-id';
      const exception = new MeasurementValidationException(
        'Validation failed',
        correlationId,
        { temperature: ['Invalid value'] },
        { userId: 'user-123' },
      );

      const json = exception.toJSON();

      expect(json).toEqual({
        message: 'Validation failed',
        statusCode: HttpStatus.BAD_REQUEST,
        correlationId,
        timestamp: exception.timestamp.toISOString(),
        context: {
          validationErrors: { temperature: ['Invalid value'] },
          userId: 'user-123',
        },
        error: 'MeasurementValidationException',
      });
    });

    it('should handle empty context in JSON serialization', () => {
      const correlationId = 'test-correlation-id';
      const exception = new DeviceNotFoundException(
        'device-123',
        correlationId,
      );

      const json = exception.toJSON();

      expect(json).toHaveProperty('message');
      expect(json).toHaveProperty('statusCode');
      expect(json).toHaveProperty('correlationId');
      expect(json).toHaveProperty('timestamp');
      expect(json).toHaveProperty('context');
      expect(json).toHaveProperty('error');
      expect(json.error).toBe('DeviceNotFoundException');
    });
  });

  describe('Error Service Integration', () => {
    it('should log exception with proper context', () => {
      const exception = new MeasurementValidationException(
        'Validation failed',
        'test-correlation-id',
        { temperature: ['Invalid value'] },
        { userId: 'user-123' },
      );

      const requestContext = {
        path: '/api/manual-measurements',
        method: 'POST',
        userAgent: 'Test Agent',
        ip: '127.0.0.1',
        userId: 'user-123',
        deviceId: 'device-123',
      };

      errorService.logException(exception, requestContext);

      const errorLog = errorService.getErrorByCorrelationId('test-correlation-id');
      expect(errorLog).toBeDefined();
      expect(errorLog?.errorType).toBe('MeasurementValidationException');
      expect(errorLog?.message).toBe('Validation failed');
      expect(errorLog?.severity).toBe('low');
      expect(errorLog?.userId).toBe('user-123');
      expect(errorLog?.deviceId).toBe('device-123');
    });

    it('should track error metrics correctly', () => {
      const exception1 = new MeasurementValidationException(
        'Validation failed',
        'test-1',
        { temperature: ['Invalid value'] },
      );

      const exception2 = new DeviceNotFoundException(
        'device-123',
        'test-2',
      );

      const requestContext = {
        path: '/api/manual-measurements',
        method: 'POST',
        userAgent: 'Test Agent',
        ip: '127.0.0.1',
      };

      errorService.logException(exception1, requestContext);
      errorService.logException(exception2, requestContext);

      const metrics = errorService.getErrorMetrics();
      expect(metrics.totalErrors).toBe(2);
      expect(metrics.errorsByType['MeasurementValidationException']).toBe(1);
      expect(metrics.errorsByType['DeviceNotFoundException']).toBe(1);
      expect(metrics.errorsByStatus[HttpStatus.BAD_REQUEST]).toBe(1);
      expect(metrics.errorsByStatus[HttpStatus.NOT_FOUND]).toBe(1);
    });

    it('should filter error logs correctly', () => {
      const exception1 = new MeasurementValidationException(
        'Validation failed',
        'test-1',
        { temperature: ['Invalid value'] },
      );

      const exception2 = new DeviceAccessDeniedException(
        'device-123',
        'user-456',
        'test-2',
      );

      const requestContext = {
        path: '/api/manual-measurements',
        method: 'POST',
        userAgent: 'Test Agent',
        ip: '127.0.0.1',
      };

      errorService.logException(exception1, requestContext);
      errorService.logException(exception2, requestContext);

      const lowSeverityLogs = errorService.getErrorLogs({ severity: 'low' });
      const highSeverityLogs = errorService.getErrorLogs({ severity: 'high' });

      expect(lowSeverityLogs).toHaveLength(1);
      expect(lowSeverityLogs[0].errorType).toBe('MeasurementValidationException');
      expect(highSeverityLogs).toHaveLength(1);
      expect(highSeverityLogs[0].errorType).toBe('DeviceAccessDeniedException');
    });

    it('should mark errors as resolved', () => {
      const exception = new MeasurementValidationException(
        'Validation failed',
        'test-correlation-id',
        { temperature: ['Invalid value'] },
      );

      const requestContext = {
        path: '/api/manual-measurements',
        method: 'POST',
        userAgent: 'Test Agent',
        ip: '127.0.0.1',
      };

      errorService.logException(exception, requestContext);

      const resolved = errorService.markErrorResolved('test-correlation-id', 'admin-user');
      expect(resolved).toBe(true);

      const errorLog = errorService.getErrorByCorrelationId('test-correlation-id');
      expect(errorLog?.resolved).toBe(true);
      expect(errorLog?.context.resolvedBy).toBe('admin-user');
      expect(errorLog?.context.resolvedAt).toBeDefined();
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle exceptions with null context', () => {
      const correlationId = 'test-correlation-id';
      const exception = new MeasurementValidationException(
        'Test exception',
        correlationId,
        { field: ['error'] },
        null as any,
      );

      expect(exception.context).toEqual({
        validationErrors: { field: ['error'] },
      });
      expect(exception.correlationId).toBe(correlationId);
      expect(exception.timestamp).toBeInstanceOf(Date);
    });

    it('should handle exceptions with complex context objects', () => {
      const correlationId = 'test-correlation-id';
      const complexContext = {
        nested: {
          object: {
            with: {
              deep: 'values',
            },
          },
        },
        array: [1, 2, 3],
        boolean: true,
        number: 42,
        nullValue: null,
        undefinedValue: undefined,
      };

      const exception = new MeasurementValidationException(
        'Complex context test',
        correlationId,
        { field: ['error'] },
        complexContext,
      );

      expect(exception.context).toEqual(expect.objectContaining({
        validationErrors: { field: ['error'] },
        ...complexContext,
      }));
    });

    it('should handle very long error messages', () => {
      const longMessage = 'A'.repeat(1000);
      const correlationId = 'test-correlation-id';
      const exception = new MeasurementValidationException(
        longMessage,
        correlationId,
        { field: ['error'] },
      );

      expect(exception.message).toBe(longMessage);
      expect(exception.message.length).toBe(1000);
    });
  });
});
