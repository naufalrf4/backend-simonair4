import { IsIn, IsNotEmpty } from 'class-validator';
import { ValidateCalibrationData } from './calibration-validation.decorator';

export class CalibrationRequestDto {
  @IsIn(['ph', 'tds', 'do'], {
    message: 'sensor_type must be one of: ph, tds, do',
  })
  @IsNotEmpty()
  sensor_type: string;

  @ValidateCalibrationData()
  @IsNotEmpty()
  calibration_data: Record<string, any>;
}
