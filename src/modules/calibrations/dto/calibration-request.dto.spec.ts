import { validate } from 'class-validator';
import { CalibrationRequestDto } from './calibration-request.dto';

describe('CalibrationRequestDto', () => {
  describe('sensor_type validation', () => {
    it('should accept valid sensor types', async () => {
      const validTypes = ['ph', 'tds', 'do'];

      for (const sensorType of validTypes) {
        const dto = new CalibrationRequestDto();
        dto.sensor_type = sensorType;
        dto.calibration_data = getValidCalibrationData(sensorType);

        const errors = await validate(dto);
        expect(errors.length).toBe(0);
      }
    });

    it('should reject invalid sensor types', async () => {
      const dto = new CalibrationRequestDto();
      dto.sensor_type = 'invalid';
      dto.calibration_data = { m: 1, c: 2 };

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].constraints).toHaveProperty('isIn');
    });
  });

  describe('pH calibration validation', () => {
    it('should accept valid pH calibration data', async () => {
      const dto = new CalibrationRequestDto();
      dto.sensor_type = 'ph';
      dto.calibration_data = { m: -7.153, c: 22.456 };

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should reject pH calibration with missing parameters', async () => {
      const dto = new CalibrationRequestDto();
      dto.sensor_type = 'ph';
      dto.calibration_data = { m: -7.153 }; // missing c

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should reject pH calibration with invalid parameters', async () => {
      const dto = new CalibrationRequestDto();
      dto.sensor_type = 'ph';
      dto.calibration_data = { m: -7.153, c: 22.456, invalid: 123 };

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe('TDS calibration validation', () => {
    it('should accept valid TDS calibration data', async () => {
      const dto = new CalibrationRequestDto();
      dto.sensor_type = 'tds';
      dto.calibration_data = { v: 1.42, std: 442, t: 25.0 };

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should reject TDS calibration with missing parameters', async () => {
      const dto = new CalibrationRequestDto();
      dto.sensor_type = 'tds';
      dto.calibration_data = { v: 1.42, std: 442 }; // missing t

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe('DO calibration validation', () => {
    it('should accept valid DO calibration data', async () => {
      const dto = new CalibrationRequestDto();
      dto.sensor_type = 'do';
      dto.calibration_data = { ref: 8.0, v: 1.171, t: 25.0 };

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should reject DO calibration with missing parameters', async () => {
      const dto = new CalibrationRequestDto();
      dto.sensor_type = 'do';
      dto.calibration_data = { ref: 8.0, v: 1.171 }; // missing t

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });
  });
});

function getValidCalibrationData(sensorType: string): Record<string, any> {
  switch (sensorType) {
    case 'ph':
      return { m: -7.153, c: 22.456 };
    case 'tds':
      return { v: 1.42, std: 442, t: 25.0 };
    case 'do':
      return { ref: 8.0, v: 1.171, t: 25.0 };
    default:
      return {};
  }
}
