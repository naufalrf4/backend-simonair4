import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Request } from 'express';

export interface Response<T> {
  status: string;
  data: T;
  metadata: {
    timestamp: string;
    path: string;
    executionTime: number;
  };
  pagination?: any;
}

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, Response<T>> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<Response<T>> {
    const request = context.switchToHttp().getRequest<Request>();
    const startTime = Date.now();

    return next.handle().pipe(
      map(data => {
        const executionTime = Date.now() - startTime;
        const { pagination, ...responseData } = data || {};
        
        return {
          status: 'success',
          data: responseData.data || responseData,
          metadata: {
            timestamp: new Date().toISOString(),
            path: request.url,
            executionTime,
          },
          pagination,
        };
      }),
    );
  }
}