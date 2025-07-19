import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
} from 'class-validator';

export function ValidateCalibrationData(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'validateCalibrationData',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          const obj = args.object as any;
          const sensorType = obj.sensor_type;
          const calibrationData = value;

          if (!calibrationData || typeof calibrationData !== 'object') {
            return false;
          }

          // Validate based on sensor type
          switch (sensorType) {
            case 'ph':
              // pH requires m (slope) and c (intercept)
              if (
                typeof calibrationData.m !== 'number' ||
                typeof calibrationData.c !== 'number'
              ) {
                return false;
              }
              // Check for invalid fields for pH
              const phValidFields = ['m', 'c'];
              const phFields = Object.keys(calibrationData);
              if (phFields.some((field) => !phValidFields.includes(field))) {
                return false;
              }
              break;

            case 'tds':
              // TDS requires v (voltage), std (standard), and t (temperature)
              if (
                typeof calibrationData.v !== 'number' ||
                typeof calibrationData.std !== 'number' ||
                typeof calibrationData.t !== 'number'
              ) {
                return false;
              }
              // Check for invalid fields for TDS
              const tdsValidFields = ['v', 'std', 't'];
              const tdsFields = Object.keys(calibrationData);
              if (tdsFields.some((field) => !tdsValidFields.includes(field))) {
                return false;
              }
              break;

            case 'do':
              // DO calibration can be either single-point or two-point
              const isSinglePoint = 'ref' in calibrationData && 'v' in calibrationData && 't' in calibrationData;
              const isTwoPoint = 'ref' in calibrationData && 'v1' in calibrationData && 't1' in calibrationData && 'v2' in calibrationData && 't2' in calibrationData;
              
              if (!isSinglePoint && !isTwoPoint) {
                return false;
              }

              // Validate ref is always required
              if (typeof calibrationData.ref !== 'number') {
                return false;
              }

              if (isSinglePoint) {
                // Single point: ref, v, t, (optional: calibrated)
                if (
                  typeof calibrationData.v !== 'number' ||
                  typeof calibrationData.t !== 'number'
                ) {
                  return false;
                }
                // Check for invalid fields for single-point DO
                const doSingleValidFields = ['ref', 'v', 't', 'calibrated'];
                const doSingleFields = Object.keys(calibrationData);
                if (doSingleFields.some((field) => !doSingleValidFields.includes(field))) {
                  return false;
                }
              } else if (isTwoPoint) {
                // Two point: ref, v1, t1, v2, t2, (optional: calibrated)
                if (
                  typeof calibrationData.v1 !== 'number' ||
                  typeof calibrationData.t1 !== 'number' ||
                  typeof calibrationData.v2 !== 'number' ||
                  typeof calibrationData.t2 !== 'number'
                ) {
                  return false;
                }
                // Check for invalid fields for two-point DO
                const doTwoValidFields = ['ref', 'v1', 't1', 'v2', 't2', 'calibrated'];
                const doTwoFields = Object.keys(calibrationData);
                if (doTwoFields.some((field) => !doTwoValidFields.includes(field))) {
                  return false;
                }
              }
              break;

            default:
              return false;
          }

          return true;
        },
        defaultMessage(args: ValidationArguments) {
          const obj = args.object as any;
          const sensorType = obj.sensor_type;

          switch (sensorType) {
            case 'ph':
              return 'pH calibration requires m (slope) and c (intercept) numeric values';
            case 'tds':
              return 'TDS calibration requires v (voltage), std (standard), and t (temperature) numeric values';
            case 'do':
              return 'DO calibration requires either single-point format (ref, v, t) or two-point format (ref, v1, t1, v2, t2) with numeric values';
            default:
              return 'Invalid calibration data for sensor type';
          }
        },
      },
    });
  };
}
