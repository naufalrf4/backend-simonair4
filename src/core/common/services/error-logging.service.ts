import { Injectable, Logger } from '@nestjs/common';

export interface ErrorLogContext {
  deviceId?: string;
  userId?: string;
  userEmail?: string;
  requestId?: string;
  executionTime?: number;
  errorType?: string;
  originalError?: string;
  stack?: string;
  method?: string;
  url?: string;
  statusCode?: number;
  timestamp?: string;
  [key: string]: any;
}

export interface MqttErrorContext extends ErrorLogContext {
  topic?: string;
  payloadSize?: number;
  qos?: number;
  messageId?: string;
  brokerUrl?: string;
  clientId?: string;
  reconnectAttempts?: number;
  operation?: string;
}

@Injectable()
export class ErrorLoggingService {
  private readonly logger = new Logger(ErrorLoggingService.name);

  /**
   * Log MQTT-related errors with structured context
   */
  logMqttError(
    message: string,
    context: MqttErrorContext,
    severity: 'error' | 'warn' | 'log' = 'error',
  ): void {
    const structuredContext = {
      ...context,
      timestamp: context.timestamp || new Date().toISOString(),
      errorCategory: 'MQTT',
    };

    switch (severity) {
      case 'error':
        this.logger.error(message, structuredContext);
        break;
      case 'warn':
        this.logger.warn(message, structuredContext);
        break;
      case 'log':
        this.logger.log(message, structuredContext);
        break;
    }
  }

  /**
   * Log validation errors with detailed field information
   */
  logValidationError(
    message: string,
    context: ErrorLogContext & {
      validationErrors?: Array<{
        field: string;
        value: any;
        constraint: string;
        message: string;
      }>;
    },
  ): void {
    const structuredContext = {
      ...context,
      timestamp: context.timestamp || new Date().toISOString(),
      errorCategory: 'VALIDATION',
    };

    this.logger.warn(message, structuredContext);
  }

  /**
   * Log device access errors
   */
  logDeviceAccessError(
    message: string,
    context: ErrorLogContext & {
      attemptedAction?: string;
      deviceOwner?: string;
    },
  ): void {
    const structuredContext = {
      ...context,
      timestamp: context.timestamp || new Date().toISOString(),
      errorCategory: 'DEVICE_ACCESS',
    };

    this.logger.warn(message, structuredContext);
  }

  /**
   * Log service-level errors with comprehensive context
   */
  logServiceError(
    message: string,
    context: ErrorLogContext & {
      serviceName?: string;
      methodName?: string;
      inputParameters?: Record<string, any>;
    },
    severity: 'error' | 'warn' = 'error',
  ): void {
    const structuredContext = {
      ...context,
      timestamp: context.timestamp || new Date().toISOString(),
      errorCategory: 'SERVICE',
    };

    if (severity === 'error') {
      this.logger.error(message, structuredContext);
    } else {
      this.logger.warn(message, structuredContext);
    }
  }

  /**
   * Log database-related errors
   */
  logDatabaseError(
    message: string,
    context: ErrorLogContext & {
      query?: string;
      table?: string;
      operation?: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE';
    },
  ): void {
    const structuredContext = {
      ...context,
      timestamp: context.timestamp || new Date().toISOString(),
      errorCategory: 'DATABASE',
    };

    this.logger.error(message, structuredContext);
  }

  /**
   * Log authentication and authorization errors
   */
  logAuthError(
    message: string,
    context: ErrorLogContext & {
      authType?: 'JWT' | 'ROLE' | 'DEVICE_OWNERSHIP';
      requiredRole?: string;
      userRole?: string;
      tokenExpired?: boolean;
    },
  ): void {
    const structuredContext = {
      ...context,
      timestamp: context.timestamp || new Date().toISOString(),
      errorCategory: 'AUTHENTICATION',
    };

    this.logger.warn(message, structuredContext);
  }

  /**
   * Log successful operations for audit purposes
   */
  logSuccessfulOperation(
    message: string,
    context: ErrorLogContext & {
      operation?: string;
      resourceId?: string;
      resourceType?: string;
    },
  ): void {
    const structuredContext = {
      ...context,
      timestamp: context.timestamp || new Date().toISOString(),
      category: 'SUCCESS_AUDIT',
    };

    this.logger.log(message, structuredContext);
  }

  /**
   * Log performance metrics and slow operations
   */
  logPerformanceMetric(
    message: string,
    context: ErrorLogContext & {
      operation?: string;
      threshold?: number;
      actualTime?: number;
      performanceImpact?: 'LOW' | 'MEDIUM' | 'HIGH';
    },
  ): void {
    const structuredContext = {
      ...context,
      timestamp: context.timestamp || new Date().toISOString(),
      category: 'PERFORMANCE',
    };

    if (context.performanceImpact === 'HIGH') {
      this.logger.error(message, structuredContext);
    } else if (context.performanceImpact === 'MEDIUM') {
      this.logger.warn(message, structuredContext);
    } else {
      this.logger.log(message, structuredContext);
    }
  }

  /**
   * Create standardized error context from HTTP request
   */
  createHttpErrorContext(
    request: any,
    user?: any,
    additionalContext?: Record<string, any>,
  ): ErrorLogContext {
    return {
      method: request.method,
      url: request.url,
      userId: user?.id,
      userEmail: user?.email,
      requestId: request.headers?.['x-request-id'],
      timestamp: new Date().toISOString(),
      ip: request.ip,
      userAgent: request.headers?.['user-agent'],
      ...additionalContext,
    };
  }

  /**
   * Create standardized MQTT error context
   */
  createMqttErrorContext(
    deviceId?: string,
    topic?: string,
    additionalContext?: Record<string, any>,
  ): MqttErrorContext {
    return {
      deviceId,
      topic,
      timestamp: new Date().toISOString(),
      errorCategory: 'MQTT',
      ...additionalContext,
    };
  }
}
