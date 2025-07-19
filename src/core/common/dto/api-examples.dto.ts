import { ApiProperty } from '@nestjs/swagger';

/**
 * API Usage Examples
 * 
 * This file contains comprehensive examples for calibration and threshold operations
 * demonstrating proper request/response patterns for the SIMONAIR API.
 */

// Calibration Examples
export class CalibrationExamples {
  static readonly phCalibrationRequest = {
    summary: 'pH Sensor Calibration Example',
    description: 'Calibrate pH sensor with standard buffer solutions',
    value: {
      sensor_type: 'ph',
      calibration_points: [
        {
          standard_value: '4.00',
          measured_value: '4.02',
          temperature: '25.0'
        },
        {
          standard_value: '7.00',
          measured_value: '7.01',
          temperature: '25.0'
        },
        {
          standard_value: '10.00',
          measured_value: '9.98',
          temperature: '25.0'
        }
      ],
      calibration_date: '2024-01-15T10:30:00Z',
      notes: 'Monthly calibration using fresh buffer solutions'
    }
  };

  static readonly tdsCalibrationRequest = {
    summary: 'TDS Sensor Calibration Example',
    description: 'Calibrate TDS sensor with standard conductivity solution',
    value: {
      sensor_type: 'tds',
      calibration_points: [
        {
          standard_value: '0',
          measured_value: '2',
          temperature: '25.0'
        },
        {
          standard_value: '1413',
          measured_value: '1410',
          temperature: '25.0'
        }
      ],
      calibration_date: '2024-01-15T10:30:00Z',
      notes: 'Using 1413 µS/cm standard solution'
    }
  };

  static readonly doCalibrationRequest = {
    summary: 'DO Sensor Calibration Example',
    description: 'Calibrate dissolved oxygen sensor in air and zero solution',
    value: {
      sensor_type: 'do',
      calibration_points: [
        {
          standard_value: '0.00',
          measured_value: '0.02',
          temperature: '25.0'
        },
        {
          standard_value: '8.26',
          measured_value: '8.24',
          temperature: '25.0'
        }
      ],
      calibration_date: '2024-01-15T10:30:00Z',
      notes: 'Zero calibration in sodium sulfite solution, span calibration in air-saturated water'
    }
  };

  static readonly calibrationSuccessResponse = {
    summary: 'Successful Calibration Response',
    description: 'Response when calibration is successfully sent to device',
    value: {
      status: 'success',
      data: {
        id: '123e4567-e89b-12d3-a456-426614174000',
        device_id: 'SMNR-1234',
        sensor_type: 'ph',
        calibration_points: [
          {
            standard_value: '4.00',
            measured_value: '4.02',
            temperature: '25.0'
          },
          {
            standard_value: '7.00',
            measured_value: '7.01',
            temperature: '25.0'
          },
          {
            standard_value: '10.00',
            measured_value: '9.98',
            temperature: '25.0'
          }
        ],
        calibration_date: '2024-01-15T10:30:00Z',
        applied_at: '2024-01-15T10:30:00Z',
        created_by: 'user-uuid-123',
        mqtt_published: true,
        ack_status: 'pending'
      },
      metadata: {
        timestamp: '2024-01-15T10:30:00.123Z',
        path: '/devices/SMNR-1234/calibrations',
        executionTime: 145,
        requestId: 'req-123e4567-e89b-12d3-a456-426614174000',
        version: '4.0',
        method: 'POST'
      }
    }
  };
}

// Threshold Configuration Examples
export class ThresholdExamples {
  static readonly basicThresholdRequest = {
    summary: 'Basic Threshold Configuration',
    description: 'Set water quality thresholds for a shrimp farming device',
    value: {
      ph_min: '7.5',
      ph_max: '8.5',
      tds_min: '300',
      tds_max: '500',
      do_min: '5.0',
      do_max: '12.0',
      temp_min: '26.0',
      temp_max: '30.0'
    }
  };

  static readonly fishFarmingThresholdRequest = {
    summary: 'Fish Farming Threshold Configuration',
    description: 'Set thresholds optimized for freshwater fish farming',
    value: {
      ph_min: '6.5',
      ph_max: '8.0',
      tds_min: '200',
      tds_max: '400',
      do_min: '6.0',
      do_max: '15.0',
      temp_min: '22.0',
      temp_max: '28.0'
    }
  };

  static readonly partialThresholdRequest = {
    summary: 'Partial Threshold Update',
    description: 'Update only specific thresholds (pH and temperature)',
    value: {
      ph_min: '7.0',
      ph_max: '8.2',
      temp_min: '24.0',
      temp_max: '29.0'
    }
  };

  static readonly thresholdSuccessResponse = {
    summary: 'Successful Threshold Configuration Response',
    description: 'Response when threshold configuration is successfully sent to device',
    value: {
      status: 'success',
      data: {
        id: '456e7890-e89b-12d3-a456-426614174000',
        device_id: 'SMNR-1234',
        threshold_data: {
          ph_min: '7.5',
          ph_max: '8.5',
          tds_min: '300',
          tds_max: '500',
          do_min: '5.0',
          do_max: '12.0',
          temp_min: '26.0',
          temp_max: '30.0'
        },
        updated_at: '2024-01-15T10:30:00Z',
        updated_by: 'user-uuid-123',
        ack_status: 'pending',
        ack_received_at: null,
        mqtt_published: true
      },
      metadata: {
        timestamp: '2024-01-15T10:30:00.123Z',
        path: '/devices/SMNR-1234/thresholds',
        executionTime: 98,
        requestId: 'req-456e7890-e89b-12d3-a456-426614174000',
        version: '4.0',
        method: 'POST'
      }
    }
  };

  static readonly thresholdStatusResponse = {
    summary: 'Current Threshold Status Response',
    description: 'Response showing current active thresholds on device',
    value: {
      status: 'success',
      data: {
        device_id: 'SMNR-1234',
        thresholds: {
          ph_min: '7.5',
          ph_max: '8.5',
          tds_min: '300',
          tds_max: '500',
          do_min: '5.0',
          do_max: '12.0',
          temp_min: '26.0',
          temp_max: '30.0'
        },
        updated_at: '2024-01-15T10:30:00Z',
        ack_status: 'success',
        is_active: true
      },
      metadata: {
        timestamp: '2024-01-15T10:31:00.123Z',
        path: '/devices/SMNR-1234/thresholds',
        executionTime: 23,
        requestId: 'req-789e1234-e89b-12d3-a456-426614174000',
        version: '4.0',
        method: 'GET'
      }
    }
  };
}

// Error Response Examples
export class ErrorResponseExamples {
  static readonly validationErrorResponse = {
    summary: 'Validation Error Response',
    description: 'Response when request data fails validation',
    value: {
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
          },
          {
            field: 'tds_max',
            message: 'TDS value must be between 0 and 2000 ppm',
            value: '2500',
            constraint: 'isValidThresholdRange'
          }
        ],
        deviceId: 'SMNR-1234',
        type: 'VALIDATION_ERROR'
      },
      metadata: {
        timestamp: '2024-01-15T10:30:00.123Z',
        path: '/devices/SMNR-1234/thresholds',
        executionTime: 12,
        requestId: 'req-error-123-456'
      }
    }
  };

  static readonly deviceNotFoundResponse = {
    summary: 'Device Not Found Response',
    description: 'Response when requested device does not exist or access is denied',
    value: {
      status: 'error',
      error: {
        code: 403,
        message: 'Device not found or access denied',
        details: ['Device SMNR-9999 not found or you do not have access to this device'],
        deviceId: 'SMNR-9999',
        type: 'DEVICE_ACCESS_ERROR'
      },
      metadata: {
        timestamp: '2024-01-15T10:30:00.123Z',
        path: '/devices/SMNR-9999/calibrations',
        executionTime: 8,
        requestId: 'req-error-789-012'
      }
    }
  };

  static readonly mqttUnavailableResponse = {
    summary: 'MQTT Broker Unavailable Response',
    description: 'Response when MQTT broker is not available',
    value: {
      status: 'error',
      error: {
        code: 503,
        message: 'MQTT broker unavailable',
        details: ['Unable to publish message to MQTT broker. Please try again later.'],
        deviceId: 'SMNR-1234',
        type: 'MQTT_SERVICE_ERROR',
        context: {
          brokerUrl: 'mqtt://localhost:1883',
          lastConnectionAttempt: '2024-01-15T10:29:45Z',
          reconnectAttempts: 3
        }
      },
      metadata: {
        timestamp: '2024-01-15T10:30:00.123Z',
        path: '/devices/SMNR-1234/calibrations',
        executionTime: 5000,
        requestId: 'req-error-345-678'
      }
    }
  };
}

// Authentication Examples
export class AuthenticationExamples {
  static readonly loginRequest = {
    summary: 'User Login Request',
    description: 'Authenticate user with email and password',
    value: {
      email: 'user@example.com',
      password: 'StrongPassword123!'
    }
  };

  static readonly loginSuccessResponse = {
    summary: 'Successful Login Response',
    description: 'Response after successful authentication',
    value: {
      status: 'success',
      data: {
        accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6InVzZXJAZXhhbXBsZS5jb20iLCJzdWIiOiI1NTBlODQwMC1lMjliLTQxZDQtYTcxNi00NDY2NTU0NDAwMDAiLCJyb2xlIjoidXNlciIsImlhdCI6MTcwNTMxNDYwMCwiZXhwIjoxNzA1MzE1NTAwfQ.example-signature',
        user: {
          id: '550e8400-e29b-41d4-a716-446655440000',
          email: 'user@example.com',
          fullName: 'John Doe',
          role: 'user',
          emailVerified: true,
          isActive: true,
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-15T10:30:00.000Z',
          lastLogin: '2024-01-15T10:30:00.000Z'
        }
      },
      metadata: {
        timestamp: '2024-01-15T10:30:00.123Z',
        path: '/auth/login',
        executionTime: 234,
        requestId: 'req-auth-123-456',
        version: '4.0',
        method: 'POST'
      }
    }
  };
}

// Pagination Examples
export class PaginationExamples {
  static readonly paginatedResponse = {
    summary: 'Paginated Response Example',
    description: 'Example of paginated data response',
    value: {
      status: 'success',
      data: {
        items: [
          {
            id: 'cal-001',
            device_id: 'SMNR-1234',
            sensor_type: 'ph',
            calibration_date: '2024-01-15T10:30:00Z'
          },
          {
            id: 'cal-002',
            device_id: 'SMNR-1234',
            sensor_type: 'tds',
            calibration_date: '2024-01-14T15:20:00Z'
          }
        ],
        total: 25,
        page: 1,
        limit: 10,
        totalPages: 3,
        hasNext: true,
        hasPrevious: false
      },
      metadata: {
        timestamp: '2024-01-15T10:30:00.123Z',
        path: '/devices/SMNR-1234/calibrations?page=1&limit=10',
        executionTime: 87,
        requestId: 'req-paginated-123',
        version: '4.0',
        method: 'GET'
      }
    }
  };
}
