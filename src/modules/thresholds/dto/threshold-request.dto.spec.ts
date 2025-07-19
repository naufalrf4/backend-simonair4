import { validate } from 'class-validator';
import { plainToClass } from 'class-transformer';
import { ThresholdRequestDto } from './threshold-request.dto';

describe('ThresholdRequestDto', () => {
  describe('validation', () => {
    it('should pass validation with valid threshold values', async () => {
      const dto = plainToClass(ThresholdRequestDto, {
        ph_min: '6.5',
        ph_max: '8.5',
        tds_min: '200',
        tds_max: '800',
        do_min: '5.0',
        do_max: '12.0',
        temp_min: '20.0',
        temp_max: '30.0',
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should pass validation with partial threshold values', async () => {
      const dto = plainToClass(ThresholdRequestDto, {
        ph_min: '6.5',
        tds_max: '800',
        do_min: '5.0',
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should pass validation with empty object (all optional)', async () => {
      const dto = plainToClass(ThresholdRequestDto, {});

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should fail validation with invalid pH values', async () => {
      const dto = plainToClass(ThresholdRequestDto, {
        ph_min: '-1.0', // Invalid: below 0
        ph_max: '15.0', // Invalid: above 14
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(2);
      expect(errors[0].constraints).toHaveProperty('isValidThresholdRange');
      expect(errors[1].constraints).toHaveProperty('isValidThresholdRange');
    });

    it('should fail validation with invalid TDS values', async () => {
      const dto = plainToClass(ThresholdRequestDto, {
        tds_min: '-10', // Invalid: below 0
        tds_max: '3000', // Invalid: above 2000
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(2);
      expect(errors[0].constraints).toHaveProperty('isValidThresholdRange');
      expect(errors[1].constraints).toHaveProperty('isValidThresholdRange');
    });

    it('should fail validation with invalid DO values', async () => {
      const dto = plainToClass(ThresholdRequestDto, {
        do_min: '-1.0', // Invalid: below 0
        do_max: '25.0', // Invalid: above 20
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(2);
      expect(errors[0].constraints).toHaveProperty('isValidThresholdRange');
      expect(errors[1].constraints).toHaveProperty('isValidThresholdRange');
    });

    it('should fail validation with invalid temperature values', async () => {
      const dto = plainToClass(ThresholdRequestDto, {
        temp_min: '-15.0', // Invalid: below -10
        temp_max: '60.0', // Invalid: above 50
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(2);
      expect(errors[0].constraints).toHaveProperty('isValidThresholdRange');
      expect(errors[1].constraints).toHaveProperty('isValidThresholdRange');
    });

    it('should fail validation with non-numeric string values', async () => {
      const dto = plainToClass(ThresholdRequestDto, {
        ph_min: 'invalid',
        tds_max: 'not-a-number',
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(2);
      expect(errors[0].constraints).toHaveProperty('isNumberString');
      expect(errors[1].constraints).toHaveProperty('isNumberString');
    });

    it('should fail validation with numeric values instead of strings', async () => {
      const dto = plainToClass(ThresholdRequestDto, {
        ph_min: 6.5, // Should be string
        ph_max: 8.5, // Should be string
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(2);
      expect(errors[0].constraints).toHaveProperty('isNumberString');
      expect(errors[1].constraints).toHaveProperty('isNumberString');
    });

    it('should provide appropriate error messages for different parameter types', async () => {
      const dto = plainToClass(ThresholdRequestDto, {
        ph_min: '15.0',
        tds_min: '3000',
        do_min: '25.0',
        temp_min: '60.0',
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(4);

      const phError = errors.find((e) => e.property === 'ph_min');
      expect(phError?.constraints?.isValidThresholdRange).toContain(
        'pH value must be between 0 and 14',
      );

      const tdsError = errors.find((e) => e.property === 'tds_min');
      expect(tdsError?.constraints?.isValidThresholdRange).toContain(
        'TDS value must be between 0 and 2000 ppm',
      );

      const doError = errors.find((e) => e.property === 'do_min');
      expect(doError?.constraints?.isValidThresholdRange).toContain(
        'DO value must be between 0 and 20 mg/L',
      );

      const tempError = errors.find((e) => e.property === 'temp_min');
      expect(tempError?.constraints?.isValidThresholdRange).toContain(
        'Temperature value must be between -10 and 50°C',
      );
    });
  });

  describe('edge cases', () => {
    it('should handle boundary values correctly', async () => {
      const dto = plainToClass(ThresholdRequestDto, {
        ph_min: '0',
        ph_max: '14',
        tds_min: '0',
        tds_max: '2000',
        do_min: '0',
        do_max: '20',
        temp_min: '-10',
        temp_max: '50',
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should handle decimal values correctly', async () => {
      const dto = plainToClass(ThresholdRequestDto, {
        ph_min: '6.75',
        tds_max: '1500.5',
        do_min: '5.25',
        temp_max: '25.8',
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });
  });
});
