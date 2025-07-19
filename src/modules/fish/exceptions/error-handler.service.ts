import { Injectable, Logger } from '@nestjs/common';
import { HttpException, HttpStatus } from '@nestjs/common';
import { Request } from 'express';
import {
  FishGrowthException,
  FishValidationException,
  ValidationError,
} from './index';

/**
 * Service for handling fish growth related errors
 */
@Injectable()
export class ErrorHandlerService {
  private readonly logger = new Logger(ErrorHandlerService.name);

  /**
   * Handle and log errors with correlation ID
   */
  handleError(
    error: Error,
    request?: Request,
    correlationId?: string,
  ): HttpException {
    const id = correlationId || this.generateCorrelationId();

    // Log error with context
    this.logError(error, request, id);

    // Handle known fish growth exceptions
    if (error instanceof FishGrowthException) {
      return this.handleFishGrowthException(error, id);
    }

    // Handle validation exceptions
    if (error instanceof FishValidationException) {
      return this.handleValidationException(error, id);
    }

    // Handle standard HTTP exceptions
    if (error instanceof HttpException) {
      return this.handleHttpException(error, id);
    }

    // Handle unknown errors
    return this.handleUnknownError(error, id);
  }

  /**
   * Handle fish growth specific exceptions
   */
  private handleFishGrowthException(
    error: FishGrowthException,
    correlationId: string,
  ): FishGrowthException {
    // Update correlation ID if needed
    if (!error.correlationId) {
      (error as any).correlationId = correlationId;
    }

    return error;
  }

  /**
   * Handle validation exceptions
   */
  private handleValidationException(
    error: FishValidationException,
    correlationId: string,
  ): FishValidationException {
    // Update correlation ID if needed
    if (!error.correlationId) {
      (error as any).correlationId = correlationId;
    }

    return error;
  }

  /**
   * Handle standard HTTP exceptions
   */
  private handleHttpException(
    error: HttpException,
    correlationId: string,
  ): HttpException {
    const response = error.getResponse();
    const statusCode = error.getStatus();

    // Create a new exception with correlation ID
    const enhancedResponse = {
      ...(typeof response === 'string' ? { message: response } : response),
      correlationId,
      timestamp: new Date().toISOString(),
    };

    return new HttpException(enhancedResponse, statusCode);
  }

  /**
   * Handle unknown errors
   */
  private handleUnknownError(error: Error, correlationId: string): HttpException {
    const response = {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      error: 'InternalServerError',
      message: 'An unexpected error occurred',
      correlationId,
      timestamp: new Date().toISOString(),
    };

    return new HttpException(response, HttpStatus.INTERNAL_SERVER_ERROR);
  }

  /**
   * Log error with context
   */
  private logError(error: Error, request?: Request, correlationId?: string): void {
    const context = {
      correlationId,
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      },
      request: request
        ? {
            method: request.method,
            url: request.url,
            headers: this.sanitizeHeaders(request.headers),
            body: this.sanitizeBody(request.body),
            query: request.query,
            params: request.params,
            ip: request.ip,
            userAgent: request.get('User-Agent'),
          }
        : undefined,
    };

    // Log at appropriate level based on error type
    if (error instanceof FishGrowthException) {
      if (error.getStatus() >= 500) {
        this.logger.error('Fish growth exception', context);
      } else {
        this.logger.warn('Fish growth exception', context);
      }
    } else if (error instanceof FishValidationException) {
      this.logger.warn('Fish validation exception', context);
    } else if (error instanceof HttpException) {
      if (error.getStatus() >= 500) {
        this.logger.error('HTTP exception', context);
      } else {
        this.logger.warn('HTTP exception', context);
      }
    } else {
      this.logger.error('Unknown error', context);
    }
  }

  /**
   * Sanitize request headers for logging
   */
  private sanitizeHeaders(headers: any): any {
    const sanitized = { ...headers };
    
    // Remove sensitive headers
    const sensitiveHeaders = [
      'authorization',
      'cookie',
      'x-api-key',
      'x-auth-token',
    ];

    sensitiveHeaders.forEach(header => {
      if (sanitized[header]) {
        sanitized[header] = '[REDACTED]';
      }
    });

    return sanitized;
  }

  /**
   * Sanitize request body for logging
   */
  private sanitizeBody(body: any): any {
    if (!body || typeof body !== 'object') {
      return body;
    }

    const sanitized = { ...body };
    
    // Remove sensitive fields
    const sensitiveFields = [
      'password',
      'token',
      'apiKey',
      'secret',
      'authorization',
    ];

    sensitiveFields.forEach(field => {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    });

    return sanitized;
  }

  /**
   * Generate correlation ID
   */
  private generateCorrelationId(): string {
    return `fish-err-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Format validation errors for response
   */
  formatValidationErrors(validationErrors: any[]): ValidationError[] {
    return validationErrors.map(error => this.formatValidationError(error));
  }

  /**
   * Format single validation error
   */
  private formatValidationError(error: any): ValidationError {
    const formatted: ValidationError = {
      field: error.property || 'unknown',
      value: error.value,
      constraint: Object.keys(error.constraints || {})[0] || 'unknown',
      message: Object.values(error.constraints || {})[0] as string || 'Validation failed',
    };

    // Handle nested errors
    if (error.children && error.children.length > 0) {
      formatted.children = error.children.map(child => this.formatValidationError(child));
    }

    return formatted;
  }

  /**
   * Check if error is retryable
   */
  isRetryableError(error: Error): boolean {
    if (error instanceof FishGrowthException) {
      const statusCode = error.getStatus();
      // Retry on 5xx errors and some 4xx errors
      return statusCode >= 500 || statusCode === 429 || statusCode === 409;
    }

    if (error instanceof HttpException) {
      const statusCode = error.getStatus();
      return statusCode >= 500 || statusCode === 429;
    }

    // Unknown errors are generally retryable
    return true;
  }

  /**
   * Get retry delay based on error type
   */
  getRetryDelay(error: Error, attemptNumber: number): number {
    const baseDelay = 1000; // 1 second
    const maxDelay = 30000; // 30 seconds

    // Exponential backoff with jitter
    const exponentialDelay = baseDelay * Math.pow(2, attemptNumber - 1);
    const jitter = Math.random() * 0.1 * exponentialDelay;
    const delay = Math.min(exponentialDelay + jitter, maxDelay);

    return Math.floor(delay);
  }

  /**
   * Create error response for API
   */
  createErrorResponse(error: Error, correlationId?: string): any {
    const id = correlationId || this.generateCorrelationId();

    if (error instanceof FishGrowthException) {
      return {
        ...error.getErrorResponse(),
        correlationId: id,
      };
    }

    if (error instanceof FishValidationException) {
      return {
        ...error.getErrorResponse(),
        correlationId: id,
      };
    }

    if (error instanceof HttpException) {
      const response = error.getResponse();
      return {
        statusCode: error.getStatus(),
        timestamp: new Date().toISOString(),
        error: error.name,
        message: typeof response === 'string' ? response : (response as any).message,
        correlationId: id,
      };
    }

    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      timestamp: new Date().toISOString(),
      error: 'InternalServerError',
      message: 'An unexpected error occurred',
      correlationId: id,
    };
  }

  /**
   * Create success response with correlation ID
   */
  createSuccessResponse(data: any, correlationId?: string): any {
    const id = correlationId || this.generateCorrelationId();

    return {
      success: true,
      data,
      correlationId: id,
      timestamp: new Date().toISOString(),
    };
  }
}
