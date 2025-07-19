import { ApiProperty } from '@nestjs/swagger';
import {
  IsOptional,
  IsDateString,
  IsString,
  IsIn,
  IsInt,
  IsBoolean,
  IsArray,
  Min,
  Max,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class AnalyticsQueryDto {
  @ApiProperty({
    description: 'Start date for analytics (ISO 8601 format)',
    required: false,
    example: '2025-01-01',
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiProperty({
    description: 'End date for analytics (ISO 8601 format)',
    required: false,
    example: '2025-12-31',
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiProperty({
    description: 'Analytics period grouping',
    required: false,
    enum: ['daily', 'weekly', 'monthly', 'yearly'],
    default: 'daily',
    example: 'weekly',
  })
  @IsOptional()
  @IsString()
  @IsIn(['daily', 'weekly', 'monthly', 'yearly'])
  period?: 'daily' | 'weekly' | 'monthly' | 'yearly' = 'daily';

  @ApiProperty({
    description: 'Include trend analysis',
    required: false,
    default: true,
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  includeTrends?: boolean = true;

  @ApiProperty({
    description: 'Include predictions',
    required: false,
    default: false,
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  includePredictions?: boolean = false;

  @ApiProperty({
    description: 'Number of days ahead for predictions',
    required: false,
    minimum: 1,
    maximum: 365,
    default: 30,
    example: 30,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(365)
  predictionDays?: number = 30;

  @ApiProperty({
    description: 'Include statistical analysis',
    required: false,
    default: true,
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  includeStatistics?: boolean = true;

  @ApiProperty({
    description: 'Include data quality metrics',
    required: false,
    default: false,
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  includeDataQuality?: boolean = false;

  @ApiProperty({
    description: 'Minimum number of data points required',
    required: false,
    minimum: 1,
    default: 2,
    example: 5,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  minDataPoints?: number = 2;
}

export class ComparisonQueryDto {
  @ApiProperty({
    description: 'Array of device IDs to compare',
    example: ['DEV001', 'DEV002', 'DEV003'],
    isArray: true,
  })
  @IsArray()
  @IsString({ each: true })
  deviceIds: string[];

  @ApiProperty({
    description: 'Start date for comparison (ISO 8601 format)',
    required: false,
    example: '2025-01-01',
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiProperty({
    description: 'End date for comparison (ISO 8601 format)',
    required: false,
    example: '2025-12-31',
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiProperty({
    description: 'Comparison metrics to include',
    required: false,
    example: ['growth_rate', 'total_growth', 'condition_distribution'],
    isArray: true,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @IsIn(['growth_rate', 'total_growth', 'condition_distribution', 'measurement_frequency', 'weight_range', 'length_range'], 
    { each: true })
  metrics?: string[];

  @ApiProperty({
    description: 'Include ranking of devices',
    required: false,
    default: true,
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  includeRanking?: boolean = true;

  @ApiProperty({
    description: 'Include performance scores',
    required: false,
    default: true,
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  includeScores?: boolean = true;
}

export class TrendQueryDto {
  @ApiProperty({
    description: 'Trend analysis period',
    required: false,
    enum: ['7d', '30d', '90d', '1y', 'all'],
    default: '30d',
    example: '30d',
  })
  @IsOptional()
  @IsString()
  @IsIn(['7d', '30d', '90d', '1y', 'all'])
  period?: '7d' | '30d' | '90d' | '1y' | 'all' = '30d';

  @ApiProperty({
    description: 'Trend metrics to analyze',
    required: false,
    example: ['weight', 'length', 'condition'],
    isArray: true,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @IsIn(['weight', 'length', 'condition', 'biomass', 'growth_rate'], { each: true })
  metrics?: string[];

  @ApiProperty({
    description: 'Include seasonal analysis',
    required: false,
    default: false,
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  includeSeasonality?: boolean = false;

  @ApiProperty({
    description: 'Smoothing factor for trend analysis',
    required: false,
    minimum: 0.1,
    maximum: 1.0,
    default: 0.3,
    example: 0.3,
  })
  @IsOptional()
  @Type(() => Number)
  @Min(0.1)
  @Max(1.0)
  smoothingFactor?: number = 0.3;
}

export class PredictionQueryDto {
  @ApiProperty({
    description: 'Number of days ahead to predict',
    minimum: 1,
    maximum: 365,
    default: 30,
    example: 30,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(365)
  days: number = 30;

  @ApiProperty({
    description: 'Prediction model to use',
    required: false,
    enum: ['linear', 'exponential', 'polynomial', 'auto'],
    default: 'auto',
    example: 'linear',
  })
  @IsOptional()
  @IsString()
  @IsIn(['linear', 'exponential', 'polynomial', 'auto'])
  model?: 'linear' | 'exponential' | 'polynomial' | 'auto' = 'auto';

  @ApiProperty({
    description: 'Confidence level for predictions',
    required: false,
    minimum: 0.5,
    maximum: 0.99,
    default: 0.95,
    example: 0.95,
  })
  @IsOptional()
  @Type(() => Number)
  @Min(0.5)
  @Max(0.99)
  confidenceLevel?: number = 0.95;

  @ApiProperty({
    description: 'Include confidence intervals',
    required: false,
    default: true,
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  includeConfidenceIntervals?: boolean = true;

  @ApiProperty({
    description: 'Minimum historical data points required',
    required: false,
    minimum: 3,
    default: 5,
    example: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(3)
  minHistoricalPoints?: number = 5;
}
