import { ApiProperty, PartialType } from '@nestjs/swagger';
import {
  IsOptional,
  IsNumber,
  IsString,
  IsDateString,
  Min,
  Max,
  Length,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { IsFutureDate, IsValidMeasurementRange } from '../validators/fish-growth.validator';

export class UpdateFishGrowthDto {
  @ApiProperty({ 
    description: 'The date of the measurement (ISO 8601 format, cannot be in the future)',
    example: '2025-01-15',
    format: 'date',
    required: false,
  })
  @IsOptional()
  @IsDateString({}, { message: 'measurement_date must be a valid date in ISO 8601 format' })
  @IsFutureDate({ message: 'measurement_date cannot be in the future' })
  @Transform(({ value }) => value ? new Date(value) : value)
  measurement_date?: Date;

  @ApiProperty({
    description: 'Length of the fish in centimeters (0.1 - 200 cm)',
    required: false,
    minimum: 0.1,
    maximum: 200,
    example: 25.5,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'length_cm must be a number with maximum 2 decimal places' })
  @Min(0.1, { message: 'length_cm must be at least 0.1 cm' })
  @Max(200, { message: 'length_cm cannot exceed 200 cm' })
  length_cm?: number;

  @ApiProperty({ 
    description: 'Weight of the fish in grams (0.1 - 50000 grams)',
    required: false,
    minimum: 0.1,
    maximum: 50000,
    example: 150.75,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'weight_gram must be a number with maximum 2 decimal places' })
  @Min(0.1, { message: 'weight_gram must be at least 0.1 grams' })
  @Max(50000, { message: 'weight_gram cannot exceed 50000 grams' })
  weight_gram?: number;

  @ApiProperty({ 
    description: 'Notes about the measurement (maximum 1000 characters)',
    required: false,
    maxLength: 1000,
    example: 'Updated measurement after recalibration',
  })
  @IsOptional()
  @IsString({ message: 'notes must be a string' })
  @Length(0, 1000, { message: 'notes cannot exceed 1000 characters' })
  @Transform(({ value }) => value?.trim())
  notes?: string;

  @IsValidMeasurementRange({ 
    message: 'The combination of length and weight measurements appears biologically implausible' 
  })
  _validationTrigger?: any;
}
