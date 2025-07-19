import { Expose, Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class UserBasicInfoDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @Expose()
  id: string;

  @ApiProperty({ example: 'John Doe' })
  @Expose()
  name: string;

  @ApiProperty({ example: 'john.doe@example.com' })
  @Expose()
  email: string;
}

export class DeviceBasicInfoDto {
  @ApiProperty({ example: 'SMNR-0001' })
  @Expose()
  device_id: string;

  @ApiProperty({ example: 'Main Tank' })
  @Expose()
  device_name: string;
}

export class MeasurementComparisonDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @Expose()
  id: string;

  @ApiProperty({ example: 0.5 })
  @Expose()
  temperature_diff: number | null;

  @ApiProperty({ example: -0.2 })
  @Expose()
  ph_diff: number | null;

  @ApiProperty({ example: 25 })
  @Expose()
  tds_diff: number | null;

  @ApiProperty({ example: 0.3 })
  @Expose()
  do_level_diff: number | null;

  @ApiProperty({ example: 98.5 })
  @Expose()
  accuracy_score: number;

  @ApiProperty({ example: 'HIGH' })
  @Expose()
  accuracy_level: string;

  @ApiProperty({ example: '2024-01-15T10:27:30Z' })
  @Expose()
  sensor_timestamp: Date;

  @ApiProperty({ example: '2024-01-15T10:35:00Z' })
  @Expose()
  created_at: Date;
}

export class DeviceLocationDto {
  @ApiProperty({ example: 'Laboratory' })
  @Expose()
  location: string;
}

export class SensorComparisonDataDto {
  @ApiProperty({ example: true })
  @Expose()
  sensor_data_available: boolean;

  @ApiProperty({ example: '2024-01-15T10:28:00Z' })
  @Expose()
  sensor_timestamp: Date | null;

  @ApiProperty({ example: 2.5 })
  @Expose()
  time_difference_minutes: number | null;

  @ApiProperty({ example: 0.5 })
  @Expose()
  temperature_difference: number | null;

  @ApiProperty({ example: -0.1 })
  @Expose()
  ph_difference: number | null;

  @ApiProperty({ example: 15 })
  @Expose()
  tds_difference: number | null;

  @ApiProperty({ example: 0.3 })
  @Expose()
  do_level_difference: number | null;

  @ApiProperty({ example: 'GOOD', enum: ['EXCELLENT', 'GOOD', 'FAIR', 'POOR', 'VERY_POOR'] })
  @Expose()
  accuracy_assessment: string;

  @ApiProperty({ example: ['WITHIN_RANGE'] })
  @Expose()
  flags: string[];

  @ApiProperty({ 
    type: 'object',
    properties: {
      temperature: { type: 'number', example: 26.5 },
      ph: { type: 'number', example: 7.2 },
      tds: { type: 'number', example: 450 },
      do_level: { type: 'number', example: 8.5 }
    }
  })
  @Expose()
  sensor_values: {
    temperature?: number;
    ph?: number;
    tds?: number;
    do_level?: number;
  } | null;

  @ApiProperty({ 
    type: 'object',
    properties: {
      temperature: { type: 'number', example: 26.5 },
      ph: { type: 'number', example: 7.2 },
      tds: { type: 'number', example: 450 },
      do_level: { type: 'number', example: 8.5 }
    }
  })
  @Expose()
  manual_values: {
    temperature?: number;
    ph?: number;
    tds?: number;
    do_level?: number;
  };
}

export class ManualMeasurementResponseDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @Expose()
  id: string;

  @ApiProperty({ example: 'SMNR-0001' })
  @Expose()
  device_id: string;

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @Expose()
  measured_by: string;

  @ApiProperty({ example: '2024-01-15T10:30:00Z' })
  @Expose()
  measurement_timestamp: Date;

  @ApiProperty({ example: 26.5 })
  @Expose()
  temperature: number | null;

  @ApiProperty({ example: 7.2 })
  @Expose()
  ph: number | null;

  @ApiProperty({ example: 450 })
  @Expose()
  tds: number | null;

  @ApiProperty({ example: 8.5 })
  @Expose()
  do_level: number | null;

  @ApiProperty({ example: 'Measurement taken after feeding' })
  @Expose()
  notes: string | null;

  @ApiProperty({ example: '2024-01-15T10:30:00Z' })
  @Expose()
  created_at: Date;

  @ApiProperty({ type: UserBasicInfoDto })
  @Expose()
  @Type(() => UserBasicInfoDto)
  user: UserBasicInfoDto;

  @ApiProperty({ type: DeviceBasicInfoDto })
  @Expose()
  @Type(() => DeviceBasicInfoDto)
  device: DeviceBasicInfoDto;

  @ApiProperty({ type: SensorComparisonDataDto, required: false })
  @Expose()
  @Type(() => SensorComparisonDataDto)
  comparison?: SensorComparisonDataDto;
}

export class PaginationMetaDto {
  @ApiProperty({ example: 1 })
  @Expose()
  page: number;

  @ApiProperty({ example: 20 })
  @Expose()
  limit: number;

  @ApiProperty({ example: 0 })
  @Expose()
  offset: number;

  @ApiProperty({ example: 150 })
  @Expose()
  total: number;

  @ApiProperty({ example: 8 })
  @Expose()
  totalPages: number;

  @ApiProperty({ example: true })
  @Expose()
  hasNext: boolean;

  @ApiProperty({ example: false })
  @Expose()
  hasPrevious: boolean;
}

export class ManualMeasurementListResponseDto {
  @ApiProperty({ type: [ManualMeasurementResponseDto] })
  @Expose()
  @Type(() => ManualMeasurementResponseDto)
  data: ManualMeasurementResponseDto[];

  @ApiProperty({ type: PaginationMetaDto })
  @Expose()
  @Type(() => PaginationMetaDto)
  meta: PaginationMetaDto;
}
