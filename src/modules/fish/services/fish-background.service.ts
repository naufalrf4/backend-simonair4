import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { FishGrowthRepository } from '../fish-growth.repository';
import { FishAnalyticsService } from './fish-analytics.service';
import { FishCacheService } from './fish-cache.service';
import { BackgroundJobException } from '../exceptions/fish-growth.exceptions';

export interface BackgroundJob {
  id: string;
  name: string;
  type: 'scheduled' | 'recurring';
  status: 'pending' | 'running' | 'completed' | 'failed';
  lastRun?: Date;
  nextRun?: Date;
  duration?: number;
  error?: string;
  metadata?: Record<string, any>;
  intervalMs: number;
}

export interface BackgroundJobResult {
  success: boolean;
  duration: number;
  itemsProcessed: number;
  errors: string[];
  metadata?: Record<string, any>;
}

@Injectable()
export class FishBackgroundService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(FishBackgroundService.name);
  private readonly jobs = new Map<string, BackgroundJob>();
  private readonly jobQueue: Array<() => Promise<void>> = [];
  private readonly scheduledJobs = new Map<string, NodeJS.Timeout>();
  private isProcessingQueue = false;

  constructor(
    private readonly fishGrowthRepository: FishGrowthRepository,
    private readonly analyticsService: FishAnalyticsService,
    private readonly cacheService: FishCacheService,
  ) {
    this.initializeJobs();
  }

  /**
   * Initialize module and start background jobs
   */
  async onModuleInit(): Promise<void> {
    this.logger.log('Initializing background processing service');
    this.startAllJobs();
  }

  /**
   * Clean up when module is destroyed
   */
  async onModuleDestroy(): Promise<void> {
    this.logger.log('Stopping background processing service');
    this.stopAllJobs();
  }

  /**
   * Initialize background jobs
   */
  private initializeJobs(): void {
    const jobs: BackgroundJob[] = [
      {
        id: 'data_integrity_check',
        name: 'Data Integrity Check',
        type: 'recurring',
        status: 'pending',
        intervalMs: 4 * 60 * 60 * 1000, // 4 hours
        nextRun: new Date(Date.now() + 60 * 60 * 1000), // 1 hour from now
      },
      {
        id: 'cache_cleanup',
        name: 'Cache Cleanup',
        type: 'recurring',
        status: 'pending',
        intervalMs: 5 * 60 * 1000, // 5 minutes
        nextRun: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes from now
      },
      {
        id: 'analytics_precompute',
        name: 'Analytics Precomputation',
        type: 'recurring',
        status: 'pending',
        intervalMs: 30 * 60 * 1000, // 30 minutes
        nextRun: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes from now
      },
      {
        id: 'data_cleanup',
        name: 'Old Data Cleanup',
        type: 'recurring',
        status: 'pending',
        intervalMs: 24 * 60 * 60 * 1000, // 24 hours
        nextRun: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
      },
      {
        id: 'health_monitoring',
        name: 'Health Monitoring',
        type: 'recurring',
        status: 'pending',
        intervalMs: 2 * 60 * 1000, // 2 minutes
        nextRun: new Date(Date.now() + 2 * 60 * 1000), // 2 minutes from now
      },
    ];

    jobs.forEach(job => this.jobs.set(job.id, job));
    this.logger.log(`Initialized ${jobs.length} background jobs`);
  }

  /**
   * Start all background jobs
   */
  private startAllJobs(): void {
    for (const [jobId, job] of this.jobs) {
      this.scheduleJob(jobId, job);
    }
  }

  /**
   * Stop all background jobs
   */
  private stopAllJobs(): void {
    for (const [jobId, timeout] of this.scheduledJobs) {
      clearTimeout(timeout);
      this.scheduledJobs.delete(jobId);
    }
  }

  /**
   * Schedule a recurring job
   */
  private scheduleJob(jobId: string, job: BackgroundJob): void {
    const timeout = setTimeout(() => {
      this.runJob(jobId);
    }, job.intervalMs);

    this.scheduledJobs.set(jobId, timeout);
  }

  /**
   * Run a specific job
   */
  private async runJob(jobId: string): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job) {
      this.logger.error(`Job ${jobId} not found`);
      return;
    }

    try {
      switch (jobId) {
        case 'data_integrity_check':
          await this.performDataIntegrityCheck();
          break;
        case 'cache_cleanup':
          await this.performCacheCleanup();
          break;
        case 'analytics_precompute':
          await this.performAnalyticsPrecomputation();
          break;
        case 'data_cleanup':
          await this.performDataCleanup();
          break;
        case 'health_monitoring':
          await this.performHealthMonitoring();
          break;
        default:
          this.logger.warn(`Unknown job: ${jobId}`);
      }
    } catch (error) {
      this.logger.error(`Job ${jobId} failed:`, error.stack);
    }

    // Schedule next run
    if (job.type === 'recurring') {
      this.scheduleJob(jobId, job);
    }
  }

  /**
   * Data integrity check
   */
  async performDataIntegrityCheck(): Promise<void> {
    const jobId = 'data_integrity_check';
    await this.executeJob(jobId, async () => {
      this.logger.log('Starting data integrity check');
      
      const startTime = Date.now();
      const result = await this.fishGrowthRepository.validateDataIntegrity();
      const duration = Date.now() - startTime;
      
      this.logger.log(`Data integrity check completed in ${duration}ms`);
      this.logger.log(`Found ${result.invalidRecords} invalid records out of ${result.totalRecords}`);
      
      if (result.issues.length > 0) {
        this.logger.warn(`Data integrity issues found: ${result.issues.length}`);
        result.issues.forEach(issue => {
          this.logger.warn(`- ${issue.description} (${issue.severity})`);
        });
      }
      
      return {
        success: true,
        duration,
        itemsProcessed: result.totalRecords,
        errors: [],
        metadata: {
          validRecords: result.validRecords,
          invalidRecords: result.invalidRecords,
          issues: result.issues.length,
        },
      };
    });
  }

  /**
   * Cache cleanup
   */
  async performCacheCleanup(): Promise<void> {
    const jobId = 'cache_cleanup';
    await this.executeJob(jobId, async () => {
      this.logger.debug('Starting cache cleanup');
      
      const startTime = Date.now();
      const cleanedItems = this.cacheService.cleanupExpired();
      const duration = Date.now() - startTime;
      
      this.logger.debug(`Cache cleanup completed in ${duration}ms, cleaned ${cleanedItems} items`);
      
      return {
        success: true,
        duration,
        itemsProcessed: cleanedItems,
        errors: [],
        metadata: {
          cacheStats: this.cacheService.getStats(),
          memoryUsage: this.cacheService.getMemoryUsage(),
        },
      };
    });
  }

  /**
   * Analytics precomputation
   */
  async performAnalyticsPrecomputation(): Promise<void> {
    const jobId = 'analytics_precompute';
    await this.executeJob(jobId, async () => {
      this.logger.log('Starting analytics precomputation');
      
      const startTime = Date.now();
      let processed = 0;
      const errors: string[] = [];
      
      try {
        // Get all unique device IDs from recent records
        const recentRecords = await this.fishGrowthRepository.findByDateRange(
          new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
          new Date(),
        );
        
        const deviceIds = Array.from(new Set(recentRecords.map(r => r.device_id)));
        
        // Precompute analytics for each device
        for (const deviceId of deviceIds) {
          try {
            // Warm cache with commonly requested analytics
            await this.analyticsService.calculateGrowthRate([deviceId]);
            await this.analyticsService.calculateTrendAnalysis(deviceId);
            await this.analyticsService.generatePredictions(deviceId, 30);
            processed++;
          } catch (error) {
            errors.push(`Device ${deviceId}: ${error.message}`);
          }
        }
        
        // Precompute comprehensive statistics
        await this.analyticsService.calculateStatistics();
        
      } catch (error) {
        errors.push(`Analytics precomputation failed: ${error.message}`);
      }
      
      const duration = Date.now() - startTime;
      this.logger.log(`Analytics precomputation completed in ${duration}ms, processed ${processed} devices`);
      
      if (errors.length > 0) {
        this.logger.warn(`Analytics precomputation errors: ${errors.length}`);
      }
      
      return {
        success: errors.length === 0,
        duration,
        itemsProcessed: processed,
        errors,
        metadata: {
          devicesProcessed: processed,
          cacheHitRate: this.analyticsService.getCacheHitRate(),
        },
      };
    });
  }

  /**
   * Data cleanup
   */
  async performDataCleanup(): Promise<void> {
    const jobId = 'data_cleanup';
    await this.executeJob(jobId, async () => {
      this.logger.log('Starting data cleanup');
      
      const startTime = Date.now();
      let processed = 0;
      const errors: string[] = [];
      
      try {
        // Find and clean up duplicate records
        const duplicates = await this.fishGrowthRepository.findDuplicates();
        
        if (duplicates.length > 0) {
          this.logger.log(`Found ${duplicates.length} duplicate records`);
          
          // Group duplicates by device and date
          const duplicateGroups = new Map<string, typeof duplicates>();
          
          for (const record of duplicates) {
            const key = `${record.device_id}_${record.measurement_date.toISOString()}`;
            if (!duplicateGroups.has(key)) {
              duplicateGroups.set(key, []);
            }
            duplicateGroups.get(key)?.push(record);
          }
          
          // Keep the most recent record in each group, remove others
          for (const [key, group] of duplicateGroups) {
            if (group.length > 1) {
              const sorted = group.sort((a, b) => 
                new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
              );
              
              // Remove all but the first (most recent)
              const toRemove = sorted.slice(1);
              for (const record of toRemove) {
                try {
                  await this.fishGrowthRepository.remove(record.id);
                  processed++;
                } catch (error) {
                  errors.push(`Failed to remove duplicate ${record.id}: ${error.message}`);
                }
              }
            }
          }
        }
        
        // Clean up analytics cache
        this.analyticsService.clearCache();
        
      } catch (error) {
        errors.push(`Data cleanup failed: ${error.message}`);
      }
      
      const duration = Date.now() - startTime;
      this.logger.log(`Data cleanup completed in ${duration}ms, processed ${processed} records`);
      
      return {
        success: errors.length === 0,
        duration,
        itemsProcessed: processed,
        errors,
        metadata: {
          duplicatesRemoved: processed,
        },
      };
    });
  }

  /**
   * Health monitoring
   */
  async performHealthMonitoring(): Promise<void> {
    const jobId = 'health_monitoring';
    await this.executeJob(jobId, async () => {
      this.logger.debug('Starting health monitoring');
      
      const startTime = Date.now();
      const errors: string[] = [];
      let healthScore = 100;
      
      try {
        // Check database connectivity
        const totalRecords = await this.fishGrowthRepository.validateDataIntegrity();
        
        // Check cache health
        const cacheStats = this.cacheService.getStats();
        const cacheHitRate = this.cacheService.getHitRate();
        
        // Check memory usage
        const memoryUsage = this.cacheService.getMemoryUsage();
        
        // Calculate health score
        if (cacheHitRate < 0.5) {
          healthScore -= 10;
          errors.push('Low cache hit rate');
        }
        
        if (memoryUsage.estimatedSizeKB > 100000) { // 100MB
          healthScore -= 15;
          errors.push('High memory usage');
        }
        
        if (totalRecords.invalidRecords > totalRecords.totalRecords * 0.1) { // > 10% invalid
          healthScore -= 20;
          errors.push('High invalid record ratio');
        }
        
        // Log health status
        if (healthScore < 80) {
          this.logger.warn(`System health score: ${healthScore}%, issues: ${errors.join(', ')}`);
        } else {
          this.logger.debug(`System health score: ${healthScore}%`);
        }
        
      } catch (error) {
        errors.push(`Health monitoring failed: ${error.message}`);
        healthScore = 0;
      }
      
      const duration = Date.now() - startTime;
      
      return {
        success: healthScore > 50,
        duration,
        itemsProcessed: 1,
        errors,
        metadata: {
          healthScore,
          cacheHitRate: this.cacheService.getHitRate(),
          memoryUsage: this.cacheService.getMemoryUsage(),
        },
      };
    });
  }

  /**
   * Execute a background job with error handling and tracking
   */
  private async executeJob(
    jobId: string,
    jobFunction: () => Promise<BackgroundJobResult>,
  ): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job) {
      this.logger.error(`Job ${jobId} not found`);
      return;
    }

    // Skip if already running
    if (job.status === 'running') {
      this.logger.warn(`Job ${jobId} is already running, skipping`);
      return;
    }

    // Update job status
    job.status = 'running';
    job.lastRun = new Date();

    try {
      const result = await jobFunction();
      
      // Update job with results
      job.status = result.success ? 'completed' : 'failed';
      job.duration = result.duration;
      job.error = result.errors.length > 0 ? result.errors.join('; ') : undefined;
      job.metadata = result.metadata;
      
      if (!result.success) {
        this.logger.error(`Job ${jobId} failed: ${result.errors.join('; ')}`);
      }
      
    } catch (error) {
      job.status = 'failed';
      job.error = error.message;
      
      this.logger.error(`Job ${jobId} execution failed:`, error.stack);
      
      throw new BackgroundJobException(
        job.type,
        jobId,
        error.message,
        undefined,
        { jobName: job.name },
      );
    } finally {
      // Schedule next run for recurring jobs
      if (job.type === 'recurring') {
        job.nextRun = new Date(Date.now() + job.intervalMs);
      }
      
      this.jobs.set(jobId, job);
    }
  }

  /**
   * Get job status
   */
  getJobStatus(jobId: string): BackgroundJob | undefined {
    return this.jobs.get(jobId);
  }

  /**
   * Get all job statuses
   */
  getAllJobStatuses(): BackgroundJob[] {
    return Array.from(this.jobs.values());
  }

  /**
   * Queue a custom job
   */
  queueJob(jobFunction: () => Promise<void>): void {
    this.jobQueue.push(jobFunction);
    this.processQueue();
  }

  /**
   * Process job queue
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessingQueue || this.jobQueue.length === 0) {
      return;
    }

    this.isProcessingQueue = true;

    while (this.jobQueue.length > 0) {
      const job = this.jobQueue.shift();
      if (job) {
        try {
          await job();
        } catch (error) {
          this.logger.error('Queued job failed:', error.stack);
        }
      }
    }

    this.isProcessingQueue = false;
  }

  /**
   * Get background processing statistics
   */
  getStatistics(): {
    totalJobs: number;
    runningJobs: number;
    completedJobs: number;
    failedJobs: number;
    queueSize: number;
    averageDuration: number;
  } {
    const jobs = Array.from(this.jobs.values());
    const completedJobs = jobs.filter(j => j.status === 'completed');
    const averageDuration = completedJobs.length > 0 
      ? completedJobs.reduce((sum, j) => sum + (j.duration || 0), 0) / completedJobs.length 
      : 0;

    return {
      totalJobs: jobs.length,
      runningJobs: jobs.filter(j => j.status === 'running').length,
      completedJobs: completedJobs.length,
      failedJobs: jobs.filter(j => j.status === 'failed').length,
      queueSize: this.jobQueue.length,
      averageDuration: Math.round(averageDuration),
    };
  }

  /**
   * Force run a job
   */
  async forceRunJob(jobId: string): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job) {
      throw new Error(`Job ${jobId} not found`);
    }

    this.logger.log(`Force running job: ${jobId}`);
    await this.runJob(jobId);
  }

  /**
   * Stop a specific job
   */
  stopJob(jobId: string): void {
    const timeout = this.scheduledJobs.get(jobId);
    if (timeout) {
      clearTimeout(timeout);
      this.scheduledJobs.delete(jobId);
      this.logger.log(`Stopped job: ${jobId}`);
    }
  }

  /**
   * Start a specific job
   */
  startJob(jobId: string): void {
    const job = this.jobs.get(jobId);
    if (job) {
      this.scheduleJob(jobId, job);
      this.logger.log(`Started job: ${jobId}`);
    }
  }
}