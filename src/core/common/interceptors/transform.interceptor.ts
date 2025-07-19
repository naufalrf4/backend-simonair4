import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Request } from 'express';
import { v4 as uuidv4 } from 'uuid';

export interface Response<T> {
  status: string;
  data: T;
  metadata: {
    timestamp: string;
    path: string;
    executionTime: number;
    requestId?: string;
    version?: string;
    method?: string;
  };
  pagination?: any;
}

@Injectable()
export class TransformInterceptor<T>
  implements NestInterceptor<T, Response<T>>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<Response<T>> {
    const request = context.switchToHttp().getRequest<Request>();
    const startTime = Date.now();
    
    // Generate or use existing request ID
    const requestId = request.headers['x-request-id'] as string || uuidv4();
    
    // Add request ID to request object for logging
    (request as any).requestId = requestId;

    return next.handle().pipe(
      map((data) => {
        const executionTime = Date.now() - startTime;
        const { pagination, ...responseData } = data || {};

        const response: Response<T> = {
          status: 'success',
          data: responseData.data || responseData,
          metadata: {
            timestamp: new Date().toISOString(),
            path: request.url,
            executionTime,
            requestId,
            version: process.env.npm_package_version || '4.0',
            method: request.method,
          },
        };

        // Add pagination if present
        if (pagination) {
          response.pagination = pagination;
        }

        return response;
      }),
    );
  }
}
