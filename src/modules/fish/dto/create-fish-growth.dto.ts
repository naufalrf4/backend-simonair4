import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsOptional, IsString, IsDateString } from 'class-validator';

export class CreateFishGrowthDto {
  @ApiProperty({ description: 'The date of the measurement.' })
  @IsDateString()
  @IsNotEmpty()
  measurement_date: Date;

  @ApiProperty({ description: 'Length of the fish in centimeters.', required: false })
  @IsNumber()
  @IsOptional()
  length_cm?: number;

  @ApiProperty({ description: 'Weight of the fish in grams.', required: false })
  @IsNumber()
  @IsOptional()
  weight_gram?: number;

  @ApiProperty({ description: 'Notes about the measurement.', required: false })
  @IsString()
  @IsOptional()
  notes?: string;
}