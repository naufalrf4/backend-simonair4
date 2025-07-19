import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsOptional,
  ValidateNested,
  ArrayMinSize,
  ArrayMaxSize,
  IsString,
  IsIn,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CreateFishGrowthDto } from './create-fish-growth.dto';

export class BulkFishGrowthDto {
  @ApiProperty({
    description: 'Array of fish growth measurements to create',
    type: [CreateFishGrowthDto],
    example: [
      {
        measurement_date: '2025-01-15',
        length_cm: 25.5,
        weight_gram: 150.75,
        notes: 'Healthy growth observed',
      },
      {
        measurement_date: '2025-01-16',
        length_cm: 25.8,
        weight_gram: 152.5,
        notes: 'Continued positive growth',
      },
    ],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateFishGrowthDto)
  @ArrayMinSize(1, { message: 'At least one measurement is required' })
  @ArrayMaxSize(100, { message: 'Maximum 100 measurements allowed per bulk operation' })
  measurements: CreateFishGrowthDto[];

  @ApiProperty({
    description: 'Skip individual measurement validation (use with caution)',
    required: false,
    default: false,
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  skipValidation?: boolean = false;

  @ApiProperty({
    description: 'Continue processing even if individual measurements fail',
    required: false,
    default: false,
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  continueOnError?: boolean = false;

  @ApiProperty({
    description: 'Batch processing mode',
    required: false,
    enum: ['sequential', 'parallel'],
    default: 'sequential',
    example: 'sequential',
  })
  @IsOptional()
  @IsString()
  @IsIn(['sequential', 'parallel'])
  processingMode?: 'sequential' | 'parallel' = 'sequential';
}

export class BulkUpdateFishGrowthDto {
  @ApiProperty({
    description: 'Record ID to update',
    example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  })
  @IsString()
  id: string;

  @ApiProperty({
    description: 'Updated measurement date',
    required: false,
    example: '2025-01-15',
  })
  @IsOptional()
  measurement_date?: Date;

  @ApiProperty({
    description: 'Updated length in centimeters',
    required: false,
    example: 26.0,
  })
  @IsOptional()
  length_cm?: number;

  @ApiProperty({
    description: 'Updated weight in grams',
    required: false,
    example: 155.0,
  })
  @IsOptional()
  weight_gram?: number;

  @ApiProperty({
    description: 'Updated notes',
    required: false,
    example: 'Revised measurement after recalibration',
  })
  @IsOptional()
  notes?: string;
}

export class BulkUpdateDto {
  @ApiProperty({
    description: 'Array of fish growth records to update',
    type: [BulkUpdateFishGrowthDto],
    example: [
      {
        id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
        length_cm: 26.0,
        weight_gram: 155.0,
        notes: 'Corrected measurement',
      },
    ],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BulkUpdateFishGrowthDto)
  @ArrayMinSize(1, { message: 'At least one record is required for update' })
  @ArrayMaxSize(50, { message: 'Maximum 50 records allowed per bulk update' })
  updates: BulkUpdateFishGrowthDto[];

  @ApiProperty({
    description: 'Continue processing even if individual updates fail',
    required: false,
    default: false,
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  continueOnError?: boolean = false;
}

export class BulkDeleteDto {
  @ApiProperty({
    description: 'Array of record IDs to delete',
    example: [
      'f47ac10b-58cc-4372-a567-0e02b2c3d479',
      'a12bc30d-78ef-4567-b890-1e23f4c5d678',
    ],
  })
  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1, { message: 'At least one ID is required for deletion' })
  @ArrayMaxSize(100, { message: 'Maximum 100 records allowed per bulk deletion' })
  ids: string[];

  @ApiProperty({
    description: 'Continue processing even if individual deletions fail',
    required: false,
    default: false,
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  continueOnError?: boolean = false;
}

export class BulkOperationResultDto {
  @ApiProperty({
    description: 'Number of successful operations',
    example: 8,
  })
  successful: number;

  @ApiProperty({
    description: 'Number of failed operations',
    example: 2,
  })
  failed: number;

  @ApiProperty({
    description: 'Total number of operations attempted',
    example: 10,
  })
  total: number;

  @ApiProperty({
    description: 'Array of error messages for failed operations',
    example: ['Record ID xyz not found', 'Validation failed for measurement on 2025-01-15'],
  })
  errors: string[];

  @ApiProperty({
    description: 'Array of successfully processed record IDs',
    example: [
      'f47ac10b-58cc-4372-a567-0e02b2c3d479',
      'a12bc30d-78ef-4567-b890-1e23f4c5d678',
    ],
  })
  processedIds: string[];

  @ApiProperty({
    description: 'Operation completion timestamp',
    example: '2025-01-15T10:30:00Z',
  })
  completedAt: Date;

  @ApiProperty({
    description: 'Processing time in milliseconds',
    example: 1250,
  })
  processingTimeMs: number;
}
