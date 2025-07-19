import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsJSON,
  MinLength,
  MaxLength,
  IsNumber,
  Min,
} from 'class-validator';

export class CreateFeedDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  device_id: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(100)
  feed_name: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(50)
  feed_type: string;

  @ApiProperty({
    description: 'The amount of feed given in kilograms.',
    example: 1.5,
  })
  @IsNumber()
  @IsNotEmpty()
  @Min(0)
  feed_amount_kg: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsJSON()
  feeding_schedule?: Record<string, any>;
}
