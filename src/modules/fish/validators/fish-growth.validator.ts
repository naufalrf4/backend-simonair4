import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';

@ValidatorConstraint({ name: 'isFutureDate', async: false })
export class IsFutureDateConstraint implements ValidatorConstraintInterface {
  validate(value: any, args: ValidationArguments) {
    if (!value) return true; // Allow empty values (handled by @IsOptional)
    
    const date = new Date(value);
    const now = new Date();
    
    // Remove time component for date comparison
    const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const nowOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    return dateOnly <= nowOnly;
  }

  defaultMessage(args: ValidationArguments) {
    return 'measurement_date cannot be in the future';
  }
}

export function IsFutureDate(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsFutureDateConstraint,
    });
  };
}

@ValidatorConstraint({ name: 'isValidMeasurementCombination', async: false })
export class IsValidMeasurementCombinationConstraint implements ValidatorConstraintInterface {
  validate(value: any, args: ValidationArguments) {
    const object = args.object as any;
    const hasLength = object.length_cm !== undefined && object.length_cm !== null;
    const hasWeight = object.weight_gram !== undefined && object.weight_gram !== null;
    
    // At least one measurement must be provided
    return hasLength || hasWeight;
  }

  defaultMessage(args: ValidationArguments) {
    return 'At least one measurement (length_cm or weight_gram) must be provided';
  }
}

export function IsValidMeasurementCombination(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsValidMeasurementCombinationConstraint,
    });
  };
}

@ValidatorConstraint({ name: 'isValidMeasurementRange', async: false })
export class IsValidMeasurementRangeConstraint implements ValidatorConstraintInterface {
  validate(value: any, args: ValidationArguments) {
    const object = args.object as any;
    const length = object.length_cm;
    const weight = object.weight_gram;
    
    // If both measurements are provided, validate their biological plausibility
    if (length && weight) {
      // Basic biological plausibility check
      // Expected weight range based on length (very rough estimates)
      const minExpectedWeight = Math.pow(length / 10, 3) * 0.5; // Lower bound
      const maxExpectedWeight = Math.pow(length / 10, 3) * 15; // Upper bound
      
      if (weight < minExpectedWeight || weight > maxExpectedWeight) {
        return false;
      }
    }
    
    return true;
  }

  defaultMessage(args: ValidationArguments) {
    return 'The combination of length and weight measurements appears biologically implausible';
  }
}

export function IsValidMeasurementRange(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsValidMeasurementRangeConstraint,
    });
  };
}

@ValidatorConstraint({ name: 'isNotDuplicateDate', async: false })
export class IsNotDuplicateDateConstraint implements ValidatorConstraintInterface {
  validate(value: any, args: ValidationArguments) {
    // This will be implemented in the service layer for database validation
    // For now, we'll just return true and handle duplicates in the service
    return true;
  }

  defaultMessage(args: ValidationArguments) {
    return 'A measurement already exists for this date';
  }
}

export function IsNotDuplicateDate(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsNotDuplicateDateConstraint,
    });
  };
}

// Utility class for additional validation logic
export class FishGrowthValidator {
  static validateMeasurementDate(date: Date): boolean {
    if (!date) return false;
    
    const now = new Date();
    const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const nowOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    return dateOnly <= nowOnly;
  }

  static validateMeasurementValues(length?: number, weight?: number): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (length !== undefined) {
      if (length <= 0) {
        errors.push('Length must be greater than 0');
      }
      if (length > 200) {
        errors.push('Length cannot exceed 200 cm');
      }
    }
    
    if (weight !== undefined) {
      if (weight <= 0) {
        errors.push('Weight must be greater than 0');
      }
      if (weight > 50000) {
        errors.push('Weight cannot exceed 50000 grams');
      }
    }
    
    if (length && weight) {
      const minExpectedWeight = Math.pow(length / 10, 3) * 0.5;
      const maxExpectedWeight = Math.pow(length / 10, 3) * 15;
      
      if (weight < minExpectedWeight || weight > maxExpectedWeight) {
        errors.push('The combination of length and weight appears biologically implausible');
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  static validateMeasurementCombination(length?: number, weight?: number): boolean {
    return length !== undefined || weight !== undefined;
  }

  static sanitizeNotes(notes?: string): string | undefined {
    if (!notes) return undefined;
    
    // Remove potentially harmful characters and trim
    return notes
      .trim()
      .replace(/[<>]/g, '') // Remove potential HTML tags
      .substring(0, 1000); // Limit length
  }

  static calculateBiomass(length?: number, weight?: number): number | null {
    if (!length || !weight) return null;
    
    try {
      // Biomass = (length_cm * weight_gram) / 1000
      const biomass = (length * weight) / 1000;
      return Number(biomass.toFixed(3));
    } catch (error) {
      return null;
    }
  }

  static calculateConditionIndicator(length?: number, weight?: number): string | null {
    if (!length || !weight) return null;
    
    try {
      // Condition factor (K) = (100 * weight_gram) / (length_cm^3)
      const k = (100 * weight) / Math.pow(length, 3);
      
      if (k < 0.8) return 'Poor';
      if (k >= 0.8 && k < 1.2) return 'Good';
      if (k >= 1.2) return 'Excellent';
      
      return 'Good'; // Default fallback
    } catch (error) {
      return null;
    }
  }
}
