import { IsOptional, IsString, IsDate, IsIn } from 'class-validator';
import { Type } from 'class-transformer';

const validEventTypes = ['water_change', 'mortality', 'feeding'];

export class EventQueryDto {
  @IsOptional()
  @IsString()
  @IsIn(validEventTypes)
  event_type?: string;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  start_date?: Date;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  end_date?: Date;
}
