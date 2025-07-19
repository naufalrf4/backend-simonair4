import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

// Temperature validator
@ValidatorConstraint({ async: false })
export class IsValidTemperatureConstraint implements ValidatorConstraintInterface {
  validate(temperature: number, args: ValidationArguments) {
    if (temperature === null || temperature === undefined) {
      return true; // Allow null/undefined for optional fields
    }
    
    // Biological range for aquaculture: 0°C to 50°C
    // Optimal range is typically 20-30°C for most species
    return temperature >= 0 && temperature <= 50;
  }

  defaultMessage(args: ValidationArguments) {
    return `Temperature must be between 0°C and 50°C. Current value: ${args.value}°C`;
  }
}

export function IsValidTemperature(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsValidTemperatureConstraint,
    });
  };
}

// pH validator
@ValidatorConstraint({ async: false })
export class IsValidPHConstraint implements ValidatorConstraintInterface {
  validate(ph: number, args: ValidationArguments) {
    if (ph === null || ph === undefined) {
      return true; // Allow null/undefined for optional fields
    }
    
    // pH scale: 0-14
    // Optimal range for aquaculture is typically 6.5-8.5
    return ph >= 0 && ph <= 14;
  }

  defaultMessage(args: ValidationArguments) {
    return `pH must be between 0 and 14. Current value: ${args.value}`;
  }
}

export function IsValidPH(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsValidPHConstraint,
    });
  };
}

// TDS validator
@ValidatorConstraint({ async: false })
export class IsValidTDSConstraint implements ValidatorConstraintInterface {
  validate(tds: number, args: ValidationArguments) {
    if (tds === null || tds === undefined) {
      return true; // Allow null/undefined for optional fields
    }
    
    // TDS range: 0-10000 ppm
    // Optimal range for aquaculture varies by species but typically 100-1000 ppm
    return Number.isInteger(tds) && tds >= 0 && tds <= 10000;
  }

  defaultMessage(args: ValidationArguments) {
    return `TDS must be an integer between 0 and 10,000 ppm. Current value: ${args.value}`;
  }
}

export function IsValidTDS(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsValidTDSConstraint,
    });
  };
}

// DO Level validator
@ValidatorConstraint({ async: false })
export class IsValidDOLevelConstraint implements ValidatorConstraintInterface {
  validate(doLevel: number, args: ValidationArguments) {
    if (doLevel === null || doLevel === undefined) {
      return true; // Allow null/undefined for optional fields
    }
    
    // DO level range: 0-20 mg/L
    // Optimal range for aquaculture is typically 5-10 mg/L
    return doLevel >= 0 && doLevel <= 20;
  }

  defaultMessage(args: ValidationArguments) {
    return `Dissolved Oxygen level must be between 0 and 20 mg/L. Current value: ${args.value} mg/L`;
  }
}

export function IsValidDOLevel(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsValidDOLevelConstraint,
    });
  };
}

// Future date validator
@ValidatorConstraint({ async: false })
export class IsNotFutureDateConstraint implements ValidatorConstraintInterface {
  validate(dateString: string, args: ValidationArguments) {
    if (!dateString) {
      return true; // Allow empty dates to be handled by other validators
    }
    
    const date = new Date(dateString);
    const now = new Date();
    
    // Allow some tolerance for timezone differences (5 minutes)
    const tolerance = 5 * 60 * 1000; // 5 minutes in milliseconds
    
    return date.getTime() <= (now.getTime() + tolerance);
  }

  defaultMessage(args: ValidationArguments) {
    return `Measurement timestamp cannot be in the future. Current value: ${args.value}`;
  }
}

export function IsNotFutureDate(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsNotFutureDateConstraint,
    });
  };
}

// Measurement completeness validator
@ValidatorConstraint({ async: false })
export class HasAtLeastOneMeasurementConstraint implements ValidatorConstraintInterface {
  validate(value: any, args: ValidationArguments) {
    const object = args.object as any;
    
    // Check if at least one measurement value is provided
    const hasTemperature = object.temperature !== null && object.temperature !== undefined;
    const hasPH = object.ph !== null && object.ph !== undefined;
    const hasTDS = object.tds !== null && object.tds !== undefined;
    const hasDOLevel = object.do_level !== null && object.do_level !== undefined;
    
    return hasTemperature || hasPH || hasTDS || hasDOLevel;
  }

  defaultMessage(args: ValidationArguments) {
    return 'At least one measurement value (temperature, pH, TDS, or DO level) must be provided';
  }
}

export function HasAtLeastOneMeasurement(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: HasAtLeastOneMeasurementConstraint,
    });
  };
}

// Biological plausibility validator
@ValidatorConstraint({ async: false })
export class IsBiologicallyPlausibleConstraint implements ValidatorConstraintInterface {
  validate(value: any, args: ValidationArguments) {
    const object = args.object as any;
    
    // Check for biologically implausible combinations
    
    // High temperature with high DO (cold water holds more oxygen)
    if (object.temperature > 30 && object.do_level > 10) {
      return false;
    }
    
    // Very low pH with high DO (acidic water affects oxygen solubility)
    if (object.ph < 6.0 && object.do_level > 12) {
      return false;
    }
    
    // Very high TDS with very low temperature (unusual combination)
    if (object.tds > 8000 && object.temperature < 10) {
      return false;
    }
    
    // All checks passed
    return true;
  }

  defaultMessage(args: ValidationArguments) {
    const object = args.object as any;
    
    if (object.temperature > 30 && object.do_level > 10) {
      return 'High temperature (>30°C) with high DO level (>10 mg/L) is biologically implausible';
    }
    
    if (object.ph < 6.0 && object.do_level > 12) {
      return 'Low pH (<6.0) with very high DO level (>12 mg/L) is biologically implausible';
    }
    
    if (object.tds > 8000 && object.temperature < 10) {
      return 'Very high TDS (>8000 ppm) with very low temperature (<10°C) is unusual';
    }
    
    return 'Measurement values are biologically implausible';
  }
}

export function IsBiologicallyPlausible(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsBiologicallyPlausibleConstraint,
    });
  };
}
