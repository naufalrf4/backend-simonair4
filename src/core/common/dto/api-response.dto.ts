import { ApiProperty } from '@nestjs/swagger';

export class ApiResponseMetadata {
  @ApiProperty({
    description: 'Response timestamp in ISO 8601 format',
    example: '2024-01-15T10:30:00.123Z',
  })
  timestamp: string;

  @ApiProperty({
    description: 'Request path',
    example: '/api/devices/SMNR-1234/calibrations',
  })
  path: string;

  @ApiProperty({
    description: 'Request execution time in milliseconds',
    example: 45,
    required: false,
  })
  executionTime?: number;

  @ApiProperty({
    description: 'Request ID for tracing',
    example: 'req-123e4567-e89b-12d3-a456-426614174000',
    required: false,
  })
  requestId?: string;

  @ApiProperty({
    description: 'API version',
    example: '1.0.0',
    required: false,
  })
  version?: string;

  constructor(
    path: string,
    executionTime?: number,
    requestId?: string,
    version?: string,
  ) {
    this.timestamp = new Date().toISOString();
    this.path = path;
    this.executionTime = executionTime;
    this.requestId = requestId;
    this.version = version || '1.0.0';
  }
}

export class ApiSuccessResponse<T = any> {
  @ApiProperty({
    description: 'Response status',
    example: 'success',
  })
  status: 'success';

  @ApiProperty({
    description: 'Response data',
  })
  data: T;

  @ApiProperty({
    description: 'Response metadata',
    type: ApiResponseMetadata,
  })
  metadata: ApiResponseMetadata;

  constructor(data: T, metadata: ApiResponseMetadata) {
    this.status = 'success';
    this.data = data;
    this.metadata = metadata;
  }
}

export class PaginatedResponse<T = any> {
  @ApiProperty({
    description: 'Array of items',
    isArray: true,
  })
  items: T[];

  @ApiProperty({
    description: 'Total number of items',
    example: 25,
  })
  total: number;

  @ApiProperty({
    description: 'Current page number',
    example: 1,
  })
  page: number;

  @ApiProperty({
    description: 'Number of items per page',
    example: 10,
  })
  limit: number;

  @ApiProperty({
    description: 'Total number of pages',
    example: 3,
  })
  totalPages: number;

  @ApiProperty({
    description: 'Whether there is a next page',
    example: true,
  })
  hasNext: boolean;

  @ApiProperty({
    description: 'Whether there is a previous page',
    example: false,
  })
  hasPrevious: boolean;

  constructor(items: T[], total: number, page: number, limit: number) {
    this.items = items;
    this.total = total;
    this.page = page;
    this.limit = limit;
    this.totalPages = Math.ceil(total / limit);
    this.hasNext = page < this.totalPages;
    this.hasPrevious = page > 1;
  }
}

// HTTP Status Code Documentation
export const HTTP_STATUS_CODES = {
  200: 'OK - Request successful',
  201: 'Created - Resource created successfully',
  202: 'Accepted - Request accepted for processing',
  204: 'No Content - Request successful, no content to return',
  400: 'Bad Request - Invalid request data or parameters',
  401: 'Unauthorized - Authentication required',
  403: 'Forbidden - Access denied or insufficient permissions',
  404: 'Not Found - Resource not found',
  409: 'Conflict - Resource conflict or duplicate',
  422: 'Unprocessable Entity - Validation failed',
  429: 'Too Many Requests - Rate limit exceeded',
  500: 'Internal Server Error - Server error occurred',
  502: 'Bad Gateway - External service error',
  503: 'Service Unavailable - Service temporarily unavailable',
  504: 'Gateway Timeout - Request timeout',
} as const;
