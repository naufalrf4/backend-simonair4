import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { Request, Response } from 'express';
import { ManualMeasurementException, ManualMeasurementExceptionFactory } from './manual-measurement.exceptions';
import { ManualMeasurementErrorService } from './manual-measurement-error.service';

@Injectable()
export class ManualMeasurementErrorInterceptor implements NestInterceptor {
  private readonly logger = new Logger(ManualMeasurementErrorInterceptor.name);

  constructor(
    private readonly errorService: ManualMeasurementErrorService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();
    const startTime = Date.now();

    // Add correlation ID to request for tracking
    const correlationId = ManualMeasurementExceptionFactory.generateCorrelationId();
    request['correlationId'] = correlationId;
    response.setHeader('X-Correlation-ID', correlationId);

    return next.handle().pipe(
      tap(() => {
        // Log successful requests
        const duration = Date.now() - startTime;
        this.logger.debug(
          `Request completed successfully [${correlationId}]`,
          {
            correlationId,
            path: request.url,
            method: request.method,
            statusCode: response.statusCode,
            duration,
          },
        );
      }),
      catchError((error) => {
        const duration = Date.now() - startTime;
        const requestContext = this.buildRequestContext(request, correlationId);

        // Handle different types of errors
        let handledException: ManualMeasurementException;

        if (error instanceof ManualMeasurementException) {
          handledException = error;
        } else {
          // Convert generic errors to manual measurement exceptions
          handledException = this.convertToManualMeasurementException(error, correlationId, requestContext);
        }

        // Log the exception
        this.errorService.logException(handledException, requestContext);

        // Add performance metrics to error context
        handledException.context.requestDuration = duration;
        handledException.context.requestStartTime = startTime;

        // Log performance issues
        if (duration > 5000) { // 5 seconds threshold
          this.logger.warn(
            `Slow request detected [${correlationId}]: ${duration}ms`,
            {
              correlationId,
              path: request.url,
              method: request.method,
              duration,
            },
          );
        }

        return throwError(() => handledException);
      }),
    );
  }

  private buildRequestContext(request: Request, correlationId: string) {
    return {
      path: request.url,
      method: request.method,
      userAgent: request.get('User-Agent'),
      ip: request.ip,
      userId: (request as any).user?.userId || (request as any).user?.id,
      deviceId: request.params?.deviceId,
      correlationId,
    };
  }

  private convertToManualMeasurementException(
    error: any,
    correlationId: string,
    requestContext: any,
  ): ManualMeasurementException {
    // Database errors
    if (error.name === 'QueryFailedError' || error.code === 'ECONNREFUSED') {
      return ManualMeasurementExceptionFactory.createDatabaseOperationException(
        'Database operation failed',
        error,
        requestContext,
      );
    }

    // Validation errors
    if (error.name === 'ValidationError' || error.status === 400) {
      const validationErrors = this.extractValidationErrors(error);
      return ManualMeasurementExceptionFactory.createValidationException(
        'Validation failed',
        validationErrors,
        requestContext,
      );
    }

    // Timeout errors
    if (error.name === 'TimeoutError' || error.code === 'ETIMEDOUT') {
      return ManualMeasurementExceptionFactory.createComparisonFailedException(
        'Operation timed out',
        { ...requestContext, timeout: true },
      );
    }

    // Network errors
    if (error.code === 'ENOTFOUND' || error.code === 'ECONNRESET') {
      return ManualMeasurementExceptionFactory.createComparisonFailedException(
        'Network connection failed',
        { ...requestContext, networkError: true },
      );
    }

    // Generic error conversion
    return ManualMeasurementExceptionFactory.createDatabaseOperationException(
      'Unexpected error occurred',
      error,
      requestContext,
    );
  }

  private extractValidationErrors(error: any): Record<string, string[]> {
    const errors: Record<string, string[]> = {};

    if (error.response?.message && Array.isArray(error.response.message)) {
      error.response.message.forEach((msg: string) => {
        const field = this.extractFieldFromMessage(msg);
        if (!errors[field]) {
          errors[field] = [];
        }
        errors[field].push(msg);
      });
    } else if (error.message) {
      errors.general = [error.message];
    }

    return errors;
  }

  private extractFieldFromMessage(message: string): string {
    // Try to extract field name from validation message
    const patterns = [
      /^(\w+)\s+/,  // "fieldName must be..."
      /property\s+(\w+)/,  // "property fieldName..."
      /field\s+(\w+)/,  // "field fieldName..."
    ];

    for (const pattern of patterns) {
      const match = message.match(pattern);
      if (match) {
        return match[1];
      }
    }

    return 'general';
  }
}
