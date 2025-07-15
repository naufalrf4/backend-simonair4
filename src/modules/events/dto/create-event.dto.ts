import { IsString, IsNotEmpty, IsDate, IsOptional, IsIn } from 'class-validator';
import { Type } from 'class-transformer';

const validEventTypes = ['water_change', 'mortality', 'feeding'];

export class CreateEventDto {
  @IsString()
  @IsNotEmpty()
  device_id: string;

  @IsString()
  @IsNotEmpty()
  @IsIn(validEventTypes)
  event_type: string;

  @IsDate()
  @Type(() => Date)
  event_date: Date;

  @IsString()
  @IsOptional()
  description?: string;
}