import {
  IsNumber,
  IsNotEmpty,
  IsObject,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class ThresholdDataDto {
  @IsNumber()
  @IsNotEmpty()
  ph_good: number;

  @IsNumber()
  @IsNotEmpty()
  ph_bad: number;

  @IsNumber()
  @IsNotEmpty()
  tds_good: number;

  @IsNumber()
  @IsNotEmpty()
  tds_bad: number;

  @IsNumber()
  @IsNotEmpty()
  do_good: number;

  @IsNumber()
  @IsNotEmpty()
  do_bad: number;

  @IsNumber()
  @IsNotEmpty()
  temp_low: number;

  @IsNumber()
  @IsNotEmpty()
  temp_high: number;
}

export class CreateThresholdDto {
  @IsObject()
  @ValidateNested()
  @Type(() => ThresholdDataDto)
  @IsNotEmpty()
  readonly threshold: ThresholdDataDto;
}
