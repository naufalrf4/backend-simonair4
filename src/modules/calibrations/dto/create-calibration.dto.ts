import { IsNotEmpty, IsString, IsObject, IsUUID } from 'class-validator';

export class CreateCalibrationDto {
  @IsUUID()
  @IsNotEmpty()
  device_id: string;

  @IsString()
  @IsNotEmpty()
  sensor_type: string;

  @IsObject()
  @IsNotEmpty()
  calibration_data: Record<string, any>;
}