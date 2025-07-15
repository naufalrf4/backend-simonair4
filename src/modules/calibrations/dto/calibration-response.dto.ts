import { Expose } from 'class-transformer';

export class CalibrationResponseDto {
  @Expose()
  id: string;

  @Expose()
  device_id: string;

  @Expose()
  sensor_type: string;

  @Expose()
  calibration_data: Record<string, any>;

  @Expose()
  applied_at: Date;

  @Expose()
  applied_by: string;
}