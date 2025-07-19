import { IsUUID, IsOptional, IsDateString, IsNumber, Min, Max } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class CompareManualMeasurementDto {
  @ApiProperty({
    description: 'ID of the manual measurement to compare',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID('4', { message: 'Manual measurement ID must be a valid UUID' })
  manual_measurement_id: string;

  @ApiProperty({
    description: 'Specific timestamp to compare against (ISO format). If not provided, uses measurement timestamp.',
    example: '2024-01-15T10:30:00Z',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  compare_timestamp?: string;

  @ApiProperty({
    description: 'Time window in minutes for finding sensor data (default: 5 minutes)',
    example: 5,
    minimum: 1,
    maximum: 60,
    default: 5,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1, { message: 'Time window must be at least 1 minute' })
  @Max(60, { message: 'Time window cannot exceed 60 minutes' })
  time_window?: number = 5;

  @ApiProperty({
    description: 'Include accuracy assessment in comparison results',
    example: true,
    default: true,
    required: false,
  })
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  include_accuracy?: boolean = true;

  @ApiProperty({
    description: 'Include statistical analysis in comparison results',
    example: false,
    default: false,
    required: false,
  })
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  include_statistics?: boolean = false;
}
