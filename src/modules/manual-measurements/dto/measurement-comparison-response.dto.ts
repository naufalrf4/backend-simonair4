import { Expose, Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export enum AccuracyLevel {
  EXCELLENT = 'EXCELLENT',    // < 2% difference
  GOOD = 'GOOD',             // 2-5% difference
  FAIR = 'FAIR',             // 5-10% difference
  POOR = 'POOR',             // 10-20% difference
  VERY_POOR = 'VERY_POOR'    // > 20% difference
}

export class SensorValuesDto {
  @ApiProperty({ example: 26.5, required: false })
  @Expose()
  temperature?: number;

  @ApiProperty({ example: 7.2, required: false })
  @Expose()
  ph?: number;

  @ApiProperty({ example: 450, required: false })
  @Expose()
  tds?: number;

  @ApiProperty({ example: 8.5, required: false })
  @Expose()
  do_level?: number;
}

export class ValueDifferencesDto {
  @ApiProperty({ example: 0.5, required: false })
  @Expose()
  temperature?: number;

  @ApiProperty({ example: -0.1, required: false })
  @Expose()
  ph?: number;

  @ApiProperty({ example: 15, required: false })
  @Expose()
  tds?: number;

  @ApiProperty({ example: 0.3, required: false })
  @Expose()
  do_level?: number;
}

export class PercentageDifferencesDto {
  @ApiProperty({ example: 1.9, required: false })
  @Expose()
  temperature?: number;

  @ApiProperty({ example: -1.4, required: false })
  @Expose()
  ph?: number;

  @ApiProperty({ example: 3.4, required: false })
  @Expose()
  tds?: number;

  @ApiProperty({ example: 3.7, required: false })
  @Expose()
  do_level?: number;
}

export class MeasurementComparisonResponseDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @Expose()
  manual_measurement_id: string;

  @ApiProperty({ example: 'SMNR-0001' })
  @Expose()
  device_id: string;

  @ApiProperty({ example: '2024-01-15T10:30:00Z' })
  @Expose()
  manual_timestamp: Date;

  @ApiProperty({ example: true })
  @Expose()
  sensor_data_available: boolean;

  @ApiProperty({ example: '2024-01-15T10:28:00Z' })
  @Expose()
  sensor_timestamp: Date | null;

  @ApiProperty({ example: 2.5 })
  @Expose()
  time_difference_minutes: number | null;

  @ApiProperty({ example: 30 })
  @Expose()
  search_window_minutes: number;

  @ApiProperty({ type: SensorValuesDto })
  @Expose()
  @Type(() => SensorValuesDto)
  manual_values: SensorValuesDto;

  @ApiProperty({ type: SensorValuesDto })
  @Expose()
  @Type(() => SensorValuesDto)
  sensor_values: SensorValuesDto | null;

  @ApiProperty({ type: ValueDifferencesDto })
  @Expose()
  @Type(() => ValueDifferencesDto)
  absolute_differences: ValueDifferencesDto | null;

  @ApiProperty({ type: PercentageDifferencesDto })
  @Expose()
  @Type(() => PercentageDifferencesDto)
  percentage_differences: PercentageDifferencesDto | null;

  @ApiProperty({ 
    example: 'GOOD', 
    enum: AccuracyLevel,
    description: 'Overall accuracy assessment based on percentage differences'
  })
  @Expose()
  accuracy_assessment: AccuracyLevel;

  @ApiProperty({ 
    example: ['WITHIN_RANGE', 'TEMPERATURE_CLOSE'], 
    description: 'Flags indicating specific comparison results'
  })
  @Expose()
  flags: string[];

  @ApiProperty({ 
    example: 'Manual measurement shows good accuracy with sensor data. Temperature difference within acceptable range.', 
    description: 'Human-readable summary of the comparison'
  })
  @Expose()
  summary: string;

  @ApiProperty({ 
    example: ['Consider recalibrating TDS sensor if differences persist'], 
    description: 'Recommendations based on comparison results'
  })
  @Expose()
  recommendations: string[];

  @ApiProperty({ example: '2024-01-15T10:30:15Z' })
  @Expose()
  compared_at: Date;

  @ApiProperty({ example: 2.5 })
  @Expose()
  comparison_quality_score: number;
}

export class ComparisonReportDto {
  @ApiProperty({ example: 'SMNR-0001' })
  @Expose()
  device_id: string;

  @ApiProperty({ example: '2024-01-01T00:00:00Z' })
  @Expose()
  start_date: Date;

  @ApiProperty({ example: '2024-01-31T23:59:59Z' })
  @Expose()
  end_date: Date;

  @ApiProperty({ example: 45 })
  @Expose()
  total_manual_measurements: number;

  @ApiProperty({ example: 42 })
  @Expose()
  successful_comparisons: number;

  @ApiProperty({ example: 3 })
  @Expose()
  failed_comparisons: number;

  @ApiProperty({ 
    example: { 
      EXCELLENT: 15, 
      GOOD: 20, 
      FAIR: 5, 
      POOR: 2, 
      VERY_POOR: 0 
    },
    description: 'Distribution of accuracy levels'
  })
  @Expose()
  accuracy_distribution: Record<AccuracyLevel, number>;

  @ApiProperty({ type: ValueDifferencesDto })
  @Expose()
  @Type(() => ValueDifferencesDto)
  average_absolute_differences: ValueDifferencesDto;

  @ApiProperty({ type: PercentageDifferencesDto })
  @Expose()
  @Type(() => PercentageDifferencesDto)
  average_percentage_differences: PercentageDifferencesDto;

  @ApiProperty({ example: 2.1 })
  @Expose()
  average_time_difference_minutes: number;

  @ApiProperty({ example: 4.2 })
  @Expose()
  overall_quality_score: number;

  @ApiProperty({ 
    example: ['Manual measurements show good overall accuracy', 'Consider calibrating TDS sensor'] 
  })
  @Expose()
  recommendations: string[];

  @ApiProperty({ example: '2024-01-15T10:30:15Z' })
  @Expose()
  generated_at: Date;
}
