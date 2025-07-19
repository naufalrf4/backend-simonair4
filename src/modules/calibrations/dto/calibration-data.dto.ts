import { IsNumber, IsOptional } from 'class-validator';

export class CalibrationDataDto {
  // pH calibration parameters
  @IsNumber({}, { message: 'm (slope) must be a number for pH calibration' })
  @IsOptional()
  m?: number; // slope

  @IsNumber(
    {},
    { message: 'c (intercept) must be a number for pH calibration' },
  )
  @IsOptional()
  c?: number; // intercept

  // TDS calibration parameters
  @IsNumber(
    {},
    { message: 'v (voltage) must be a number for TDS/DO calibration' },
  )
  @IsOptional()
  v?: number; // voltage

  @IsNumber(
    {},
    { message: 'std (standard) must be a number for TDS calibration' },
  )
  @IsOptional()
  std?: number; // standard

  @IsNumber(
    {},
    { message: 't (temperature) must be a number for TDS/DO calibration' },
  )
  @IsOptional()
  t?: number; // temperature

  // DO calibration parameters
  @IsNumber(
    {},
    { message: 'ref (reference) must be a number for DO calibration' },
  )
  @IsOptional()
  ref?: number; // reference
}
