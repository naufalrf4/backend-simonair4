import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsJSON, MinLength, MaxLength } from 'class-validator';

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

  @ApiProperty({ required: false })
  @IsOptional()
  @IsJSON()
  feeding_schedule?: Record<string, any>;
}