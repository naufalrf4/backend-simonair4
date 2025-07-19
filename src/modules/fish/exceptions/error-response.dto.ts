import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsDateString, IsObject, IsOptional, IsInt } from 'class-validator';

/**
 * Base error response DTO for all fish growth exceptions
 */
export class ErrorResponseDto {
  @ApiProperty({
    description: 'HTTP status code',
    example: 400,
  })
  @IsInt()
  statusCode: number;

  @ApiProperty({
    description: 'Error timestamp in ISO format',
    example: '2024-01-15T10:30:00.000Z',
  })
  @IsDateString()
  timestamp: string;

  @ApiProperty({
    description: 'Error type/class name',
    example: 'FishGrowthNotFoundException',
  })
  @IsString()
  error: string;

  @ApiProperty({
    description: 'Error message',
    example: 'Fish growth record with identifier "123" not found',
  })
  @IsString()
  message: string;

  @ApiProperty({
    description: 'Correlation ID for tracking',
    example: 'fish-1642248600000-abc123def',
  })
  @IsString()
  correlationId: string;

  @ApiProperty({
    description: 'Additional error context',
    example: { identifier: '123', deviceId: 'device-456' },
    required: false,
  })
  @IsOptional()
  @IsObject()
  context?: Record<string, any>;
}

/**
 * Validation error response DTO for fish growth validation exceptions
 */
export class ValidationErrorResponseDto extends ErrorResponseDto {
  @ApiProperty({
    description: 'Detailed validation errors',
    type: 'array',
    items: {
      type: 'object',
      properties: {
        field: {
          type: 'string',
          description: 'Field name that failed validation',
          example: 'length',
        },
        value: {
          description: 'Value that failed validation',
          example: -5,
        },
        constraint: {
          type: 'string',
          description: 'Validation constraint that failed',
          example: 'min',
        },
        message: {
          type: 'string',
          description: 'Validation error message',
          example: 'length must be greater than or equal to 0',
        },
        children: {
          type: 'array',
          description: 'Nested validation errors',
          items: { $ref: '#/components/schemas/ValidationError' },
        },
      },
    },
    example: [
      {
        field: 'length',
        value: -5,
        constraint: 'min',
        message: 'length must be greater than or equal to 0',
      },
    ],
  })
  validationErrors: ValidationErrorDetailDto[];
}

/**
 * Validation error detail DTO
 */
export class ValidationErrorDetailDto {
  @ApiProperty({
    description: 'Field name that failed validation',
    example: 'length',
  })
  @IsString()
  field: string;

  @ApiProperty({
    description: 'Value that failed validation',
    example: -5,
  })
  value: any;

  @ApiProperty({
    description: 'Validation constraint that failed',
    example: 'min',
  })
  @IsString()
  constraint: string;

  @ApiProperty({
    description: 'Validation error message',
    example: 'length must be greater than or equal to 0',
  })
  @IsString()
  message: string;

  @ApiProperty({
    description: 'Nested validation errors',
    type: [ValidationErrorDetailDto],
    required: false,
  })
  @IsOptional()
  children?: ValidationErrorDetailDto[];
}

/**
 * Bulk operation error response DTO
 */
export class BulkOperationErrorResponseDto extends ErrorResponseDto {
  @ApiProperty({
    description: 'Number of successful operations',
    example: 15,
  })
  @IsInt()
  successful: number;

  @ApiProperty({
    description: 'Number of failed operations',
    example: 5,
  })
  @IsInt()
  failed: number;

  @ApiProperty({
    description: 'Detailed error messages for failed operations',
    type: 'array',
    items: { type: 'string' },
    example: [
      'Record 3: Invalid length value',
      'Record 7: Device not found',
      'Record 12: Duplicate measurement',
    ],
  })
  errors: string[];
}

/**
 * Analytics error response DTO
 */
export class AnalyticsErrorResponseDto extends ErrorResponseDto {
  @ApiProperty({
    description: 'Analytics operation that failed',
    example: 'growth_rate_calculation',
  })
  @IsString()
  operation: string;

  @ApiProperty({
    description: 'Required data points for operation',
    example: 10,
  })
  @IsInt()
  required: number;

  @ApiProperty({
    description: 'Available data points',
    example: 3,
  })
  @IsInt()
  available: number;
}

/**
 * Database operation error response DTO
 */
export class DatabaseErrorResponseDto extends ErrorResponseDto {
  @ApiProperty({
    description: 'Database operation that failed',
    example: 'insert',
  })
  @IsString()
  operation: string;

  @ApiProperty({
    description: 'Database error details',
    example: 'Connection timeout',
  })
  @IsString()
  dbError: string;
}

/**
 * External service error response DTO
 */
export class ExternalServiceErrorResponseDto extends ErrorResponseDto {
  @ApiProperty({
    description: 'External service name',
    example: 'notification-service',
  })
  @IsString()
  service: string;

  @ApiProperty({
    description: 'Service operation that failed',
    example: 'send-alert',
  })
  @IsString()
  operation: string;

  @ApiProperty({
    description: 'Service error details',
    example: 'Service unavailable',
  })
  @IsString()
  serviceError: string;
}

/**
 * Rate limit error response DTO
 */
export class RateLimitErrorResponseDto extends ErrorResponseDto {
  @ApiProperty({
    description: 'Operation that exceeded rate limit',
    example: 'bulk-insert',
  })
  @IsString()
  operation: string;

  @ApiProperty({
    description: 'Rate limit threshold',
    example: 100,
  })
  @IsInt()
  limit: number;

  @ApiProperty({
    description: 'Rate limit time window',
    example: '1 hour',
  })
  @IsString()
  window: string;

  @ApiProperty({
    description: 'Time until rate limit resets',
    example: '2024-01-15T11:30:00.000Z',
  })
  @IsDateString()
  resetTime: string;
}

/**
 * Concurrent access error response DTO
 */
export class ConcurrentAccessErrorResponseDto extends ErrorResponseDto {
  @ApiProperty({
    description: 'Resource that had concurrent access conflict',
    example: 'fish-growth-record-123',
  })
  @IsString()
  resource: string;

  @ApiProperty({
    description: 'Operation that conflicted',
    example: 'update',
  })
  @IsString()
  operation: string;

  @ApiProperty({
    description: 'Suggested retry delay in seconds',
    example: 5,
  })
  @IsInt()
  retryAfter: number;
}

/**
 * Cache operation error response DTO
 */
export class CacheErrorResponseDto extends ErrorResponseDto {
  @ApiProperty({
    description: 'Cache operation that failed',
    example: 'get',
  })
  @IsString()
  operation: string;

  @ApiProperty({
    description: 'Cache key that failed',
    example: 'fish-analytics-device-123',
  })
  @IsString()
  key: string;

  @ApiProperty({
    description: 'Cache error details',
    example: 'Redis connection failed',
  })
  @IsString()
  cacheError: string;
}

/**
 * Background job error response DTO
 */
export class BackgroundJobErrorResponseDto extends ErrorResponseDto {
  @ApiProperty({
    description: 'Background job type',
    example: 'data-export',
  })
  @IsString()
  jobType: string;

  @ApiProperty({
    description: 'Job ID',
    example: 'job-123-456-789',
  })
  @IsString()
  jobId: string;

  @ApiProperty({
    description: 'Job error details',
    example: 'Export file generation failed',
  })
  @IsString()
  jobError: string;
}

/**
 * File operation error response DTO
 */
export class FileOperationErrorResponseDto extends ErrorResponseDto {
  @ApiProperty({
    description: 'File operation that failed',
    example: 'upload',
  })
  @IsString()
  operation: string;

  @ApiProperty({
    description: 'File name',
    example: 'fish-data-import.csv',
  })
  @IsString()
  fileName: string;

  @ApiProperty({
    description: 'File error details',
    example: 'Invalid file format',
  })
  @IsString()
  fileError: string;
}
