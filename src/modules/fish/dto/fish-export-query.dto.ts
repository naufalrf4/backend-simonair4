import { ApiProperty } from '@nestjs/swagger';
import {
  IsOptional,
  IsDateString,
  IsString,
  IsIn,
  IsArray,
  IsBoolean,
  ValidateIf,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class FishExportQueryDto {
  @ApiProperty({
    description: 'Export format',
    enum: ['csv', 'excel', 'json'],
    default: 'csv',
    example: 'csv',
  })
  @IsOptional()
  @IsString()
  @IsIn(['csv', 'excel', 'json'])
  format?: 'csv' | 'excel' | 'json' = 'csv';

  @ApiProperty({
    description: 'Start date for export (ISO 8601 format)',
    required: false,
    example: '2025-01-01',
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiProperty({
    description: 'End date for export (ISO 8601 format)',
    required: false,
    example: '2025-12-31',
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiProperty({
    description: 'Include analytics data in export',
    required: false,
    default: false,
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  includeAnalytics?: boolean = false;

  @ApiProperty({
    description: 'Include summary statistics',
    required: false,
    default: false,
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  includeSummary?: boolean = false;

  @ApiProperty({
    description: 'Include charts and visualizations (Excel only)',
    required: false,
    default: false,
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  @ValidateIf((o) => o.format === 'excel')
  includeCharts?: boolean = false;

  @ApiProperty({
    description: 'Fields to include in export',
    required: false,
    example: ['measurement_date', 'length_cm', 'weight_gram', 'biomass_kg', 'condition_indicator'],
    isArray: true,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @IsIn(['measurement_date', 'length_cm', 'weight_gram', 'biomass_kg', 'condition_indicator', 'notes', 'created_at'], 
    { each: true })
  fields?: string[];

  @ApiProperty({
    description: 'Filter by condition indicator',
    required: false,
    enum: ['Poor', 'Good', 'Excellent'],
    example: 'Good',
  })
  @IsOptional()
  @IsString()
  @IsIn(['Poor', 'Good', 'Excellent'])
  conditionIndicator?: string;

  @ApiProperty({
    description: 'Sort field for export',
    required: false,
    enum: ['measurement_date', 'created_at', 'weight_gram', 'length_cm'],
    default: 'measurement_date',
    example: 'measurement_date',
  })
  @IsOptional()
  @IsString()
  @IsIn(['measurement_date', 'created_at', 'weight_gram', 'length_cm'])
  sortBy?: string = 'measurement_date';

  @ApiProperty({
    description: 'Sort order for export',
    required: false,
    enum: ['ASC', 'DESC'],
    default: 'ASC',
    example: 'ASC',
  })
  @IsOptional()
  @IsString()
  @IsIn(['ASC', 'DESC'])
  sortOrder?: 'ASC' | 'DESC' = 'ASC';

  @ApiProperty({
    description: 'Export filename (without extension)',
    required: false,
    example: 'fish-growth-data-2025',
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  filename?: string;

  @ApiProperty({
    description: 'Include device information in export',
    required: false,
    default: false,
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  includeDeviceInfo?: boolean = false;

  @ApiProperty({
    description: 'Group data by time period',
    required: false,
    enum: ['day', 'week', 'month', 'none'],
    default: 'none',
    example: 'month',
  })
  @IsOptional()
  @IsString()
  @IsIn(['day', 'week', 'month', 'none'])
  groupBy?: 'day' | 'week' | 'month' | 'none' = 'none';

  @ApiProperty({
    description: 'Include trend analysis in export',
    required: false,
    default: false,
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  includeTrends?: boolean = false;

  @ApiProperty({
    description: 'Include predictions in export',
    required: false,
    default: false,
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  includePredictions?: boolean = false;

  @ApiProperty({
    description: 'Export compression (zip format)',
    required: false,
    default: false,
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  compress?: boolean = false;
}

export class MultiDeviceExportQueryDto extends FishExportQueryDto {
  @ApiProperty({
    description: 'Array of device IDs to include in export',
    example: ['DEV001', 'DEV002', 'DEV003'],
    isArray: true,
  })
  @IsArray()
  @IsString({ each: true })
  deviceIds: string[];

  @ApiProperty({
    description: 'Include device comparison analytics',
    required: false,
    default: false,
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  includeComparison?: boolean = false;

  @ApiProperty({
    description: 'Separate sheets/files per device',
    required: false,
    default: false,
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  separateByDevice?: boolean = false;
}

export class ExportResultDto {
  @ApiProperty({
    description: 'Export file buffer (base64 encoded)',
    example: 'UEsDBBQAAAAIAJ...',
  })
  file: Buffer;

  @ApiProperty({
    description: 'Generated filename with extension',
    example: 'fish-growth-data-2025.csv',
  })
  filename: string;

  @ApiProperty({
    description: 'MIME type of the exported file',
    example: 'text/csv',
  })
  contentType: string;

  @ApiProperty({
    description: 'File size in bytes',
    example: 15420,
  })
  fileSize: number;

  @ApiProperty({
    description: 'Number of records exported',
    example: 150,
  })
  recordCount: number;

  @ApiProperty({
    description: 'Export generation timestamp',
    example: '2025-01-15T10:30:00Z',
  })
  generatedAt: Date;

  @ApiProperty({
    description: 'Export processing time in milliseconds',
    example: 850,
  })
  processingTimeMs: number;

  @ApiProperty({
    description: 'Export metadata',
    example: {
      deviceIds: ['DEV001'],
      dateRange: '2025-01-01 to 2025-01-15',
      includeAnalytics: true,
    },
  })
  metadata: Record<string, any>;
}
