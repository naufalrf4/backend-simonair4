import { Injectable, HttpStatus } from '@nestjs/common';
import {
  ErrorResponseDto,
  ErrorDetails,
  ValidationErrorDetail,
} from '../dto/error-response.dto';

export interface ErrorResponseOptions {
  deviceId?: string;
  requestId?: string;
  path?: string;
  executionTime?: number;
  context?: Record<string, any>;
  validationErrors?: ValidationErrorDetail[];
}

@Injectable()
export class ErrorResponseService {
  /**
   * Create structured error response for MQTT broker unavailable
   */
  createMqttBrokerUnavailableResponse(
    deviceId?: string,
    options?: ErrorResponseOptions,
  ): ErrorResponseDto {
    const errorDetails = new ErrorDetails(
      HttpStatus.SERVICE_UNAVAILABLE,
      'MQTT broker is currently unavailable. Please try again later.',
      undefined,
      deviceId,
      'MQTT_BROKER_UNAVAILABLE',
      {
        mqttError: true,
        retryable: true,
        ...options?.context,
      },
    );

    return new ErrorResponseDto(
      errorDetails,
      options?.path || '/unknown',
      options?.executionTime,
      options?.requestId,
    );
  }

  /**
   * Create structured error response for MQTT publish failures
   */
  createMqttPublishFailedResponse(
    deviceId: string,
    topic: string,
    originalError?: string,
    options?: ErrorResponseOptions,
  ): ErrorResponseDto {
    const errorDetails = new ErrorDetails(
      HttpStatus.BAD_GATEWAY,
      `Failed to publish message to device ${deviceId}. The device may be offline or unreachable.`,
      undefined,
      deviceId,
      'MQTT_PUBLISH_FAILED',
      {
        mqttError: true,
        topic,
        originalError,
        retryable: true,
        ...options?.context,
      },
    );

    return new ErrorResponseDto(
      errorDetails,
      options?.path || '/unknown',
      options?.executionTime,
      options?.requestId,
    );
  }

  /**
   * Create structured error response for invalid device ID format
   */
  createInvalidDeviceIdResponse(
    deviceId: string,
    options?: ErrorResponseOptions,
  ): ErrorResponseDto {
    const errorDetails = new ErrorDetails(
      HttpStatus.BAD_REQUEST,
      `Invalid device ID format: ${deviceId}. Expected format: SMNR-XXXX`,
      [
        new ValidationErrorDetail(
          'deviceId',
          'Device ID must follow the format SMNR-XXXX where XXXX is alphanumeric',
          deviceId,
          'deviceIdFormat',
        ),
      ],
      deviceId,
      'INVALID_DEVICE_ID_FORMAT',
      options?.context,
    );

    return new ErrorResponseDto(
      errorDetails,
      options?.path || '/unknown',
      options?.executionTime,
      options?.requestId,
    );
  }

  /**
   * Create structured error response for payload validation failures
   */
  createPayloadValidationResponse(
    message: string,
    validationErrors?: ValidationErrorDetail[],
    options?: ErrorResponseOptions,
  ): ErrorResponseDto {
    const errorDetails = new ErrorDetails(
      HttpStatus.BAD_REQUEST,
      message,
      validationErrors || options?.validationErrors,
      options?.deviceId,
      'PAYLOAD_VALIDATION_FAILED',
      options?.context,
    );

    return new ErrorResponseDto(
      errorDetails,
      options?.path || '/unknown',
      options?.executionTime,
      options?.requestId,
    );
  }

  /**
   * Create structured error response for device access denied
   */
  createDeviceAccessDeniedResponse(
    deviceId: string,
    userId?: string,
    options?: ErrorResponseOptions,
  ): ErrorResponseDto {
    const errorDetails = new ErrorDetails(
      HttpStatus.FORBIDDEN,
      `Access denied to device ${deviceId}. Device not found or you don't have permission to access it.`,
      undefined,
      deviceId,
      'DEVICE_ACCESS_DENIED',
      {
        userId,
        ...options?.context,
      },
    );

    return new ErrorResponseDto(
      errorDetails,
      options?.path || '/unknown',
      options?.executionTime,
      options?.requestId,
    );
  }

  /**
   * Create structured error response for calibration validation failures
   */
  createCalibrationValidationResponse(
    sensorType: string,
    validationErrors: ValidationErrorDetail[],
    deviceId?: string,
    options?: ErrorResponseOptions,
  ): ErrorResponseDto {
    const errorDetails = new ErrorDetails(
      HttpStatus.BAD_REQUEST,
      `Calibration validation failed for ${sensorType} sensor`,
      validationErrors,
      deviceId,
      'CALIBRATION_VALIDATION_FAILED',
      {
        sensorType,
        ...options?.context,
      },
    );

    return new ErrorResponseDto(
      errorDetails,
      options?.path || '/unknown',
      options?.executionTime,
      options?.requestId,
    );
  }

  /**
   * Create structured error response for threshold validation failures
   */
  createThresholdValidationResponse(
    validationErrors: ValidationErrorDetail[],
    deviceId?: string,
    options?: ErrorResponseOptions,
  ): ErrorResponseDto {
    const errorDetails = new ErrorDetails(
      HttpStatus.BAD_REQUEST,
      'Threshold configuration validation failed',
      validationErrors,
      deviceId,
      'THRESHOLD_VALIDATION_FAILED',
      options?.context,
    );

    return new ErrorResponseDto(
      errorDetails,
      options?.path || '/unknown',
      options?.executionTime,
      options?.requestId,
    );
  }

  /**
   * Create structured error response for MQTT connection timeout
   */
  createMqttTimeoutResponse(
    deviceId: string,
    operation: string,
    timeoutMs: number,
    options?: ErrorResponseOptions,
  ): ErrorResponseDto {
    const errorDetails = new ErrorDetails(
      HttpStatus.REQUEST_TIMEOUT,
      `Operation timed out after ${timeoutMs}ms while ${operation} for device ${deviceId}`,
      undefined,
      deviceId,
      'MQTT_OPERATION_TIMEOUT',
      {
        operation,
        timeoutMs,
        retryable: true,
        ...options?.context,
      },
    );

    return new ErrorResponseDto(
      errorDetails,
      options?.path || '/unknown',
      options?.executionTime,
      options?.requestId,
    );
  }

  /**
   * Create structured error response for resource not found
   */
  createResourceNotFoundResponse(
    resourceType: string,
    resourceId: string,
    options?: ErrorResponseOptions,
  ): ErrorResponseDto {
    const errorDetails = new ErrorDetails(
      HttpStatus.NOT_FOUND,
      `${resourceType} with ID ${resourceId} not found`,
      undefined,
      options?.deviceId,
      'RESOURCE_NOT_FOUND',
      {
        resourceType,
        resourceId,
        ...options?.context,
      },
    );

    return new ErrorResponseDto(
      errorDetails,
      options?.path || '/unknown',
      options?.executionTime,
      options?.requestId,
    );
  }

  /**
   * Create structured error response for internal server errors
   */
  createInternalServerErrorResponse(
    message: string = 'An unexpected error occurred',
    options?: ErrorResponseOptions,
  ): ErrorResponseDto {
    const errorDetails = new ErrorDetails(
      HttpStatus.INTERNAL_SERVER_ERROR,
      message,
      undefined,
      options?.deviceId,
      'INTERNAL_SERVER_ERROR',
      {
        retryable: false,
        ...options?.context,
      },
    );

    return new ErrorResponseDto(
      errorDetails,
      options?.path || '/unknown',
      options?.executionTime,
      options?.requestId,
    );
  }

  /**
   * Create structured error response for authentication failures
   */
  createAuthenticationErrorResponse(
    message: string,
    authType: 'JWT' | 'ROLE' | 'DEVICE_OWNERSHIP',
    options?: ErrorResponseOptions,
  ): ErrorResponseDto {
    const statusCode =
      authType === 'JWT' ? HttpStatus.UNAUTHORIZED : HttpStatus.FORBIDDEN;

    const errorDetails = new ErrorDetails(
      statusCode,
      message,
      undefined,
      options?.deviceId,
      `AUTHENTICATION_${authType}_FAILED`,
      {
        authType,
        ...options?.context,
      },
    );

    return new ErrorResponseDto(
      errorDetails,
      options?.path || '/unknown',
      options?.executionTime,
      options?.requestId,
    );
  }

  /**
   * Create validation error details from class-validator errors
   */
  createValidationErrorDetails(
    validationErrors: any[],
  ): ValidationErrorDetail[] {
    const details: ValidationErrorDetail[] = [];

    for (const error of validationErrors) {
      if (error.constraints) {
        for (const [constraint, message] of Object.entries(error.constraints)) {
          details.push(
            new ValidationErrorDetail(
              error.property,
              message as string,
              error.value,
              constraint,
            ),
          );
        }
      }
    }

    return details;
  }

  /**
   * Extract request context from HTTP request for error responses
   */
  extractRequestContext(request: any): ErrorResponseOptions {
    return {
      requestId: request.headers?.['x-request-id'],
      path: request.url,
      executionTime: request.startTime
        ? Date.now() - request.startTime
        : undefined,
      context: {
        method: request.method,
        ip: request.ip,
        userAgent: request.headers?.['user-agent'],
      },
    };
  }
}
