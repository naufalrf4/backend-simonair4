import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { Request, Response } from 'express';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();
    const startTime = Date.now();

    // Add start time to request for use in exception filter
    (request as any)['startTime'] = startTime;

    // Generate request ID if not present
    if (!request.headers['x-request-id']) {
      request.headers['x-request-id'] = this.generateRequestId();
    }

    const requestId = request.headers['x-request-id'] as string;
    const { method, url, ip, headers } = request;
    const userAgent = headers['user-agent'] || 'Unknown';

    // Log incoming request
    this.logger.log(`Incoming ${method} ${url}`, {
      method,
      url,
      ip,
      userAgent,
      requestId,
      timestamp: new Date().toISOString(),
      contentLength: headers['content-length'] || 0,
      contentType: headers['content-type'] || 'unknown',
    });

    return next.handle().pipe(
      tap((data) => {
        const executionTime = Date.now() - startTime;
        const statusCode = response.statusCode;

        // Log successful response
        this.logger.log(`${method} ${url} - ${statusCode}`, {
          method,
          url,
          statusCode,
          executionTime,
          requestId,
          timestamp: new Date().toISOString(),
          responseSize: JSON.stringify(data || {}).length,
        });
      }),
      catchError((error) => {
        const executionTime = Date.now() - startTime;
        const statusCode = error.status || 500;

        // Log error response
        this.logger.error(`${method} ${url} - ${statusCode}`, {
          method,
          url,
          statusCode,
          executionTime,
          requestId,
          timestamp: new Date().toISOString(),
          error: error.message,
          errorName: error.constructor.name,
        });

        throw error;
      }),
    );
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
