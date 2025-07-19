import {
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsBoolean,
  Min,
  Max,
  MaxLength,
  IsInt,
  Validate,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import {
  IsValidTemperature,
  IsValidPH,
  IsValidTDS,
  IsValidDOLevel,
  IsNotFutureDate,
  HasAtLeastOneMeasurement,
  IsBiologicallyPlausible,
} from '../validators/measurement-values.validator';

export class CreateManualMeasurementDto {
  @ApiProperty({
    description: 'Timestamp when the measurement was taken',
    example: '2024-01-15T10:30:00Z',
  })
  @IsDateString()
  @IsNotEmpty()
  @IsNotFutureDate()
  measurement_timestamp: string;

  @ApiProperty({
    description: 'Temperature measurement in Celsius',
    example: 26.5,
    minimum: 0,
    maximum: 50,
    required: false,
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0, { message: 'Temperature must be at least 0°C' })
  @Max(50, { message: 'Temperature cannot exceed 50°C' })
  @IsValidTemperature()
  @Transform(({ value }) => value !== null && value !== undefined ? parseFloat(value) : value)
  temperature?: number;

  @ApiProperty({
    description: 'pH level measurement',
    example: 7.2,
    minimum: 0,
    maximum: 14,
    required: false,
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0, { message: 'pH must be at least 0' })
  @Max(14, { message: 'pH cannot exceed 14' })
  @IsValidPH()
  @Transform(({ value }) => value !== null && value !== undefined ? parseFloat(value) : value)
  ph?: number;

  @ApiProperty({
    description: 'Total Dissolved Solids (TDS) measurement in ppm',
    example: 450,
    minimum: 0,
    maximum: 10000,
    required: false,
  })
  @IsOptional()
  @IsInt({ message: 'TDS must be an integer value' })
  @Min(0, { message: 'TDS must be at least 0 ppm' })
  @Max(10000, { message: 'TDS cannot exceed 10,000 ppm' })
  @IsValidTDS()
  @Transform(({ value }) => value !== null && value !== undefined ? parseInt(value) : value)
  tds?: number;

  @ApiProperty({
    description: 'Dissolved Oxygen (DO) level measurement in mg/L',
    example: 8.5,
    minimum: 0,
    maximum: 20,
    required: false,
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0, { message: 'DO level must be at least 0 mg/L' })
  @Max(20, { message: 'DO level cannot exceed 20 mg/L' })
  @IsValidDOLevel()
  @Transform(({ value }) => value !== null && value !== undefined ? parseFloat(value) : value)
  do_level?: number;

  @ApiProperty({
    description: 'Optional notes about the measurement',
    example: 'Measurement taken after feeding',
    maxLength: 500,
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'Notes cannot exceed 500 characters' })
  @Transform(({ value }) => value?.trim())
  notes?: string;

  @ApiProperty({
    description: 'Whether to compare with sensor data automatically',
    example: true,
    default: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === true || value === 'true')
  compare_with_sensor?: boolean = true;

  // Class-level validations
  @HasAtLeastOneMeasurement()
  @IsBiologicallyPlausible()
  _validationTrigger?: boolean; // This field is just to trigger class-level validation
}
