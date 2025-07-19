import { ApiProperty } from '@nestjs/swagger';
import {
  IsOptional,
  IsDateString,
  IsInt,
  IsString,
  IsIn,
  Min,
  Max,
  ValidateIf,
  IsNotEmpty,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class FishGrowthQueryDto {
  @ApiProperty({
    description: 'Start date for filtering (ISO 8601 format)',
    required: false,
    example: '2025-01-01',
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiProperty({
    description: 'End date for filtering (ISO 8601 format)',
    required: false,
    example: '2025-12-31',
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiProperty({
    description: 'Number of items per page',
    required: false,
    minimum: 1,
    maximum: 100,
    default: 20,
    example: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiProperty({
    description: 'Number of items to skip',
    required: false,
    minimum: 0,
    default: 0,
    example: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number = 0;

  @ApiProperty({
    description: 'Field to sort by',
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
    description: 'Sort order',
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
    description: 'Search term for notes field',
    required: false,
    example: 'healthy growth',
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  search?: string;

  @ApiProperty({
    description: 'Filter by minimum weight (grams)',
    required: false,
    minimum: 0,
    example: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  minWeight?: number;

  @ApiProperty({
    description: 'Filter by maximum weight (grams)',
    required: false,
    minimum: 0,
    example: 1000,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  maxWeight?: number;

  @ApiProperty({
    description: 'Filter by minimum length (cm)',
    required: false,
    minimum: 0,
    example: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  minLength?: number;

  @ApiProperty({
    description: 'Filter by maximum length (cm)',
    required: false,
    minimum: 0,
    example: 50,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  maxLength?: number;

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
}
