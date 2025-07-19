import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { MqttException } from '../../../modules/mqtt/exceptions/mqtt.exceptions';
import {
  ErrorResponseDto,
  ErrorDetails,
  ValidationErrorDetail,
} from '../dto/error-response.dto';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const startTime = (request as any)['startTime'] || Date.now();
    const executionTime = Date.now() - startTime;
    const requestId = request.headers['x-request-id'] as string;

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    // Build structured error response using enhanced error handling
    const errorDetails = this.buildErrorDetails(exception, status);
    const errorResponse = new ErrorResponseDto(
      errorDetails,
      request.url,
      executionTime,
      requestId,
    );

    // Enhanced logging with structured information
    this.logError(exception, request, status, errorDetails, executionTime);

    response.status(status).json(errorResponse);
  }

  private buildErrorDetails(exception: unknown, status: number): ErrorDetails {
    // Handle MQTT-specific exceptions
    if (exception instanceof MqttException) {
      return new ErrorDetails(
        status,
        exception.message,
        undefined,
        exception.deviceId,
        this.getMqttErrorType(exception),
        {
          mqttError: true,
          originalError: exception.message,
        },
      );
    }

    // Handle HTTP exceptions
    if (exception instanceof HttpException) {
      const exceptionResponse = exception.getResponse();

      // Handle validation errors (BadRequestException with validation details)
      if (
        exception instanceof BadRequestException &&
        typeof exceptionResponse === 'object'
      ) {
        const response = exceptionResponse as any;

        if (response.message && Array.isArray(response.message)) {
          // Handle class-validator validation errors
          const validationDetails = this.extractValidationDetails(
            response.message,
          );
          return new ErrorDetails(
            status,
            'Validation failed',
            validationDetails,
            undefined,
            'VALIDATION_ERROR',
          );
        }
      }

      // Handle other HTTP exceptions
      const message =
        typeof exceptionResponse === 'string'
          ? exceptionResponse
          : (exceptionResponse as any)?.message || exception.message;

      return new ErrorDetails(
        status,
        message,
        undefined,
        undefined,
        this.getErrorType(status),
      );
    }

    // Handle non-HTTP exceptions
    return new ErrorDetails(
      HttpStatus.INTERNAL_SERVER_ERROR,
      'Internal server error',
      undefined,
      undefined,
      'INTERNAL_ERROR',
      {
        originalError:
          exception instanceof Error ? exception.message : String(exception),
      },
    );
  }

  private extractValidationDetails(
    validationMessages: any[],
  ): ValidationErrorDetail[] {
    const details: ValidationErrorDetail[] = [];

    for (const message of validationMessages) {
      if (typeof message === 'string') {
        // Simple string validation message
        details.push(new ValidationErrorDetail('unknown', message, undefined));
      } else if (message && typeof message === 'object') {
        // Structured validation error (from class-validator)
        const field = message.property || 'unknown';
        const constraints = message.constraints || {};
        const value = message.value;

        for (const [constraint, errorMessage] of Object.entries(constraints)) {
          details.push(
            new ValidationErrorDetail(
              field,
              errorMessage as string,
              value,
              constraint,
            ),
          );
        }
      }
    }

    return details;
  }

  private getMqttErrorType(exception: MqttException): string {
    const className = exception.constructor.name;
    return className.replace('Exception', '').toUpperCase();
  }

  private getErrorType(status: number): string {
    switch (status) {
      case HttpStatus.BAD_REQUEST:
        return 'BAD_REQUEST';
      case HttpStatus.UNAUTHORIZED:
        return 'UNAUTHORIZED';
      case HttpStatus.FORBIDDEN:
        return 'FORBIDDEN';
      case HttpStatus.NOT_FOUND:
        return 'NOT_FOUND';
      case HttpStatus.CONFLICT:
        return 'CONFLICT';
      case HttpStatus.UNPROCESSABLE_ENTITY:
        return 'VALIDATION_ERROR';
      case HttpStatus.INTERNAL_SERVER_ERROR:
        return 'INTERNAL_ERROR';
      case HttpStatus.SERVICE_UNAVAILABLE:
        return 'SERVICE_UNAVAILABLE';
      case HttpStatus.GATEWAY_TIMEOUT:
        return 'TIMEOUT';
      case HttpStatus.BAD_GATEWAY:
        return 'EXTERNAL_SERVICE_ERROR';
      default:
        return 'HTTP_ERROR';
    }
  }

  private logError(
    exception: unknown,
    request: Request,
    status: number,
    errorDetails: ErrorDetails,
    executionTime: number,
  ): void {
    const logContext = {
      status,
      method: request.method,
      url: request.url,
      userAgent: request.headers['user-agent'],
      ip: request.ip,
      executionTime,
      errorType: errorDetails.type,
      deviceId: errorDetails.deviceId,
      requestId: request.headers['x-request-id'],
    };

    // Log different severity levels based on status code
    if (status >= 500) {
      this.logger.error(`Server Error: ${errorDetails.message}`, {
        ...logContext,
        stack: exception instanceof Error ? exception.stack : undefined,
        exceptionName: exception?.constructor?.name,
      });
    } else if (status >= 400) {
      this.logger.warn(`Client Error: ${errorDetails.message}`, logContext);
    } else {
      this.logger.log(`HTTP Exception: ${errorDetails.message}`, logContext);
    }

    // Special logging for MQTT-related errors
    if (exception instanceof MqttException) {
      this.logger.error(`MQTT Operation Failed: ${exception.message}`, {
        ...logContext,
        mqttError: true,
        deviceId: exception.deviceId,
        exceptionType: exception.constructor.name,
      });
    }

    // Log validation details for debugging
    if (errorDetails.details && errorDetails.details.length > 0) {
      this.logger.debug(
        `Validation Details: ${JSON.stringify(errorDetails.details)}`,
        logContext,
      );
    }
  }
}
