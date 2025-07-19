import {
  IsOptional,
  IsNumberString,
  Validate,
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

@ValidatorConstraint({ name: 'isValidThresholdRange', async: false })
export class IsValidThresholdRange implements ValidatorConstraintInterface {
  validate(value: string, args: ValidationArguments) {
    if (!value) return true; // Optional fields can be empty

    const numValue = parseFloat(value);
    if (isNaN(numValue)) return false;

    const property = args.property;

    // pH range validation (0-14)
    if (property.startsWith('ph_')) {
      return numValue >= 0 && numValue <= 14;
    }

    // TDS range validation (0-2000 ppm)
    if (property.startsWith('tds_')) {
      return numValue >= 0 && numValue <= 2000;
    }

    // DO range validation (0-20 mg/L)
    if (property.startsWith('do_')) {
      return numValue >= 0 && numValue <= 20;
    }

    // Temperature range validation (-10 to 50°C)
    if (property.startsWith('temp_')) {
      return numValue >= -10 && numValue <= 50;
    }

    return true;
  }

  defaultMessage(args: ValidationArguments) {
    const property = args.property;

    if (property.startsWith('ph_')) {
      return 'pH value must be between 0 and 14';
    }
    if (property.startsWith('tds_')) {
      return 'TDS value must be between 0 and 2000 ppm';
    }
    if (property.startsWith('do_')) {
      return 'DO value must be between 0 and 20 mg/L';
    }
    if (property.startsWith('temp_')) {
      return 'Temperature value must be between -10 and 50°C';
    }

    return 'Invalid threshold value';
  }
}

export class ThresholdRequestDto {
  @ApiProperty({
    description: 'Minimum pH threshold value',
    example: '6.5',
    required: false,
  })
  @IsOptional()
  @IsNumberString({}, { message: 'pH minimum must be a valid numeric string' })
  @Validate(IsValidThresholdRange)
  ph_min?: string;

  @ApiProperty({
    description: 'Maximum pH threshold value',
    example: '8.5',
    required: false,
  })
  @IsOptional()
  @IsNumberString({}, { message: 'pH maximum must be a valid numeric string' })
  @Validate(IsValidThresholdRange)
  ph_max?: string;

  @ApiProperty({
    description: 'Minimum TDS threshold value in ppm',
    example: '200',
    required: false,
  })
  @IsOptional()
  @IsNumberString({}, { message: 'TDS minimum must be a valid numeric string' })
  @Validate(IsValidThresholdRange)
  tds_min?: string;

  @ApiProperty({
    description: 'Maximum TDS threshold value in ppm',
    example: '800',
    required: false,
  })
  @IsOptional()
  @IsNumberString({}, { message: 'TDS maximum must be a valid numeric string' })
  @Validate(IsValidThresholdRange)
  tds_max?: string;

  @ApiProperty({
    description: 'Minimum dissolved oxygen threshold value in mg/L',
    example: '5.0',
    required: false,
  })
  @IsOptional()
  @IsNumberString({}, { message: 'DO minimum must be a valid numeric string' })
  @Validate(IsValidThresholdRange)
  do_min?: string;

  @ApiProperty({
    description: 'Maximum dissolved oxygen threshold value in mg/L',
    example: '12.0',
    required: false,
  })
  @IsOptional()
  @IsNumberString({}, { message: 'DO maximum must be a valid numeric string' })
  @Validate(IsValidThresholdRange)
  do_max?: string;

  @ApiProperty({
    description: 'Minimum temperature threshold value in °C',
    example: '20.0',
    required: false,
  })
  @IsOptional()
  @IsNumberString(
    {},
    { message: 'Temperature minimum must be a valid numeric string' },
  )
  @Validate(IsValidThresholdRange)
  temp_min?: string;

  @ApiProperty({
    description: 'Maximum temperature threshold value in °C',
    example: '30.0',
    required: false,
  })
  @IsOptional()
  @IsNumberString(
    {},
    { message: 'Temperature maximum must be a valid numeric string' },
  )
  @Validate(IsValidThresholdRange)
  temp_max?: string;
}
