import { IsIn, IsOptional, IsString, IsDateString } from 'class-validator';

export class ExportQueryDto {
  @IsDateString()
  @IsOptional()
  from?: string;

  @IsDateString()
  @IsOptional()
  to?: string;

  @IsIn(['csv', 'excel', 'pdf', 'json'])
  @IsOptional()
  format?: string = 'csv';
}