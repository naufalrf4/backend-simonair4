import { Injectable, Logger, StreamableFile } from '@nestjs/common';
import { FishGrowthRepository } from '../fish-growth.repository';
import { FishAnalyticsService } from './fish-analytics.service';
import { FishGrowth } from '../entities/fish-growth.entity';
import { 
  ExportNotFoundException, 
  ExportFormatNotSupportedException, 
  ExportGenerationException 
} from '../exceptions/fish-growth.exceptions';
import { FishGrowthQueryDto } from '../dto/fish-growth-query.dto';
import { Readable } from 'stream';

export interface ExportOptions {
  format: 'csv' | 'excel' | 'json' | 'pdf';
  dateRange?: {
    startDate: Date;
    endDate: Date;
  };
  deviceIds?: string[];
  includeAnalytics?: boolean;
  includeCharts?: boolean;
  customFields?: string[];
  fileName?: string;
}

export interface ExportResult {
  fileName: string;
  mimeType: string;
  buffer: Buffer;
  size: number;
  recordCount: number;
  generatedAt: Date;
}

export interface ExportJob {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  options: ExportOptions;
  result?: ExportResult;
  error?: string;
  createdAt: Date;
  completedAt?: Date;
  progress?: number;
}

@Injectable()
export class FishExportService {
  private readonly logger = new Logger(FishExportService.name);
  private readonly exportJobs = new Map<string, ExportJob>();
  private readonly maxJobRetention = 24 * 60 * 60 * 1000; // 24 hours

  constructor(
    private readonly fishGrowthRepository: FishGrowthRepository,
    private readonly analyticsService: FishAnalyticsService,
  ) {
    // Clean up old export jobs every hour
    setInterval(() => this.cleanupOldJobs(), 60 * 60 * 1000);
  }

  /**
   * Create export job
   */
  async createExportJob(options: ExportOptions): Promise<string> {
    const jobId = this.generateJobId();
    
    const job: ExportJob = {
      id: jobId,
      status: 'pending',
      options,
      createdAt: new Date(),
      progress: 0,
    };

    this.exportJobs.set(jobId, job);
    
    // Start processing asynchronously
    this.processExportJob(jobId).catch(error => {
      this.logger.error(`Export job ${jobId} failed:`, error.stack);
      const failedJob = this.exportJobs.get(jobId);
      if (failedJob) {
        failedJob.status = 'failed';
        failedJob.error = error.message;
        failedJob.completedAt = new Date();
        this.exportJobs.set(jobId, failedJob);
      }
    });

    return jobId;
  }

  /**
   * Get export job status
   */
  getExportJobStatus(jobId: string): ExportJob | null {
    return this.exportJobs.get(jobId) || null;
  }

  /**
   * Get export job result
   */
  async getExportJobResult(jobId: string): Promise<StreamableFile> {
    const job = this.exportJobs.get(jobId);
    
    if (!job) {
      throw new ExportNotFoundException('Export job not found', jobId);
    }

    if (job.status !== 'completed' || !job.result) {
      throw new ExportNotFoundException('Export job not completed or result not available', jobId);
    }

    const stream = Readable.from(job.result.buffer);
    
    return new StreamableFile(stream, {
      type: job.result.mimeType,
      disposition: `attachment; filename="${job.result.fileName}"`,
      length: job.result.size,
    });
  }

  /**
   * Direct export (for smaller datasets)
   */
  async exportData(options: ExportOptions): Promise<ExportResult> {
    this.logger.log(`Starting direct export with format: ${options.format}`);
    
    try {
      // Validate format
      this.validateExportFormat(options.format);
      
      // Fetch data
      const data = await this.fetchExportData(options);
      
      // Generate export based on format
      let result: ExportResult;
      
      switch (options.format) {
        case 'csv':
          result = await this.generateCsvExport(data, options);
          break;
        case 'excel':
          result = await this.generateExcelExport(data, options);
          break;
        case 'json':
          result = await this.generateJsonExport(data, options);
          break;
        case 'pdf':
          result = await this.generatePdfExport(data, options);
          break;
        default:
          throw new ExportFormatNotSupportedException(options.format);
      }
      
      this.logger.log(`Export completed: ${result.fileName} (${result.recordCount} records, ${result.size} bytes)`);
      return result;
      
    } catch (error) {
      this.logger.error('Direct export failed:', error.stack);
      throw new ExportGenerationException(options.format, error.message);
    }
  }

  /**
   * Process export job
   */
  private async processExportJob(jobId: string): Promise<void> {
    const job = this.exportJobs.get(jobId);
    if (!job) {
      throw new Error(`Export job ${jobId} not found`);
    }

    try {
      job.status = 'processing';
      job.progress = 10;
      this.exportJobs.set(jobId, job);

      // Fetch data
      const data = await this.fetchExportData(job.options);
      job.progress = 30;
      this.exportJobs.set(jobId, job);

      // Generate export
      let result: ExportResult;
      
      switch (job.options.format) {
        case 'csv':
          result = await this.generateCsvExport(data, job.options);
          break;
        case 'excel':
          result = await this.generateExcelExport(data, job.options);
          break;
        case 'json':
          result = await this.generateJsonExport(data, job.options);
          break;
        case 'pdf':
          result = await this.generatePdfExport(data, job.options);
          break;
        default:
          throw new ExportFormatNotSupportedException(job.options.format);
      }

      job.progress = 100;
      job.status = 'completed';
      job.result = result;
      job.completedAt = new Date();
      this.exportJobs.set(jobId, job);

    } catch (error) {
      job.status = 'failed';
      job.error = error.message;
      job.completedAt = new Date();
      this.exportJobs.set(jobId, job);
      throw error;
    }
  }

  /**
   * Fetch export data
   */
  private async fetchExportData(options: ExportOptions): Promise<{
    records: FishGrowth[];
    analytics?: any;
  }> {
    let records: FishGrowth[];

    if (options.dateRange) {
      records = await this.fishGrowthRepository.findByDateRange(
        options.dateRange.startDate,
        options.dateRange.endDate,
        options.deviceIds
      );
    } else {
      // Get all records (simplified approach)
      const query = new FishGrowthQueryDto();
      query.limit = 10000;
      query.offset = 0;
      const result = await this.fishGrowthRepository.findWithPagination(query);
      records = result.data;
      
      // Filter by device IDs if specified
      if (options.deviceIds && options.deviceIds.length > 0) {
        records = records.filter(record => options.deviceIds!.includes(record.device_id));
      }
    }

    let analytics;
    if (options.includeAnalytics) {
      analytics = await this.generateAnalyticsData(records, options);
    }

    return { records, analytics };
  }

  /**
   * Generate analytics data for export
   */
  private async generateAnalyticsData(records: FishGrowth[], options: ExportOptions): Promise<any> {
    const deviceIds = options.deviceIds || Array.from(new Set(records.map(r => r.device_id)));
    
    const analytics = {
      summary: {
        totalRecords: records.length,
        deviceCount: deviceIds.length,
        dateRange: {
          earliest: records.length > 0 ? new Date(Math.min(...records.map(r => r.measurement_date.getTime()))) : null,
          latest: records.length > 0 ? new Date(Math.max(...records.map(r => r.measurement_date.getTime()))) : null,
        },
      },
      deviceAnalytics: [] as any[],
      overallStatistics: await this.analyticsService.calculateStatistics(),
    };

    // Generate analytics for each device
    for (const deviceId of deviceIds) {
      try {
        const growthRate = await this.analyticsService.calculateGrowthRate([deviceId]);
        const trendAnalysis = await this.analyticsService.calculateTrendAnalysis(deviceId);
        const predictions = await this.analyticsService.generatePredictions(deviceId, 30);
        
        analytics.deviceAnalytics.push({
          deviceId,
          growthRate,
          trendAnalysis,
          predictions,
        });
      } catch (error) {
        this.logger.warn(`Failed to generate analytics for device ${deviceId}:`, error.message);
      }
    }

    return analytics;
  }

  /**
   * Generate CSV export
   */
  private async generateCsvExport(data: { records: FishGrowth[]; analytics?: any }, options: ExportOptions): Promise<ExportResult> {
    const lines: string[] = [];
    
    // CSV Headers
    const headers = [
      'Device ID',
      'Measurement Date',
      'Length (cm)',
      'Weight (g)',
      'Biomass (kg)',
      'Condition Indicator',
      'Notes',
      'Created At'
    ];

    if (options.customFields) {
      headers.push(...options.customFields);
    }

    lines.push(headers.join(','));

    // Data rows
    for (const record of data.records) {
      const row = [
        record.device_id,
        record.measurement_date.toISOString(),
        record.length_cm?.toString() || '',
        record.weight_gram?.toString() || '',
        record.biomass_kg?.toString() || '',
        record.condition_indicator || '',
        record.notes || '',
        record.created_at.toISOString(),
      ];

      if (options.customFields) {
        // Add custom field values (placeholder for now)
        row.push(...options.customFields.map(() => ''));
      }

      lines.push(row.map(field => `"${field}"`).join(','));
    }

    // Add analytics section if requested
    if (options.includeAnalytics && data.analytics) {
      lines.push('');
      lines.push('=== ANALYTICS SUMMARY ===');
      lines.push(`Total Records,${data.analytics.summary.totalRecords}`);
      lines.push(`Device Count,${data.analytics.summary.deviceCount}`);
      lines.push(`Date Range,"${data.analytics.summary.dateRange.earliest?.toISOString()} - ${data.analytics.summary.dateRange.latest?.toISOString()}"`);
    }

    const csvContent = lines.join('\n');
    const buffer = Buffer.from(csvContent, 'utf-8');
    
    return {
      fileName: options.fileName || `fish-growth-export-${Date.now()}.csv`,
      mimeType: 'text/csv',
      buffer,
      size: buffer.length,
      recordCount: data.records.length,
      generatedAt: new Date(),
    };
  }

  /**
   * Generate Excel export (simplified - would need additional library like exceljs)
   */
  private async generateExcelExport(data: { records: FishGrowth[]; analytics?: any }, options: ExportOptions): Promise<ExportResult> {
    // For now, return CSV format with Excel MIME type
    // In a real implementation, you'd use a library like exceljs
    const csvResult = await this.generateCsvExport(data, options);
    
    return {
      fileName: options.fileName || `fish-growth-export-${Date.now()}.xlsx`,
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      buffer: csvResult.buffer,
      size: csvResult.buffer.length,
      recordCount: data.records.length,
      generatedAt: new Date(),
    };
  }

  /**
   * Generate JSON export
   */
  private async generateJsonExport(data: { records: FishGrowth[]; analytics?: any }, options: ExportOptions): Promise<ExportResult> {
    const exportData = {
      metadata: {
        exportedAt: new Date().toISOString(),
        recordCount: data.records.length,
        format: 'json',
        options: {
          dateRange: options.dateRange,
          deviceIds: options.deviceIds,
          includeAnalytics: options.includeAnalytics,
        },
      },
      data: data.records.map(record => ({
        id: record.id,
        device_id: record.device_id,
        measurement_date: record.measurement_date.toISOString(),
        length_cm: record.length_cm,
        weight_gram: record.weight_gram,
        biomass_kg: record.biomass_kg,
        condition_indicator: record.condition_indicator,
        notes: record.notes,
        created_at: record.created_at.toISOString(),
      })),
      analytics: options.includeAnalytics ? data.analytics : undefined,
    };

    const jsonContent = JSON.stringify(exportData, null, 2);
    const buffer = Buffer.from(jsonContent, 'utf-8');
    
    return {
      fileName: options.fileName || `fish-growth-export-${Date.now()}.json`,
      mimeType: 'application/json',
      buffer,
      size: buffer.length,
      recordCount: data.records.length,
      generatedAt: new Date(),
    };
  }

  /**
   * Generate PDF export (simplified - would need additional library like puppeteer or pdfkit)
   */
  private async generatePdfExport(data: { records: FishGrowth[]; analytics?: any }, options: ExportOptions): Promise<ExportResult> {
    // For now, create a basic HTML structure that could be converted to PDF
    const htmlContent = this.generateHtmlReport(data, options);
    const buffer = Buffer.from(htmlContent, 'utf-8');
    
    return {
      fileName: options.fileName || `fish-growth-report-${Date.now()}.html`,
      mimeType: 'text/html', // Would be 'application/pdf' with proper PDF generation
      buffer,
      size: buffer.length,
      recordCount: data.records.length,
      generatedAt: new Date(),
    };
  }

  /**
   * Generate HTML report for PDF conversion
   */
  private generateHtmlReport(data: { records: FishGrowth[]; analytics?: any }, options: ExportOptions): string {
    let html = `
<!DOCTYPE html>
<html>
<head>
  <title>Fish Growth Report</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; }
    .header { text-align: center; margin-bottom: 30px; }
    .summary { background: #f5f5f5; padding: 15px; margin-bottom: 20px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
    th { background-color: #4CAF50; color: white; }
    .analytics { margin-top: 30px; }
    .chart-placeholder { background: #f9f9f9; padding: 20px; text-align: center; color: #666; }
  </style>
</head>
<body>
  <div class="header">
    <h1>Fish Growth Report</h1>
    <p>Generated on ${new Date().toLocaleString()}</p>
  </div>

  <div class="summary">
    <h2>Summary</h2>
    <p><strong>Total Records:</strong> ${data.records.length}</p>
    <p><strong>Date Range:</strong> ${options.dateRange ? 
      `${options.dateRange.startDate.toLocaleDateString()} - ${options.dateRange.endDate.toLocaleDateString()}` : 
      'All available data'}</p>
    <p><strong>Devices:</strong> ${options.deviceIds ? options.deviceIds.join(', ') : 'All devices'}</p>
  </div>

  <h2>Fish Growth Measurements</h2>
  <table>
    <thead>
      <tr>
        <th>Device ID</th>
        <th>Date</th>
        <th>Length (cm)</th>
        <th>Weight (g)</th>
        <th>Biomass (kg)</th>
        <th>Condition</th>
        <th>Notes</th>
      </tr>
    </thead>
    <tbody>
`;

    // Add data rows (limit to first 100 for PDF)
    const limitedRecords = data.records.slice(0, 100);
    for (const record of limitedRecords) {
      html += `
      <tr>
        <td>${record.device_id}</td>
        <td>${record.measurement_date.toLocaleDateString()}</td>
        <td>${record.length_cm || 'N/A'}</td>
        <td>${record.weight_gram || 'N/A'}</td>
        <td>${record.biomass_kg || 'N/A'}</td>
        <td>${record.condition_indicator || 'N/A'}</td>
        <td>${record.notes || 'N/A'}</td>
      </tr>`;
    }

    html += `
    </tbody>
  </table>
`;

    if (data.records.length > 100) {
      html += `<p><em>Note: Only first 100 records shown in PDF report. Full dataset contains ${data.records.length} records.</em></p>`;
    }

    // Add analytics section if requested
    if (options.includeAnalytics && data.analytics) {
      html += `
  <div class="analytics">
    <h2>Analytics</h2>
    <div class="chart-placeholder">
      <p>Analytics charts would be displayed here in a full implementation</p>
      <p>Device Count: ${data.analytics.summary.deviceCount}</p>
    </div>
  </div>`;
    }

    html += `
</body>
</html>`;

    return html;
  }

  /**
   * Validate export format
   */
  private validateExportFormat(format: string): void {
    const supportedFormats = ['csv', 'excel', 'json', 'pdf'];
    if (!supportedFormats.includes(format)) {
      throw new ExportFormatNotSupportedException(format);
    }
  }

  /**
   * Generate unique job ID
   */
  private generateJobId(): string {
    return `export_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Clean up old export jobs
   */
  private cleanupOldJobs(): void {
    const now = Date.now();
    const jobsToDelete: string[] = [];

    for (const [jobId, job] of this.exportJobs) {
      if (now - job.createdAt.getTime() > this.maxJobRetention) {
        jobsToDelete.push(jobId);
      }
    }

    for (const jobId of jobsToDelete) {
      this.exportJobs.delete(jobId);
    }

    if (jobsToDelete.length > 0) {
      this.logger.log(`Cleaned up ${jobsToDelete.length} old export jobs`);
    }
  }

  /**
   * Get export statistics
   */
  getExportStatistics(): {
    totalJobs: number;
    pendingJobs: number;
    processingJobs: number;
    completedJobs: number;
    failedJobs: number;
    averageProcessingTime: number;
  } {
    const jobs = Array.from(this.exportJobs.values());
    const completedJobs = jobs.filter(j => j.status === 'completed');
    
    const averageProcessingTime = completedJobs.length > 0
      ? completedJobs.reduce((sum, job) => {
          if (job.completedAt && job.createdAt) {
            return sum + (job.completedAt.getTime() - job.createdAt.getTime());
          }
          return sum;
        }, 0) / completedJobs.length
      : 0;

    return {
      totalJobs: jobs.length,
      pendingJobs: jobs.filter(j => j.status === 'pending').length,
      processingJobs: jobs.filter(j => j.status === 'processing').length,
      completedJobs: completedJobs.length,
      failedJobs: jobs.filter(j => j.status === 'failed').length,
      averageProcessingTime: Math.round(averageProcessingTime),
    };
  }

  /**
   * Cancel export job
   */
  cancelExportJob(jobId: string): boolean {
    const job = this.exportJobs.get(jobId);
    if (!job) {
      return false;
    }

    if (job.status === 'pending') {
      job.status = 'failed';
      job.error = 'Cancelled by user';
      job.completedAt = new Date();
      this.exportJobs.set(jobId, job);
      return true;
    }

    return false;
  }

  /**
   * Get all export jobs
   */
  getAllExportJobs(): ExportJob[] {
    return Array.from(this.exportJobs.values());
  }
}