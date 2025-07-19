import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  Max,
  ValidateIf,
  Length,
  IsISO8601,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { IsFutureDate, IsValidMeasurementCombination } from '../validators/fish-growth.validator';

export class CreateFishGrowthDto {
  @ApiProperty({ 
    description: 'The date of the measurement (ISO 8601 format, cannot be in the future)',
    example: '2025-01-15T10:30:00Z',
    format: 'date-time',
  })
  @IsISO8601({}, { message: 'measurement_date must be a valid date in ISO 8601 format' })
  @IsNotEmpty({ message: 'measurement_date is required' })
  @IsFutureDate({ message: 'measurement_date cannot be in the future' })
  measurement_date: string;

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
    example: 'Fish appears healthy with good coloration and active movement',
  })
  @IsOptional()
  @IsString({ message: 'notes must be a string' })
  @Length(0, 1000, { message: 'notes cannot exceed 1000 characters' })
  @Transform(({ value }) => value?.trim())
  notes?: string;

  @IsValidMeasurementCombination({ 
    message: 'At least one measurement (length_cm or weight_gram) must be provided' 
  })
  _validationTrigger?: any;
}
