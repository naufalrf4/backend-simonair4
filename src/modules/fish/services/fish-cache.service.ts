import { Injectable, Logger } from '@nestjs/common';

interface CacheItem<T> {
  data: T;
  expiry: number;
}

interface CacheStats {
  hits: number;
  misses: number;
  evictions: number;
  itemCount: number;
}

@Injectable()
export class FishCacheService {
  private readonly logger = new Logger(FishCacheService.name);
  private readonly cache = new Map<string, CacheItem<any>>();
  private readonly maxCacheSize = 1000; // Maximum number of items in cache
  private readonly defaultTtl = 5 * 60 * 1000; // 5 minutes in milliseconds
  
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    evictions: 0,
    itemCount: 0,
  };

  /**
   * Get item from cache
   */
  get<T>(key: string): T | null {
    const item = this.cache.get(key);
    
    if (!item) {
      this.stats.misses++;
      return null;
    }
    
    // Check if item has expired
    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      this.stats.misses++;
      this.stats.evictions++;
      this.updateItemCount();
      return null;
    }
    
    this.stats.hits++;
    return item.data;
  }

  /**
   * Set item in cache
   */
  set<T>(key: string, data: T, ttlMs?: number): void {
    const ttl = ttlMs || this.defaultTtl;
    
    // Evict oldest items if cache is full
    if (this.cache.size >= this.maxCacheSize && !this.cache.has(key)) {
      this.evictOldest();
    }
    
    this.cache.set(key, {
      data,
      expiry: Date.now() + ttl,
    });
    
    this.updateItemCount();
  }

  /**
   * Delete item from cache
   */
  delete(key: string): boolean {
    const deleted = this.cache.delete(key);
    if (deleted) {
      this.updateItemCount();
    }
    return deleted;
  }

  /**
   * Clear all cache items
   */
  clear(): void {
    this.cache.clear();
    this.updateItemCount();
    this.logger.log('Cache cleared');
  }

  /**
   * Get or set item in cache
   */
  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    ttlMs?: number,
  ): Promise<T> {
    const cached = this.get<T>(key);
    if (cached !== null) {
      return cached;
    }
    
    const data = await factory();
    this.set(key, data, ttlMs);
    return data;
  }

  /**
   * Check if key exists in cache
   */
  has(key: string): boolean {
    const item = this.cache.get(key);
    if (!item) return false;
    
    // Check if expired
    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      this.stats.evictions++;
      this.updateItemCount();
      return false;
    }
    
    return true;
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    return { ...this.stats };
  }

  /**
   * Get cache hit rate
   */
  getHitRate(): number {
    const total = this.stats.hits + this.stats.misses;
    if (total === 0) return 0;
    return this.stats.hits / total;
  }

  /**
   * Generate cache key for analytics
   */
  generateAnalyticsKey(deviceIds: string[], startDate?: Date, endDate?: Date): string {
    const deviceKey = deviceIds.sort().join(',');
    const dateKey = `${startDate?.toISOString() || 'null'}_${endDate?.toISOString() || 'null'}`;
    return `analytics:${deviceKey}:${dateKey}`;
  }

  /**
   * Generate cache key for growth statistics
   */
  generateGrowthStatsKey(deviceIds?: string[], startDate?: Date, endDate?: Date): string {
    const deviceKey = deviceIds?.sort().join(',') || 'all';
    const dateKey = `${startDate?.toISOString() || 'null'}_${endDate?.toISOString() || 'null'}`;
    return `growth_stats:${deviceKey}:${dateKey}`;
  }

  /**
   * Generate cache key for predictions
   */
  generatePredictionsKey(deviceId: string, days: number): string {
    return `predictions:${deviceId}:${days}d`;
  }

  /**
   * Generate cache key for trends
   */
  generateTrendsKey(deviceId: string, period: string): string {
    return `trends:${deviceId}:${period}`;
  }

  /**
   * Clean up expired items
   */
  cleanupExpired(): number {
    let cleaned = 0;
    const now = Date.now();
    
    for (const [key, item] of this.cache.entries()) {
      if (now > item.expiry) {
        this.cache.delete(key);
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      this.stats.evictions += cleaned;
      this.updateItemCount();
      this.logger.log(`Cleaned up ${cleaned} expired cache items`);
    }
    
    return cleaned;
  }

  /**
   * Evict oldest items when cache is full
   */
  private evictOldest(): void {
    // Since Map maintains insertion order, the first item is the oldest
    const firstKey = this.cache.keys().next().value;
    if (firstKey) {
      this.cache.delete(firstKey);
      this.stats.evictions++;
      this.logger.debug(`Evicted oldest cache item: ${firstKey}`);
    }
  }

  /**
   * Update item count in stats
   */
  private updateItemCount(): void {
    this.stats.itemCount = this.cache.size;
  }

  /**
   * Start cleanup interval
   */
  startCleanupInterval(): void {
    // Clean up expired items every 5 minutes
    setInterval(() => {
      this.cleanupExpired();
    }, 5 * 60 * 1000);
    
    this.logger.log('Cache cleanup interval started');
  }

  /**
   * Get cache memory usage estimation
   */
  getMemoryUsage(): {
    estimatedSizeKB: number;
    itemCount: number;
    averageItemSizeKB: number;
  } {
    const itemCount = this.cache.size;
    if (itemCount === 0) {
      return { estimatedSizeKB: 0, itemCount: 0, averageItemSizeKB: 0 };
    }
    
    // Rough estimation - each item including key and metadata
    const averageItemSize = 2; // KB per item (rough estimate)
    const totalSize = itemCount * averageItemSize;
    
    return {
      estimatedSizeKB: totalSize,
      itemCount,
      averageItemSizeKB: averageItemSize,
    };
  }
}