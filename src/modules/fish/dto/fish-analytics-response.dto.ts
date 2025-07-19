import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';

export class GrowthStatisticsDto {
  @ApiProperty({
    description: 'Average growth rate in grams per day',
    example: 2.5,
  })
  @Expose()
  averageGrowthRate: number;

  @ApiProperty({
    description: 'Total growth in grams',
    example: 125.5,
  })
  @Expose()
  totalGrowth: number;

  @ApiProperty({
    description: 'Minimum weight recorded in grams',
    example: 50.0,
  })
  @Expose()
  minWeight: number;

  @ApiProperty({
    description: 'Maximum weight recorded in grams',
    example: 175.5,
  })
  @Expose()
  maxWeight: number;

  @ApiProperty({
    description: 'Average weight in grams',
    example: 112.75,
  })
  @Expose()
  averageWeight: number;

  @ApiProperty({
    description: 'Minimum length recorded in centimeters',
    example: 15.0,
  })
  @Expose()
  minLength: number;

  @ApiProperty({
    description: 'Maximum length recorded in centimeters',
    example: 28.5,
  })
  @Expose()
  maxLength: number;

  @ApiProperty({
    description: 'Average length in centimeters',
    example: 21.75,
  })
  @Expose()
  averageLength: number;

  @ApiProperty({
    description: 'Total number of measurements',
    example: 25,
  })
  @Expose()
  measurementCount: number;

  @ApiProperty({
    description: 'Distribution of condition indicators',
    example: { Poor: 2, Good: 18, Excellent: 5 },
  })
  @Expose()
  conditionDistribution: Record<string, number>;
}

export class TrendAnalysisDto {
  @ApiProperty({
    description: 'Overall trend direction',
    enum: ['increasing', 'decreasing', 'stable'],
    example: 'increasing',
  })
  @Expose()
  direction: 'increasing' | 'decreasing' | 'stable';

  @ApiProperty({
    description: 'Confidence level of the trend (0-1)',
    example: 0.85,
  })
  @Expose()
  confidence: number;

  @ApiProperty({
    description: 'Type of trend pattern',
    enum: ['linear', 'exponential', 'logarithmic'],
    example: 'linear',
  })
  @Expose()
  trend: 'linear' | 'exponential' | 'logarithmic';

  @ApiProperty({
    description: 'Correlation coefficient (-1 to 1)',
    example: 0.92,
  })
  @Expose()
  correlation: number;

  @ApiProperty({
    description: 'Growth rate trend over time',
    example: 'Consistent positive growth with slight acceleration',
  })
  @Expose()
  description: string;
}

export class PredictionDataDto {
  @ApiProperty({
    description: 'Predicted weight at specified future date',
    example: 200.5,
  })
  @Expose()
  predictedWeight: number;

  @ApiProperty({
    description: 'Predicted length at specified future date',
    example: 32.0,
  })
  @Expose()
  predictedLength: number;

  @ApiProperty({
    description: 'Confidence interval for weight prediction',
    example: { lower: 185.0, upper: 216.0 },
  })
  @Expose()
  weightConfidenceInterval: { lower: number; upper: number };

  @ApiProperty({
    description: 'Confidence interval for length prediction',
    example: { lower: 29.5, upper: 34.5 },
  })
  @Expose()
  lengthConfidenceInterval: { lower: number; upper: number };

  @ApiProperty({
    description: 'Number of days ahead for prediction',
    example: 30,
  })
  @Expose()
  daysAhead: number;

  @ApiProperty({
    description: 'Model accuracy based on historical data',
    example: 0.88,
  })
  @Expose()
  modelAccuracy: number;
}

export class GrowthDataPointDto {
  @ApiProperty({
    description: 'Date of measurement',
    example: '2025-01-15',
  })
  @Expose()
  date: Date;

  @ApiProperty({
    description: 'Length measurement in centimeters',
    example: 25.5,
    nullable: true,
  })
  @Expose()
  length?: number;

  @ApiProperty({
    description: 'Weight measurement in grams',
    example: 150.75,
    nullable: true,
  })
  @Expose()
  weight?: number;

  @ApiProperty({
    description: 'Calculated biomass in kilograms',
    example: 3.825,
    nullable: true,
  })
  @Expose()
  biomass?: number;

  @ApiProperty({
    description: 'Condition indicator',
    example: 'Good',
    nullable: true,
  })
  @Expose()
  conditionIndicator?: string;

  @ApiProperty({
    description: 'Growth rate since last measurement (grams/day)',
    example: 2.3,
    nullable: true,
  })
  @Expose()
  growthRate?: number;
}

export class ComparisonDataDto {
  @ApiProperty({
    description: 'Device identifier',
    example: 'DEV001',
  })
  @Expose()
  deviceId: string;

  @ApiProperty({
    description: 'Performance metrics for this device',
    type: GrowthStatisticsDto,
  })
  @Expose()
  @Type(() => GrowthStatisticsDto)
  statistics: GrowthStatisticsDto;

  @ApiProperty({
    description: 'Ranking among compared devices',
    example: 1,
  })
  @Expose()
  rank: number;

  @ApiProperty({
    description: 'Performance score (0-100)',
    example: 85.5,
  })
  @Expose()
  score: number;
}

export class FishAnalyticsResponseDto {
  @ApiProperty({
    description: 'Overall growth rate in grams per day',
    example: 2.5,
  })
  @Expose()
  growthRate: number;

  @ApiProperty({
    description: 'Growth trend description',
    example: 'Positive',
  })
  @Expose()
  trend: string;

  @ApiProperty({
    description: 'Summary description of growth analytics',
    example: 'The fish shows consistent positive growth with an average rate of 2.5 g/day.',
  })
  @Expose()
  summary: string;

  @ApiProperty({
    description: 'Detailed statistics',
    type: GrowthStatisticsDto,
  })
  @Expose()
  @Type(() => GrowthStatisticsDto)
  statistics: GrowthStatisticsDto;

  @ApiProperty({
    description: 'Trend analysis data',
    type: TrendAnalysisDto,
    required: false,
  })
  @Expose()
  @Type(() => TrendAnalysisDto)
  trendAnalysis?: TrendAnalysisDto;

  @ApiProperty({
    description: 'Prediction data for future growth',
    type: PredictionDataDto,
    required: false,
  })
  @Expose()
  @Type(() => PredictionDataDto)
  predictions?: PredictionDataDto;

  @ApiProperty({
    description: 'Comparison with other devices',
    type: [ComparisonDataDto],
    required: false,
  })
  @Expose()
  @Type(() => ComparisonDataDto)
  comparison?: ComparisonDataDto[];

  @ApiProperty({
    description: 'Growth data points over time',
    type: [GrowthDataPointDto],
  })
  @Expose()
  @Type(() => GrowthDataPointDto)
  data: GrowthDataPointDto[];

  @ApiProperty({
    description: 'Analytics generation timestamp',
    example: '2025-01-15T10:30:00Z',
  })
  @Expose()
  generatedAt: Date;

  @ApiProperty({
    description: 'Period covered by the analytics',
    example: '2025-01-01 to 2025-01-15',
  })
  @Expose()
  period: string;

  @ApiProperty({
    description: 'Data quality score (0-100)',
    example: 92,
  })
  @Expose()
  dataQualityScore: number;
}
