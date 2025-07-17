import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    
    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException
        ? exception.getResponse()
        : { message: 'Internal server error' };

    // Enhanced error handling for validation errors
    let errorResponse;
    
    if (exception instanceof HttpException) {
      const exceptionResponse = exception.getResponse();
      
      if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const responseObj = exceptionResponse as any;
        
        // Handle class-validator validation errors
        if (Array.isArray(responseObj.message)) {
          errorResponse = {
            status: 'error',
            error: {
              code: status,
              message: 'Validation failed',
              details: responseObj.message,
            },
            metadata: {
              timestamp: new Date().toISOString(),
              path: request.url,
            },
          };
        } else {
          // Handle other structured errors
          errorResponse = {
            status: 'error',
            error: {
              code: status,
              message: responseObj.error || responseObj.message || 'An error occurred',
              details: responseObj.message || responseObj.details || undefined,
            },
            metadata: {
              timestamp: new Date().toISOString(),
              path: request.url,
            },
          };
        }
      } else {
        // Handle string error messages
        errorResponse = {
          status: 'error',
          error: {
            code: status,
            message: typeof exceptionResponse === 'string' ? exceptionResponse : 'An error occurred',
            details: undefined,
          },
          metadata: {
            timestamp: new Date().toISOString(),
            path: request.url,
          },
        };
      }
    } else {
      // Handle non-HTTP exceptions
      this.logger.error(`Unhandled exception: ${exception}`, (exception as Error)?.stack);
      
      errorResponse = {
        status: 'error',
        error: {
          code: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Internal server error',
          details: 'An unexpected error occurred. Please try again later.',
        },
        metadata: {
          timestamp: new Date().toISOString(),
          path: request.url,
        },
      };
    }

    // Log error for debugging (except for client errors like 400, 401, 403, 404)
    if (status >= 500) {
      this.logger.error(
        `HTTP ${status} Error: ${request.method} ${request.url}`,
        exception instanceof Error ? exception.stack : exception
      );
    } else if (status >= 400) {
      this.logger.warn(
        `HTTP ${status} Client Error: ${request.method} ${request.url} - ${errorResponse.error.message}`
      );
    }

    response.status(status).json(errorResponse);
  }
}