import {
  IsOptional,
  IsDateString,
  IsInt,
  IsString,
  IsIn,
  IsBoolean,
  Min,
  Max,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class ManualMeasurementQueryDto {
  @ApiProperty({
    description: 'Start date for filtering measurements (ISO format)',
    example: '2024-01-01T00:00:00Z',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiProperty({
    description: 'End date for filtering measurements (ISO format)',
    example: '2024-01-31T23:59:59Z',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiProperty({
    description: 'Number of items per page',
    example: 20,
    minimum: 1,
    maximum: 100,
    default: 20,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1, { message: 'Limit must be at least 1' })
  @Max(100, { message: 'Limit cannot exceed 100' })
  limit?: number = 20;

  @ApiProperty({
    description: 'Number of items to skip (for pagination)',
    example: 0,
    minimum: 0,
    default: 0,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0, { message: 'Offset must be at least 0' })
  offset?: number = 0;

  @ApiProperty({
    description: 'Field to sort by',
    example: 'measurement_timestamp',
    enum: ['measurement_timestamp', 'created_at', 'temperature', 'ph', 'tds', 'do_level'],
    default: 'measurement_timestamp',
    required: false,
  })
  @IsOptional()
  @IsString()
  @IsIn(['measurement_timestamp', 'created_at', 'temperature', 'ph', 'tds', 'do_level'])
  sortBy?: string = 'measurement_timestamp';

  @ApiProperty({
    description: 'Sort order',
    example: 'DESC',
    enum: ['ASC', 'DESC'],
    default: 'DESC',
    required: false,
  })
  @IsOptional()
  @IsString()
  @IsIn(['ASC', 'DESC'])
  sortOrder?: 'ASC' | 'DESC' = 'DESC';

  @ApiProperty({
    description: 'Search term for filtering notes',
    example: 'feeding',
    required: false,
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  search?: string;

  @ApiProperty({
    description: 'Include sensor data comparison in results',
    example: false,
    default: false,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === true || value === 'true')
  include_comparison?: boolean = false;

  @ApiProperty({
    description: 'Filter by measurement type (only measurements with specific sensor values)',
    example: 'temperature',
    enum: ['temperature', 'ph', 'tds', 'do_level'],
    required: false,
  })
  @IsOptional()
  @IsString()
  @IsIn(['temperature', 'ph', 'tds', 'do_level'])
  measurement_type?: string;

  @ApiProperty({
    description: 'Filter by user who made the measurement',
    example: '123e4567-e89b-12d3-a456-426614174000',
    required: false,
  })
  @IsOptional()
  @IsString()
  measured_by?: string;

  // Computed properties for easier use
  get page(): number {
    return Math.floor((this.offset || 0) / (this.limit || 20)) + 1;
  }

  get skip(): number {
    return this.offset || 0;
  }

  get take(): number {
    return this.limit || 20;
  }
}
