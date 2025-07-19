import { Injectable, Logger } from '@nestjs/common';
import { ComparisonReport } from './measurement-comparison.service';

export interface CacheEntry<T> {
  data: T;
  timestamp: Date;
  expiresAt: Date;
}

@Injectable()
export class ComparisonCacheService {
  private readonly logger = new Logger(ComparisonCacheService.name);
  private readonly cache = new Map<string, CacheEntry<ComparisonReport>>();
  private readonly DEFAULT_TTL = 300000; // 5 minutes in milliseconds

  /**
   * Generate cache key for a comparison result
   */
  private generateCacheKey(
    measurementId: string,
    timeWindowMinutes: number,
  ): string {
    return `comparison:${measurementId}:${timeWindowMinutes}`;
  }

  /**
   * Store comparison result in cache
   */
  set(
    measurementId: string,
    timeWindowMinutes: number,
    report: ComparisonReport,
    ttlMs: number = this.DEFAULT_TTL,
  ): void {
    const key = this.generateCacheKey(measurementId, timeWindowMinutes);
    const now = new Date();
    const expiresAt = new Date(now.getTime() + ttlMs);

    const entry: CacheEntry<ComparisonReport> = {
      data: report,
      timestamp: now,
      expiresAt,
    };

    this.cache.set(key, entry);

    this.logger.debug(`Cached comparison result for measurement ${measurementId}`, {
      measurementId,
      timeWindowMinutes,
      ttlMs,
      cacheKey: key,
      expiresAt: expiresAt.toISOString(),
    });
  }

  /**
   * Get comparison result from cache
   */
  get(
    measurementId: string,
    timeWindowMinutes: number,
  ): ComparisonReport | null {
    const key = this.generateCacheKey(measurementId, timeWindowMinutes);
    const entry = this.cache.get(key);

    if (!entry) {
      this.logger.debug(`Cache miss for measurement ${measurementId}`, {
        measurementId,
        timeWindowMinutes,
        cacheKey: key,
      });
      return null;
    }

    const now = new Date();
    if (now > entry.expiresAt) {
      this.cache.delete(key);
      this.logger.debug(`Cache entry expired for measurement ${measurementId}`, {
        measurementId,
        timeWindowMinutes,
        cacheKey: key,
        expiredAt: entry.expiresAt.toISOString(),
      });
      return null;
    }

    this.logger.debug(`Cache hit for measurement ${measurementId}`, {
      measurementId,
      timeWindowMinutes,
      cacheKey: key,
      cachedAt: entry.timestamp.toISOString(),
    });

    return entry.data;
  }

  /**
   * Remove comparison result from cache
   */
  delete(measurementId: string, timeWindowMinutes: number): boolean {
    const key = this.generateCacheKey(measurementId, timeWindowMinutes);
    const deleted = this.cache.delete(key);

    if (deleted) {
      this.logger.debug(`Removed cache entry for measurement ${measurementId}`, {
        measurementId,
        timeWindowMinutes,
        cacheKey: key,
      });
    }

    return deleted;
  }

  /**
   * Clear all cache entries for a specific measurement
   */
  clearMeasurement(measurementId: string): number {
    let deletedCount = 0;
    const keysToDelete: string[] = [];

    for (const [key] of this.cache.entries()) {
      if (key.startsWith(`comparison:${measurementId}:`)) {
        keysToDelete.push(key);
      }
    }

    for (const key of keysToDelete) {
      this.cache.delete(key);
      deletedCount++;
    }

    if (deletedCount > 0) {
      this.logger.debug(`Cleared ${deletedCount} cache entries for measurement ${measurementId}`, {
        measurementId,
        deletedCount,
      });
    }

    return deletedCount;
  }

  /**
   * Clear all expired cache entries
   */
  clearExpired(): number {
    let deletedCount = 0;
    const now = new Date();
    const keysToDelete: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        keysToDelete.push(key);
      }
    }

    for (const key of keysToDelete) {
      this.cache.delete(key);
      deletedCount++;
    }

    if (deletedCount > 0) {
      this.logger.debug(`Cleared ${deletedCount} expired cache entries`, {
        deletedCount,
        totalEntries: this.cache.size,
      });
    }

    return deletedCount;
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    const totalEntries = this.cache.size;
    this.cache.clear();

    this.logger.debug(`Cleared all cache entries`, {
      totalEntries,
    });
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    totalEntries: number;
    expiredEntries: number;
    memoryUsage: number;
  } {
    const now = new Date();
    let expiredEntries = 0;

    for (const [, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        expiredEntries++;
      }
    }

    // Rough memory usage estimation
    const memoryUsage = this.cache.size * 1024; // Estimate 1KB per entry

    return {
      totalEntries: this.cache.size,
      expiredEntries,
      memoryUsage,
    };
  }

  /**
   * Check if cache has an entry for a measurement
   */
  has(measurementId: string, timeWindowMinutes: number): boolean {
    const key = this.generateCacheKey(measurementId, timeWindowMinutes);
    const entry = this.cache.get(key);

    if (!entry) {
      return false;
    }

    const now = new Date();
    if (now > entry.expiresAt) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }
}
