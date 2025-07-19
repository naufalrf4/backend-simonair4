import { ApiProperty } from '@nestjs/swagger';

export class ValidationErrorDetail {
  @ApiProperty({
    description: 'Field name that failed validation',
    example: 'ph_min',
  })
  field: string;

  @ApiProperty({
    description: 'Validation error message',
    example: 'pH minimum must be less than pH maximum',
  })
  message: string;

  @ApiProperty({
    description: 'The value that failed validation',
    example: '8.5',
  })
  value: any;

  @ApiProperty({
    description: 'Validation constraint that was violated',
    example: 'isLessThan',
    required: false,
  })
  constraint?: string;

  constructor(field: string, message: string, value: any, constraint?: string) {
    this.field = field;
    this.message = message;
    this.value = value;
    this.constraint = constraint;
  }
}

export class ErrorDetails {
  @ApiProperty({
    description: 'HTTP status code',
    example: 400,
  })
  code: number;

  @ApiProperty({
    description: 'Error message',
    example: 'Validation failed',
  })
  message: string;

  @ApiProperty({
    description: 'Detailed validation errors',
    type: [ValidationErrorDetail],
    required: false,
  })
  details?: ValidationErrorDetail[];

  @ApiProperty({
    description: 'Device ID related to the error',
    example: 'SMNR-1234',
    required: false,
  })
  deviceId?: string;

  @ApiProperty({
    description: 'Error type classification',
    example: 'VALIDATION_ERROR',
    required: false,
  })
  type?: string;

  @ApiProperty({
    description: 'Additional context information',
    required: false,
  })
  context?: Record<string, any>;

  constructor(
    code: number,
    message: string,
    details?: ValidationErrorDetail[],
    deviceId?: string,
    type?: string,
    context?: Record<string, any>,
  ) {
    this.code = code;
    this.message = message;
    this.details = details;
    this.deviceId = deviceId;
    this.type = type;
    this.context = context;
  }
}

export class ErrorResponseDto {
  @ApiProperty({
    description: 'Response status',
    example: 'error',
  })
  status: 'error';

  @ApiProperty({
    description: 'Error details',
    type: ErrorDetails,
  })
  error: ErrorDetails;

  @ApiProperty({
    description: 'Response metadata',
  })
  metadata: {
    timestamp: string;
    path: string;
    executionTime?: number;
    requestId?: string;
  };

  constructor(
    error: ErrorDetails,
    path: string,
    executionTime?: number,
    requestId?: string,
  ) {
    this.status = 'error';
    this.error = error;
    this.metadata = {
      timestamp: new Date().toISOString(),
      path,
      executionTime,
      requestId,
    };
  }
}
