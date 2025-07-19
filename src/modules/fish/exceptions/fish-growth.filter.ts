import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ErrorHandlerService } from './error-handler.service';
import { FishGrowthException, FishValidationException } from './index';

/**
 * Global exception filter for fish growth module
 */
@Catch()
export class FishGrowthExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(FishGrowthExceptionFilter.name);

  constructor(private readonly errorHandlerService: ErrorHandlerService) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const correlationId = this.extractCorrelationId(request);

    let handledException: HttpException;
    
    if (exception instanceof Error) {
      handledException = this.errorHandlerService.handleError(
        exception,
        request,
        correlationId,
      );
    } else {
      // Handle non-Error exceptions
      const error = new Error(String(exception));
      handledException = this.errorHandlerService.handleError(
        error,
        request,
        correlationId,
      );
    }

    const status = handledException.getStatus();
    const errorResponse = this.errorHandlerService.createErrorResponse(
      handledException,
      correlationId,
    );

    // Set correlation ID in response headers
    response.header('X-Correlation-ID', correlationId);

    // Log the error
    this.logger.error(
      `Fish Growth Exception: ${handledException.message}`,
      {
        correlationId,
        statusCode: status,
        path: request.url,
        method: request.method,
        stack: handledException.stack,
      },
    );

    response.status(status).json(errorResponse);
  }

  /**
   * Extract correlation ID from request headers or generate new one
   */
  private extractCorrelationId(request: Request): string {
    return (
      request.headers['x-correlation-id'] as string ||
      request.headers['correlation-id'] as string ||
      this.generateCorrelationId()
    );
  }

  /**
   * Generate new correlation ID
   */
  private generateCorrelationId(): string {
    return `fish-filter-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

/**
 * Specific exception filter for fish growth exceptions
 */
@Catch(FishGrowthException)
export class FishGrowthSpecificExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(FishGrowthSpecificExceptionFilter.name);

  constructor(private readonly errorHandlerService: ErrorHandlerService) {}

  catch(exception: FishGrowthException, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const correlationId = exception.correlationId || this.extractCorrelationId(request);
    const status = exception.getStatus();
    const errorResponse = exception.getErrorResponse();

    // Set correlation ID in response headers
    response.header('X-Correlation-ID', correlationId);

    // Log the error
    this.logger.warn(
      `Fish Growth Exception: ${exception.message}`,
      {
        correlationId,
        statusCode: status,
        path: request.url,
        method: request.method,
        context: exception.context,
      },
    );

    response.status(status).json(errorResponse);
  }

  private extractCorrelationId(request: Request): string {
    return (
      request.headers['x-correlation-id'] as string ||
      request.headers['correlation-id'] as string ||
      `fish-specific-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    );
  }
}

/**
 * Specific exception filter for validation exceptions
 */
@Catch(FishValidationException)
export class FishValidationExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(FishValidationExceptionFilter.name);

  constructor(private readonly errorHandlerService: ErrorHandlerService) {}

  catch(exception: FishValidationException, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const correlationId = exception.correlationId || this.extractCorrelationId(request);
    const status = exception.getStatus();
    const errorResponse = exception.getErrorResponse();

    // Set correlation ID in response headers
    response.header('X-Correlation-ID', correlationId);

    // Log the error
    this.logger.warn(
      `Fish Validation Exception: ${exception.message}`,
      {
        correlationId,
        statusCode: status,
        path: request.url,
        method: request.method,
        validationErrors: exception.validationErrors,
      },
    );

    response.status(status).json(errorResponse);
  }

  private extractCorrelationId(request: Request): string {
    return (
      request.headers['x-correlation-id'] as string ||
      request.headers['correlation-id'] as string ||
      `fish-validation-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    );
  }
}

/**
 * Middleware for adding correlation ID to requests
 */
export function correlationIdMiddleware(
  request: Request,
  response: Response,
  next: () => void,
): void {
  const correlationId =
    request.headers['x-correlation-id'] as string ||
    request.headers['correlation-id'] as string ||
    `fish-middleware-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  // Set correlation ID in request
  (request as any).correlationId = correlationId;

  // Set correlation ID in response headers
  response.header('X-Correlation-ID', correlationId);

  next();
}
