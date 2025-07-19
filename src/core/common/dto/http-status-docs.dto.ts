import { ApiProperty } from '@nestjs/swagger';

/**
 * HTTP Status Code Documentation
 * 
 * Comprehensive documentation of all HTTP status codes used in the SIMONAIR API
 * with specific meanings and use cases for aquaculture monitoring operations.
 */

export class HttpStatusDocumentation {
  
  /**
   * Success Status Codes (2xx)
   */
  static readonly SUCCESS_CODES = {
    200: {
      code: 200,
      name: 'OK',
      description: 'Request successful',
      useCases: [
        'Calibration data sent to device successfully',
        'Threshold configuration applied',
        'Sensor data retrieved',
        'User profile fetched',
        'Device health check completed',
        'Authentication token refreshed'
      ],
      examples: [
        'GET /devices/SMNR-1234/calibrations - Retrieve calibration history',
        'POST /devices/SMNR-1234/thresholds - Send threshold configuration',
        'GET /auth/profile - Get user profile information'
      ]
    },
    
    201: {
      code: 201,
      name: 'Created',
      description: 'Resource created successfully',
      useCases: [
        'New device registered',
        'User account created',
        'New calibration record stored',
        'Fish growth measurement recorded',
        'Feed data entry created'
      ],
      examples: [
        'POST /devices - Register new monitoring device',
        'POST /auth/register - Create new user account',
        'POST /fish/growth/SMNR-1234 - Record fish measurement'
      ]
    },
    
    202: {
      code: 202,
      name: 'Accepted',
      description: 'Request accepted for processing',
      useCases: [
        'MQTT message queued for delivery',
        'Bulk data import started',
        'Asynchronous calibration process initiated'
      ],
      examples: [
        'POST /devices/SMNR-1234/calibrations - Calibration queued when MQTT is temporarily unavailable'
      ]
    },
    
    204: {
      code: 204,
      name: 'No Content',
      description: 'Request successful, no content to return',
      useCases: [
        'Resource deleted successfully',
        'Configuration updated with no response body',
        'Logout completed'
      ],
      examples: [
        'DELETE /devices/SMNR-1234 - Device deleted',
        'POST /auth/logout - User logged out'
      ]
    }
  };

  /**
   * Client Error Status Codes (4xx)
   */
  static readonly CLIENT_ERROR_CODES = {
    400: {
      code: 400,
      name: 'Bad Request',
      description: 'Invalid request data or parameters',
      useCases: [
        'Invalid sensor calibration data',
        'Threshold values out of range',
        'Malformed device ID format',
        'Invalid date format in queries',
        'Missing required fields'
      ],
      examples: [
        'pH minimum greater than maximum',
        'TDS value exceeds 2000 ppm limit',
        'Device ID not matching SMNR-XXXX pattern',
        'Invalid ISO 8601 timestamp'
      ],
      errorResponse: {
        status: 'error',
        error: {
          code: 400,
          message: 'Validation failed',
          details: [
            {
              field: 'ph_min',
              message: 'pH minimum must be less than pH maximum',
              value: '8.5',
              constraint: 'isLessThan'
            }
          ]
        }
      }
    },
    
    401: {
      code: 401,
      name: 'Unauthorized',
      description: 'Authentication required',
      useCases: [
        'Missing or invalid JWT token',
        'Token expired',
        'Invalid login credentials',
        'Refresh token expired'
      ],
      examples: [
        'Accessing protected endpoint without Authorization header',
        'Using expired access token',
        'Incorrect email/password combination'
      ],
      errorResponse: {
        status: 'error',
        error: {
          code: 401,
          message: 'Unauthorized',
          details: ['Valid JWT token required']
        }
      }
    },
    
    403: {
      code: 403,
      name: 'Forbidden',
      description: 'Access denied or insufficient permissions',
      useCases: [
        'Device not owned by user',
        'Insufficient role permissions',
        'Account deactivated',
        'Resource access denied'
      ],
      examples: [
        'Regular user trying to access admin endpoints',
        'Accessing device owned by another user',
        'Deactivated account attempting operations'
      ],
      errorResponse: {
        status: 'error',
        error: {
          code: 403,
          message: 'Device not found or access denied',
          details: ['Device SMNR-1234 not found or you do not have access'],
          deviceId: 'SMNR-1234'
        }
      }
    },
    
    404: {
      code: 404,
      name: 'Not Found',
      description: 'Resource not found',
      useCases: [
        'Device does not exist',
        'User not found',
        'Calibration record not found',
        'Invalid endpoint URL'
      ],
      examples: [
        'GET /devices/SMNR-9999 - Non-existent device',
        'GET /users/invalid-uuid - User not found'
      ],
      errorResponse: {
        status: 'error',
        error: {
          code: 404,
          message: 'Resource not found',
          details: ['The requested resource could not be found']
        }
      }
    },
    
    409: {
      code: 409,
      name: 'Conflict',
      description: 'Resource conflict or duplicate',
      useCases: [
        'Email already exists during registration',
        'Device ID already registered',
        'Duplicate calibration for same timestamp'
      ],
      examples: [
        'POST /auth/register with existing email',
        'POST /devices with duplicate device_id'
      ],
      errorResponse: {
        status: 'error',
        error: {
          code: 409,
          message: 'Email already exists',
          details: ['An account with this email address already exists']
        }
      }
    },
    
    422: {
      code: 422,
      name: 'Unprocessable Entity',
      description: 'Validation failed',
      useCases: [
        'Complex validation rule failures',
        'Business logic violations',
        'Cross-field validation errors'
      ],
      examples: [
        'Calibration date in the future',
        'Fish weight decreased since last measurement'
      ],
      errorResponse: {
        status: 'error',
        error: {
          code: 422,
          message: 'Validation failed',
          details: [
            {
              field: 'calibration_date',
              message: 'Calibration date cannot be in the future',
              value: '2025-01-01T00:00:00Z'
            }
          ]
        }
      }
    },
    
    429: {
      code: 429,
      name: 'Too Many Requests',
      description: 'Rate limit exceeded',
      useCases: [
        'Too many login attempts',
        'API rate limit exceeded',
        'Too many password reset requests'
      ],
      examples: [
        'More than 10 requests per minute',
        'Multiple failed login attempts from same IP'
      ],
      errorResponse: {
        status: 'error',
        error: {
          code: 429,
          message: 'Too many requests',
          details: ['Rate limit exceeded. Please try again later.']
        }
      }
    }
  };

  /**
   * Server Error Status Codes (5xx)
   */
  static readonly SERVER_ERROR_CODES = {
    500: {
      code: 500,
      name: 'Internal Server Error',
      description: 'Server error occurred',
      useCases: [
        'Database connection failure',
        'Unexpected application error',
        'Critical system failure'
      ],
      examples: [
        'Database timeout during query',
        'Unhandled exception in business logic'
      ],
      errorResponse: {
        status: 'error',
        error: {
          code: 500,
          message: 'Internal server error',
          details: ['An unexpected error occurred. Please try again later.']
        }
      }
    },
    
    502: {
      code: 502,
      name: 'Bad Gateway',
      description: 'External service error',
      useCases: [
        'Email service unavailable',
        'Third-party API failure',
        'Upstream service error'
      ],
      examples: [
        'Email service down during password reset',
        'External weather API unavailable'
      ]
    },
    
    503: {
      code: 503,
      name: 'Service Unavailable',
      description: 'Service temporarily unavailable',
      useCases: [
        'MQTT broker unavailable',
        'Database maintenance',
        'System overloaded'
      ],
      examples: [
        'MQTT broker connection lost',
        'Database temporarily unavailable'
      ],
      errorResponse: {
        status: 'error',
        error: {
          code: 503,
          message: 'MQTT broker unavailable',
          details: ['Unable to publish message to MQTT broker. Please try again later.'],
          context: {
            brokerUrl: 'mqtt://localhost:1883',
            lastConnectionAttempt: '2024-01-15T10:29:45Z',
            reconnectAttempts: 3
          }
        }
      }
    },
    
    504: {
      code: 504,
      name: 'Gateway Timeout',
      description: 'Request timeout',
      useCases: [
        'MQTT operation timeout',
        'Database query timeout',
        'External service timeout'
      ],
      examples: [
        'Device not responding to calibration command',
        'Long-running data export timeout'
      ]
    }
  };

  /**
   * Status Code Usage Guidelines
   */
  static readonly USAGE_GUIDELINES = {
    calibrationOperations: {
      POST: {
        success: [200, 201],
        clientError: [400, 403, 422],
        serverError: [503, 504]
      },
      GET: {
        success: [200],
        clientError: [403, 404],
        serverError: [500]
      }
    },
    
    thresholdOperations: {
      POST: {
        success: [200],
        clientError: [400, 403, 422],
        serverError: [503, 504]
      },
      GET: {
        success: [200],
        clientError: [403, 404],
        serverError: [500]
      }
    },
    
    authentication: {
      POST: {
        success: [200, 201],
        clientError: [401, 409, 422, 429],
        serverError: [500, 502]
      }
    },
    
    deviceManagement: {
      POST: {
        success: [201],
        clientError: [400, 403, 409, 422],
        serverError: [500]
      },
      GET: {
        success: [200],
        clientError: [403, 404],
        serverError: [500]
      },
      PUT: {
        success: [200],
        clientError: [400, 403, 404, 422],
        serverError: [500]
      },
      DELETE: {
        success: [204],
        clientError: [403, 404],
        serverError: [500]
      }
    }
  };
}

/**
 * Response Timing Metadata Standards
 */
export class ResponseTimingStandards {
  static readonly PERFORMANCE_BENCHMARKS = {
    authentication: {
      login: { target: 200, warning: 500, critical: 1000 },
      register: { target: 300, warning: 750, critical: 1500 },
      refresh: { target: 100, warning: 250, critical: 500 }
    },
    
    deviceOperations: {
      calibration: { target: 150, warning: 400, critical: 1000 },
      thresholds: { target: 100, warning: 300, critical: 800 },
      sensorData: { target: 50, warning: 150, critical: 500 }
    },
    
    dataRetrieval: {
      deviceList: { target: 100, warning: 300, critical: 800 },
      sensorHistory: { target: 200, warning: 500, critical: 1200 },
      analytics: { target: 500, warning: 1200, critical: 3000 }
    },
    
    mqttOperations: {
      publish: { target: 100, warning: 300, critical: 1000 },
      healthCheck: { target: 50, warning: 150, critical: 500 }
    }
  };

  static readonly TIMING_HEADERS = {
    'X-Response-Time': 'Response generation time in milliseconds',
    'X-Database-Time': 'Database query execution time',
    'X-MQTT-Time': 'MQTT operation time',
    'X-Cache-Status': 'Cache hit/miss status',
    'X-Request-ID': 'Unique request identifier for tracing'
  };
}
