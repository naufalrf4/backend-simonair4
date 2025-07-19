import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  Logger,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ManualMeasurementException } from './manual-measurement.exceptions';

/**
 * Exception filter for handling manual measurement specific exceptions
 */
@Catch(ManualMeasurementException)
export class ManualMeasurementExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ManualMeasurementExceptionFilter.name);

  catch(exception: ManualMeasurementException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status = exception.getStatus();

    // Log the exception with correlation ID for tracking
    this.logger.error(
      `Manual Measurement Exception [${exception.correlationId}]: ${exception.message}`,
      {
        correlationId: exception.correlationId,
        statusCode: status,
        path: request.url,
        method: request.method,
        userAgent: request.get('User-Agent'),
        ip: request.ip,
        timestamp: exception.timestamp,
        context: exception.context,
        stack: exception.stack,
      },
    );

    // Structure error response
    const errorResponse = {
      success: false,
      error: {
        message: exception.message,
        code: exception.constructor.name,
        statusCode: status,
        correlationId: exception.correlationId,
        timestamp: exception.timestamp.toISOString(),
        path: request.url,
        method: request.method,
        ...(process.env.NODE_ENV === 'development' && {
          context: exception.context,
        }),
      },
    };

    response.status(status).json(errorResponse);
  }
}

/**
 * Global exception filter for handling all HTTP exceptions in manual measurements context
 */
@Catch(HttpException)
export class ManualMeasurementHttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ManualMeasurementHttpExceptionFilter.name);

  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status = exception.getStatus();
    const correlationId = this.generateCorrelationId();

    // Extract error details
    const exceptionResponse = exception.getResponse();
    const errorMessage = typeof exceptionResponse === 'string' 
      ? exceptionResponse 
      : (exceptionResponse as any)?.message || exception.message;

    // Log the exception
    this.logger.error(
      `HTTP Exception in Manual Measurements [${correlationId}]: ${errorMessage}`,
      {
        correlationId,
        statusCode: status,
        path: request.url,
        method: request.method,
        userAgent: request.get('User-Agent'),
        ip: request.ip,
        timestamp: new Date().toISOString(),
        exceptionResponse,
        stack: exception.stack,
      },
    );

    // Structure error response
    const errorResponse = {
      success: false,
      error: {
        message: errorMessage,
        code: 'HttpException',
        statusCode: status,
        correlationId,
        timestamp: new Date().toISOString(),
        path: request.url,
        method: request.method,
        ...(typeof exceptionResponse === 'object' && 
            exceptionResponse !== null && 
            process.env.NODE_ENV === 'development' && {
          details: exceptionResponse,
        }),
      },
    };

    response.status(status).json(errorResponse);
  }

  private generateCorrelationId(): string {
    return `http-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

/**
 * Global exception filter for handling unexpected errors in manual measurements
 */
@Catch()
export class ManualMeasurementGlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ManualMeasurementGlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const correlationId = this.generateCorrelationId();

    // Determine status code and message
    const status = exception instanceof HttpException 
      ? exception.getStatus() 
      : HttpStatus.INTERNAL_SERVER_ERROR;

    const message = exception instanceof Error 
      ? exception.message 
      : 'Internal server error';

    // Log the unexpected error
    this.logger.error(
      `Unexpected Error in Manual Measurements [${correlationId}]: ${message}`,
      {
        correlationId,
        statusCode: status,
        path: request.url,
        method: request.method,
        userAgent: request.get('User-Agent'),
        ip: request.ip,
        timestamp: new Date().toISOString(),
        error: exception instanceof Error ? {
          name: exception.name,
          message: exception.message,
          stack: exception.stack,
        } : exception,
      },
    );

    // Structure error response (sanitized for production)
    const errorResponse = {
      success: false,
      error: {
        message: status === HttpStatus.INTERNAL_SERVER_ERROR 
          ? 'An unexpected error occurred. Please try again later.'
          : message,
        code: 'UnexpectedError',
        statusCode: status,
        correlationId,
        timestamp: new Date().toISOString(),
        path: request.url,
        method: request.method,
        ...(process.env.NODE_ENV === 'development' && 
            exception instanceof Error && {
          stack: exception.stack,
        }),
      },
    };

    response.status(status).json(errorResponse);
  }

  private generateCorrelationId(): string {
    return `global-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

/**
 * Validation exception filter for handling validation errors
 */
@Catch()
export class ValidationExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ValidationExceptionFilter.name);

  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    // Handle class-validator validation errors
    if (exception?.response?.message && Array.isArray(exception.response.message)) {
      const correlationId = this.generateCorrelationId();
      const validationErrors = this.formatValidationErrors(exception.response.message);

      this.logger.warn(
        `Validation Error [${correlationId}]: Multiple validation failures`,
        {
          correlationId,
          path: request.url,
          method: request.method,
          validationErrors,
          timestamp: new Date().toISOString(),
        },
      );

      const errorResponse = {
        success: false,
        error: {
          message: 'Validation failed',
          code: 'ValidationError',
          statusCode: HttpStatus.BAD_REQUEST,
          correlationId,
          timestamp: new Date().toISOString(),
          path: request.url,
          method: request.method,
          validationErrors,
        },
      };

      response.status(HttpStatus.BAD_REQUEST).json(errorResponse);
      return;
    }

    // Let other filters handle non-validation exceptions
    throw exception;
  }

  private generateCorrelationId(): string {
    return `validation-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private formatValidationErrors(messages: string[]): Record<string, string[]> {
    const errors: Record<string, string[]> = {};
    
    messages.forEach(message => {
      // Extract field name from validation message if possible
      const match = message.match(/^(\w+)\s/);
      const field = match ? match[1] : 'general';
      
      if (!errors[field]) {
        errors[field] = [];
      }
      errors[field].push(message);
    });

    return errors;
  }
}
