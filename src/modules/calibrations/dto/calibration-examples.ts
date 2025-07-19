/**
 * Comprehensive API examples for calibration operations
 * Used in Swagger documentation and API guides
 */

export const CALIBRATION_EXAMPLES = {
  // pH Calibration Examples
  pH_CALIBRATION_REQUEST: {
    summary: 'pH Sensor Calibration',
    description: 'Calibrate pH sensor with slope and intercept values',
    value: {
      sensor_type: 'ph',
      calibration_data: {
        m: -7.153,
        c: 22.456,
      },
    },
  },

  // TDS Calibration Examples
  TDS_CALIBRATION_REQUEST: {
    summary: 'TDS Sensor Calibration',
    description:
      'Calibrate TDS sensor with voltage, standard, and temperature values',
    value: {
      sensor_type: 'tds',
      calibration_data: {
        v: 1.42,
        std: 442,
        t: 25.0,
      },
    },
  },

  // DO Calibration Examples
  DO_CALIBRATION_REQUEST: {
    summary: 'DO Sensor Calibration',
    description:
      'Calibrate dissolved oxygen sensor with reference, voltage, and temperature values',
    value: {
      sensor_type: 'do',
      calibration_data: {
        ref: 8.0,
        v: 1.171,
        t: 25.0,
      },
    },
  },

  // Success Response Examples
  CALIBRATION_SUCCESS_RESPONSE: {
    summary: 'Successful Calibration Response',
    description: 'Response when calibration is sent successfully',
    value: {
      status: 'success',
      data: {
        id: 'cal-123e4567-e89b-12d3-a456-426614174000',
        device_id: 'SMNR-1234',
        sensor_type: 'ph',
        calibration_data: {
          m: -7.153,
          c: 22.456,
        },
        applied_at: '2024-01-15T10:30:00.123Z',
        applied_by: 'user-456e7890-e89b-12d3-a456-426614174000',
        mqtt_published_at: '2024-01-15T10:30:00.456Z',
        mqtt_ack_received_at: null,
        mqtt_ack_status: 'pending',
        mqtt_retry_count: 0,
        mqtt_published: true,
      },
      metadata: {
        timestamp: '2024-01-15T10:30:00.789Z',
        path: '/api/devices/SMNR-1234/calibrations',
        executionTime: 45,
        requestId: 'req-123e4567-e89b-12d3-a456-426614174000',
        version: '1.0.0',
      },
    },
  },

  // Calibration History Response
  CALIBRATION_HISTORY_RESPONSE: {
    summary: 'Calibration History Response',
    description: 'Paginated list of calibration records',
    value: {
      status: 'success',
      data: {
        items: [
          {
            id: 'cal-123e4567-e89b-12d3-a456-426614174000',
            device_id: 'SMNR-1234',
            sensor_type: 'ph',
            calibration_data: {
              m: -7.153,
              c: 22.456,
            },
            applied_at: '2024-01-15T10:30:00.123Z',
            applied_by: 'user-456e7890-e89b-12d3-a456-426614174000',
            mqtt_ack_status: 'success',
            mqtt_ack_received_at: '2024-01-15T10:30:05.123Z',
          },
          {
            id: 'cal-234e5678-e89b-12d3-a456-426614174001',
            device_id: 'SMNR-1234',
            sensor_type: 'tds',
            calibration_data: {
              v: 1.42,
              std: 442,
              t: 25.0,
            },
            applied_at: '2024-01-15T09:15:00.123Z',
            applied_by: 'user-456e7890-e89b-12d3-a456-426614174000',
            mqtt_ack_status: 'success',
            mqtt_ack_received_at: '2024-01-15T09:15:03.456Z',
          },
        ],
        total: 15,
        page: 1,
        limit: 10,
        totalPages: 2,
        hasNext: true,
        hasPrevious: false,
      },
      metadata: {
        timestamp: '2024-01-15T10:35:00.123Z',
        path: '/api/devices/SMNR-1234/calibrations',
        executionTime: 23,
        requestId: 'req-234e5678-e89b-12d3-a456-426614174001',
        version: '1.0.0',
      },
    },
  },

  // Error Response Examples
  VALIDATION_ERROR_RESPONSE: {
    summary: 'Validation Error Response',
    description: 'Response when calibration data validation fails',
    value: {
      status: 'error',
      error: {
        code: 400,
        message: 'Validation failed',
        type: 'VALIDATION_ERROR',
        details: [
          {
            field: 'calibration_data.m',
            message: 'pH slope (m) value is required',
            value: undefined,
            constraint: 'isNotEmpty',
          },
          {
            field: 'calibration_data.c',
            message: 'pH intercept (c) value must be a number',
            value: 'invalid',
            constraint: 'isNumber',
          },
        ],
      },
      metadata: {
        timestamp: '2024-01-15T10:30:00.123Z',
        path: '/api/devices/SMNR-1234/calibrations',
        executionTime: 12,
        requestId: 'req-345e6789-e89b-12d3-a456-426614174002',
        version: '1.0.0',
      },
    },
  },

  MQTT_ERROR_RESPONSE: {
    summary: 'MQTT Service Error Response',
    description: 'Response when MQTT broker is unavailable',
    value: {
      status: 'error',
      error: {
        code: 503,
        message:
          'MQTT broker unavailable for device SMNR-1234: Connection timeout',
        type: 'MQTT_BROKER_UNAVAILABLE',
        deviceId: 'SMNR-1234',
        context: {
          mqttError: true,
          originalError: 'Connection timeout',
        },
      },
      metadata: {
        timestamp: '2024-01-15T10:30:00.123Z',
        path: '/api/devices/SMNR-1234/calibrations',
        executionTime: 5000,
        requestId: 'req-456e7890-e89b-12d3-a456-426614174003',
        version: '1.0.0',
      },
    },
  },
};

export const CALIBRATION_CURL_EXAMPLES = {
  pH_CALIBRATION: `curl -X POST "https://api.simonair.com/devices/SMNR-1234/calibrations" \\
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{
    "sensor_type": "ph",
    "calibration_data": {
      "m": -7.153,
      "c": 22.456
    }
  }'`,

  TDS_CALIBRATION: `curl -X POST "https://api.simonair.com/devices/SMNR-1234/calibrations" \\
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{
    "sensor_type": "tds",
    "calibration_data": {
      "v": 1.42,
      "std": 442,
      "t": 25.0
    }
  }'`,

  GET_HISTORY: `curl -X GET "https://api.simonair.com/devices/SMNR-1234/calibrations?page=1&limit=10&sensor_type=ph" \\
  -H "Authorization: Bearer YOUR_JWT_TOKEN"`,
};
