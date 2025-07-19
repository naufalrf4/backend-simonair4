import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * Base exception class for all fish growth validation exceptions
 */
export abstract class FishValidationException extends HttpException {
  public readonly correlationId: string;
  public readonly timestamp: Date;
  public readonly validationErrors: ValidationError[];

  constructor(
    message: string,
    statusCode: HttpStatus,
    validationErrors: ValidationError[],
    correlationId?: string,
  ) {
    super(message, statusCode);
    this.correlationId = correlationId || this.generateCorrelationId();
    this.timestamp = new Date();
    this.validationErrors = validationErrors;
  }

  private generateCorrelationId(): string {
    return `fish-val-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  public getErrorResponse() {
    return {
      statusCode: this.getStatus(),
      timestamp: this.timestamp.toISOString(),
      error: this.constructor.name,
      message: this.message,
      correlationId: this.correlationId,
      validationErrors: this.validationErrors,
    };
  }
}

/**
 * Interface for validation error details
 */
export interface ValidationError {
  field: string;
  value: any;
  constraint: string;
  message: string;
  children?: ValidationError[];
}

/**
 * Thrown when DTO validation fails
 */
export class DtoValidationException extends FishValidationException {
  constructor(
    validationErrors: ValidationError[],
    correlationId?: string,
  ) {
    super(
      'Validation failed',
      HttpStatus.BAD_REQUEST,
      validationErrors,
      correlationId,
    );
  }
}

/**
 * Thrown when required field is missing
 */
export class RequiredFieldException extends FishValidationException {
  constructor(
    field: string,
    correlationId?: string,
  ) {
    super(
      `Required field "${field}" is missing`,
      HttpStatus.BAD_REQUEST,
      [
        {
          field,
          value: null,
          constraint: 'isNotEmpty',
          message: `${field} should not be empty`,
        },
      ],
      correlationId,
    );
  }
}

/**
 * Thrown when field value is invalid
 */
export class InvalidFieldValueException extends FishValidationException {
  constructor(
    field: string,
    value: any,
    expectedType: string,
    correlationId?: string,
  ) {
    super(
      `Invalid value for field "${field}"`,
      HttpStatus.BAD_REQUEST,
      [
        {
          field,
          value,
          constraint: 'isType',
          message: `${field} must be a valid ${expectedType}`,
        },
      ],
      correlationId,
    );
  }
}

/**
 * Thrown when field value is out of range
 */
export class ValueOutOfRangeException extends FishValidationException {
  constructor(
    field: string,
    value: any,
    min: number,
    max: number,
    correlationId?: string,
  ) {
    super(
      `Value for field "${field}" is out of range`,
      HttpStatus.BAD_REQUEST,
      [
        {
          field,
          value,
          constraint: 'isInRange',
          message: `${field} must be between ${min} and ${max}`,
        },
      ],
      correlationId,
    );
  }
}

/**
 * Thrown when date format is invalid
 */
export class InvalidDateFormatException extends FishValidationException {
  constructor(
    field: string,
    value: any,
    expectedFormat: string,
    correlationId?: string,
  ) {
    super(
      `Invalid date format for field "${field}"`,
      HttpStatus.BAD_REQUEST,
      [
        {
          field,
          value,
          constraint: 'isDateString',
          message: `${field} must be a valid date in format ${expectedFormat}`,
        },
      ],
      correlationId,
    );
  }
}

/**
 * Thrown when date is in the future
 */
export class FutureDateException extends FishValidationException {
  constructor(
    field: string,
    value: any,
    correlationId?: string,
  ) {
    super(
      `Date for field "${field}" cannot be in the future`,
      HttpStatus.BAD_REQUEST,
      [
        {
          field,
          value,
          constraint: 'isNotFutureDate',
          message: `${field} cannot be in the future`,
        },
      ],
      correlationId,
    );
  }
}

/**
 * Thrown when measurement values are not biologically plausible
 */
export class BiologicalValidationException extends FishValidationException {
  constructor(
    length: number,
    weight: number,
    correlationId?: string,
  ) {
    super(
      'Measurement values are not biologically plausible',
      HttpStatus.BAD_REQUEST,
      [
        {
          field: 'length',
          value: length,
          constraint: 'isBiologicallyPlausible',
          message: `Length ${length}cm is not biologically plausible for weight ${weight}g`,
        },
        {
          field: 'weight',
          value: weight,
          constraint: 'isBiologicallyPlausible',
          message: `Weight ${weight}g is not biologically plausible for length ${length}cm`,
        },
      ],
      correlationId,
    );
  }
}

/**
 * Thrown when measurement combination is invalid
 */
export class InvalidMeasurementCombinationException extends FishValidationException {
  constructor(
    measurements: Record<string, any>,
    reason: string,
    correlationId?: string,
  ) {
    const validationErrors: ValidationError[] = Object.entries(measurements).map(
      ([field, value]) => ({
        field,
        value,
        constraint: 'isValidCombination',
        message: `${field} ${value} is part of an invalid measurement combination: ${reason}`,
      }),
    );

    super(
      'Invalid measurement combination',
      HttpStatus.BAD_REQUEST,
      validationErrors,
      correlationId,
    );
  }
}

/**
 * Thrown when UUID format is invalid
 */
export class InvalidUuidException extends FishValidationException {
  constructor(
    field: string,
    value: any,
    correlationId?: string,
  ) {
    super(
      `Invalid UUID format for field "${field}"`,
      HttpStatus.BAD_REQUEST,
      [
        {
          field,
          value,
          constraint: 'isUuid',
          message: `${field} must be a valid UUID`,
        },
      ],
      correlationId,
    );
  }
}

/**
 * Thrown when array validation fails
 */
export class ArrayValidationException extends FishValidationException {
  constructor(
    field: string,
    errors: ValidationError[],
    correlationId?: string,
  ) {
    super(
      `Array validation failed for field "${field}"`,
      HttpStatus.BAD_REQUEST,
      errors,
      correlationId,
    );
  }
}

/**
 * Thrown when nested object validation fails
 */
export class NestedValidationException extends FishValidationException {
  constructor(
    field: string,
    errors: ValidationError[],
    correlationId?: string,
  ) {
    super(
      `Nested validation failed for field "${field}"`,
      HttpStatus.BAD_REQUEST,
      errors,
      correlationId,
    );
  }
}

/**
 * Thrown when pagination parameters are invalid
 */
export class InvalidPaginationException extends FishValidationException {
  constructor(
    page: number,
    limit: number,
    maxLimit: number,
    correlationId?: string,
  ) {
    const validationErrors: ValidationError[] = [];

    if (page < 1) {
      validationErrors.push({
        field: 'page',
        value: page,
        constraint: 'min',
        message: 'page must be greater than or equal to 1',
      });
    }

    if (limit < 1) {
      validationErrors.push({
        field: 'limit',
        value: limit,
        constraint: 'min',
        message: 'limit must be greater than or equal to 1',
      });
    }

    if (limit > maxLimit) {
      validationErrors.push({
        field: 'limit',
        value: limit,
        constraint: 'max',
        message: `limit must be less than or equal to ${maxLimit}`,
      });
    }

    super(
      'Invalid pagination parameters',
      HttpStatus.BAD_REQUEST,
      validationErrors,
      correlationId,
    );
  }
}

/**
 * Thrown when filter parameters are invalid
 */
export class InvalidFilterException extends FishValidationException {
  constructor(
    field: string,
    value: any,
    allowedValues: string[],
    correlationId?: string,
  ) {
    super(
      `Invalid filter value for field "${field}"`,
      HttpStatus.BAD_REQUEST,
      [
        {
          field,
          value,
          constraint: 'isIn',
          message: `${field} must be one of: ${allowedValues.join(', ')}`,
        },
      ],
      correlationId,
    );
  }
}

/**
 * Thrown when sort parameters are invalid
 */
export class InvalidSortException extends FishValidationException {
  constructor(
    field: string,
    value: any,
    allowedFields: string[],
    correlationId?: string,
  ) {
    super(
      `Invalid sort field "${field}"`,
      HttpStatus.BAD_REQUEST,
      [
        {
          field: 'sort',
          value,
          constraint: 'isIn',
          message: `sort field must be one of: ${allowedFields.join(', ')}`,
        },
      ],
      correlationId,
    );
  }
}

/**
 * Thrown when bulk validation fails
 */
export class BulkValidationException extends FishValidationException {
  constructor(
    itemErrors: Array<{ index: number; errors: ValidationError[] }>,
    correlationId?: string,
  ) {
    const allErrors: ValidationError[] = itemErrors.flatMap(
      ({ index, errors }) =>
        errors.map(error => ({
          ...error,
          field: `items[${index}].${error.field}`,
        })),
    );

    super(
      'Bulk validation failed',
      HttpStatus.BAD_REQUEST,
      allErrors,
      correlationId,
    );
  }
}

/**
 * Thrown when file upload validation fails
 */
export class FileValidationException extends FishValidationException {
  constructor(
    fileName: string,
    error: string,
    correlationId?: string,
  ) {
    super(
      `File validation failed for "${fileName}"`,
      HttpStatus.BAD_REQUEST,
      [
        {
          field: 'file',
          value: fileName,
          constraint: 'isValidFile',
          message: error,
        },
      ],
      correlationId,
    );
  }
}

/**
 * Thrown when conditional validation fails
 */
export class ConditionalValidationException extends FishValidationException {
  constructor(
    condition: string,
    field: string,
    value: any,
    correlationId?: string,
  ) {
    super(
      `Conditional validation failed for field "${field}"`,
      HttpStatus.BAD_REQUEST,
      [
        {
          field,
          value,
          constraint: 'conditionalValidation',
          message: `${field} validation failed based on condition: ${condition}`,
        },
      ],
      correlationId,
    );
  }
}

/**
 * Thrown when business rule validation fails
 */
export class BusinessRuleValidationException extends FishValidationException {
  constructor(
    rule: string,
    field: string,
    value: any,
    correlationId?: string,
  ) {
    super(
      `Business rule validation failed for field "${field}"`,
      HttpStatus.BAD_REQUEST,
      [
        {
          field,
          value,
          constraint: 'businessRule',
          message: `${field} violates business rule: ${rule}`,
        },
      ],
      correlationId,
    );
  }
}

/**
 * Thrown when custom validation fails
 */
export class CustomValidationException extends FishValidationException {
  constructor(
    validator: string,
    field: string,
    value: any,
    message: string,
    correlationId?: string,
  ) {
    super(
      `Custom validation failed for field "${field}"`,
      HttpStatus.BAD_REQUEST,
      [
        {
          field,
          value,
          constraint: validator,
          message,
        },
      ],
      correlationId,
    );
  }
}
