import { Injectable, Logger } from '@nestjs/common';
import { ManualMeasurementException } from './manual-measurement.exceptions';

export interface ErrorMetrics {
  totalErrors: number;
  errorsByType: Record<string, number>;
  errorsByStatus: Record<number, number>;
  averageErrorsPerHour: number;
  lastErrorTimestamp?: Date;
  topErrors: Array<{
    type: string;
    count: number;
    lastOccurrence: Date;
    sampleMessage: string;
  }>;
}

export interface ErrorLogEntry {
  correlationId: string;
  errorType: string;
  message: string;
  statusCode: number;
  timestamp: Date;
  context: Record<string, any>;
  userId?: string;
  deviceId?: string;
  path: string;
  method: string;
  userAgent?: string;
  ip?: string;
  stack?: string;
  resolved: boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

@Injectable()
export class ManualMeasurementErrorService {
  private readonly logger = new Logger(ManualMeasurementErrorService.name);
  private readonly errorLogs: Map<string, ErrorLogEntry> = new Map();
  private readonly errorMetrics: ErrorMetrics = {
    totalErrors: 0,
    errorsByType: {},
    errorsByStatus: {},
    averageErrorsPerHour: 0,
    topErrors: [],
  };

  /**
   * Log a manual measurement exception with enhanced context
   */
  logException(
    exception: ManualMeasurementException,
    request: {
      path: string;
      method: string;
      userAgent?: string;
      ip?: string;
      userId?: string;
      deviceId?: string;
    },
  ): void {
    const severity = this.determineSeverity(exception);
    
    const errorEntry: ErrorLogEntry = {
      correlationId: exception.correlationId,
      errorType: exception.constructor.name,
      message: exception.message,
      statusCode: exception.getStatus(),
      timestamp: exception.timestamp,
      context: exception.context,
      userId: request.userId,
      deviceId: request.deviceId || exception.context.deviceId,
      path: request.path,
      method: request.method,
      userAgent: request.userAgent,
      ip: request.ip,
      stack: exception.stack,
      resolved: false,
      severity,
    };

    // Store error log
    this.errorLogs.set(exception.correlationId, errorEntry);

    // Update metrics
    this.updateMetrics(errorEntry);

    // Log based on severity
    this.logBySeverity(errorEntry);

    // Check for error patterns
    this.checkErrorPatterns(errorEntry);

    // Cleanup old logs (keep last 1000 entries)
    if (this.errorLogs.size > 1000) {
      const oldestKey = this.errorLogs.keys().next().value;
      this.errorLogs.delete(oldestKey);
    }
  }

  /**
   * Log a general error with context
   */
  logError(
    error: Error,
    context: {
      operation: string;
      correlationId?: string;
      userId?: string;
      deviceId?: string;
      path?: string;
      method?: string;
    },
  ): void {
    const correlationId = context.correlationId || this.generateCorrelationId();
    const severity = this.determineErrorSeverity(error);

    const errorEntry: ErrorLogEntry = {
      correlationId,
      errorType: error.name,
      message: error.message,
      statusCode: 500,
      timestamp: new Date(),
      context: { operation: context.operation },
      userId: context.userId,
      deviceId: context.deviceId,
      path: context.path || 'unknown',
      method: context.method || 'unknown',
      stack: error.stack,
      resolved: false,
      severity,
    };

    this.errorLogs.set(correlationId, errorEntry);
    this.updateMetrics(errorEntry);
    this.logBySeverity(errorEntry);
  }

  /**
   * Get error metrics and statistics
   */
  getErrorMetrics(): ErrorMetrics {
    return {
      ...this.errorMetrics,
      topErrors: this.calculateTopErrors(),
      averageErrorsPerHour: this.calculateAverageErrorsPerHour(),
    };
  }

  /**
   * Get error logs with filtering options
   */
  getErrorLogs(filters: {
    severity?: 'low' | 'medium' | 'high' | 'critical';
    errorType?: string;
    userId?: string;
    deviceId?: string;
    startDate?: Date;
    endDate?: Date;
    resolved?: boolean;
    limit?: number;
  } = {}): ErrorLogEntry[] {
    let logs = Array.from(this.errorLogs.values());

    // Apply filters
    if (filters.severity) {
      logs = logs.filter(log => log.severity === filters.severity);
    }

    if (filters.errorType) {
      logs = logs.filter(log => log.errorType === filters.errorType);
    }

    if (filters.userId) {
      logs = logs.filter(log => log.userId === filters.userId);
    }

    if (filters.deviceId) {
      logs = logs.filter(log => log.deviceId === filters.deviceId);
    }

    if (filters.startDate) {
      logs = logs.filter(log => log.timestamp >= filters.startDate!);
    }

    if (filters.endDate) {
      logs = logs.filter(log => log.timestamp <= filters.endDate!);
    }

    if (filters.resolved !== undefined) {
      logs = logs.filter(log => log.resolved === filters.resolved);
    }

    // Sort by timestamp (newest first)
    logs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    // Apply limit
    if (filters.limit) {
      logs = logs.slice(0, filters.limit);
    }

    return logs;
  }

  /**
   * Mark an error as resolved
   */
  markErrorResolved(correlationId: string, resolvedBy?: string): boolean {
    const errorEntry = this.errorLogs.get(correlationId);
    if (errorEntry) {
      errorEntry.resolved = true;
      errorEntry.context.resolvedBy = resolvedBy;
      errorEntry.context.resolvedAt = new Date().toISOString();
      return true;
    }
    return false;
  }

  /**
   * Get error details by correlation ID
   */
  getErrorByCorrelationId(correlationId: string): ErrorLogEntry | undefined {
    return this.errorLogs.get(correlationId);
  }

  /**
   * Check for recurring error patterns and alert if necessary
   */
  private checkErrorPatterns(errorEntry: ErrorLogEntry): void {
    const recentErrors = this.getErrorLogs({
      errorType: errorEntry.errorType,
      startDate: new Date(Date.now() - 60 * 60 * 1000), // Last hour
      resolved: false,
    });

    // Alert if same error type occurs frequently
    if (recentErrors.length >= 10) {
      this.logger.warn(
        `High frequency error pattern detected: ${errorEntry.errorType} occurred ${recentErrors.length} times in the last hour`,
        {
          errorType: errorEntry.errorType,
          occurrences: recentErrors.length,
          correlationIds: recentErrors.map(e => e.correlationId),
        },
      );
    }

    // Alert for critical errors
    if (errorEntry.severity === 'critical') {
      this.logger.error(
        `CRITICAL ERROR DETECTED: ${errorEntry.message}`,
        {
          correlationId: errorEntry.correlationId,
          errorType: errorEntry.errorType,
          context: errorEntry.context,
          timestamp: errorEntry.timestamp,
        },
      );
    }

    // Check for device-specific issues
    if (errorEntry.deviceId) {
      const deviceErrors = this.getErrorLogs({
        deviceId: errorEntry.deviceId,
        startDate: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
        resolved: false,
      });

      if (deviceErrors.length >= 5) {
        this.logger.warn(
          `Device-specific error pattern: Device ${errorEntry.deviceId} has ${deviceErrors.length} unresolved errors in 24 hours`,
          {
            deviceId: errorEntry.deviceId,
            errorCount: deviceErrors.length,
            errorTypes: [...new Set(deviceErrors.map(e => e.errorType))],
          },
        );
      }
    }
  }

  /**
   * Determine error severity based on exception type
   */
  private determineSeverity(exception: ManualMeasurementException): 'low' | 'medium' | 'high' | 'critical' {
    const errorType = exception.constructor.name;
    const statusCode = exception.getStatus();

    // Critical errors
    if (statusCode >= 500 || errorType.includes('Database') || errorType.includes('ExternalService')) {
      return 'critical';
    }

    // High priority errors
    if (statusCode === 403 || errorType.includes('Access') || errorType.includes('Security')) {
      return 'high';
    }

    // Medium priority errors
    if (statusCode === 404 || errorType.includes('NotFound') || errorType.includes('Comparison')) {
      return 'medium';
    }

    // Low priority errors (validation, etc.)
    return 'low';
  }

  /**
   * Determine error severity for general errors
   */
  private determineErrorSeverity(error: Error): 'low' | 'medium' | 'high' | 'critical' {
    const errorName = error.name.toLowerCase();
    const errorMessage = error.message.toLowerCase();

    if (errorName.includes('database') || errorMessage.includes('database')) {
      return 'critical';
    }

    if (errorName.includes('timeout') || errorMessage.includes('timeout')) {
      return 'high';
    }

    if (errorName.includes('validation') || errorMessage.includes('validation')) {
      return 'low';
    }

    return 'medium';
  }

  /**
   * Update error metrics
   */
  private updateMetrics(errorEntry: ErrorLogEntry): void {
    this.errorMetrics.totalErrors++;
    this.errorMetrics.lastErrorTimestamp = errorEntry.timestamp;

    // Update error by type
    if (!this.errorMetrics.errorsByType[errorEntry.errorType]) {
      this.errorMetrics.errorsByType[errorEntry.errorType] = 0;
    }
    this.errorMetrics.errorsByType[errorEntry.errorType]++;

    // Update error by status
    if (!this.errorMetrics.errorsByStatus[errorEntry.statusCode]) {
      this.errorMetrics.errorsByStatus[errorEntry.statusCode] = 0;
    }
    this.errorMetrics.errorsByStatus[errorEntry.statusCode]++;
  }

  /**
   * Log error based on severity
   */
  private logBySeverity(errorEntry: ErrorLogEntry): void {
    const logContext = {
      correlationId: errorEntry.correlationId,
      errorType: errorEntry.errorType,
      statusCode: errorEntry.statusCode,
      userId: errorEntry.userId,
      deviceId: errorEntry.deviceId,
      path: errorEntry.path,
      method: errorEntry.method,
    };

    switch (errorEntry.severity) {
      case 'critical':
        this.logger.error(`CRITICAL: ${errorEntry.message}`, logContext);
        break;
      case 'high':
        this.logger.error(`HIGH: ${errorEntry.message}`, logContext);
        break;
      case 'medium':
        this.logger.warn(`MEDIUM: ${errorEntry.message}`, logContext);
        break;
      case 'low':
        this.logger.debug(`LOW: ${errorEntry.message}`, logContext);
        break;
    }
  }

  /**
   * Calculate top errors for metrics
   */
  private calculateTopErrors(): Array<{
    type: string;
    count: number;
    lastOccurrence: Date;
    sampleMessage: string;
  }> {
    const errorCounts = new Map<string, {
      count: number;
      lastOccurrence: Date;
      sampleMessage: string;
    }>();

    for (const errorEntry of this.errorLogs.values()) {
      const existing = errorCounts.get(errorEntry.errorType);
      if (existing) {
        existing.count++;
        if (errorEntry.timestamp > existing.lastOccurrence) {
          existing.lastOccurrence = errorEntry.timestamp;
          existing.sampleMessage = errorEntry.message;
        }
      } else {
        errorCounts.set(errorEntry.errorType, {
          count: 1,
          lastOccurrence: errorEntry.timestamp,
          sampleMessage: errorEntry.message,
        });
      }
    }

    return Array.from(errorCounts.entries())
      .map(([type, data]) => ({ type, ...data }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }

  /**
   * Calculate average errors per hour
   */
  private calculateAverageErrorsPerHour(): number {
    if (this.errorLogs.size === 0) return 0;

    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    
    const recentErrors = Array.from(this.errorLogs.values())
      .filter(error => error.timestamp > oneDayAgo);

    return Math.round((recentErrors.length / 24) * 100) / 100;
  }

  /**
   * Generate correlation ID
   */
  private generateCorrelationId(): string {
    return `error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
