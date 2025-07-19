/**
 * Comprehensive API examples for threshold operations
 * Used in Swagger documentation and API guides
 */

export const THRESHOLD_EXAMPLES = {
  // Threshold Configuration Examples
  COMPLETE_THRESHOLD_REQUEST: {
    summary: 'Complete Threshold Configuration',
    description: 'Set all water quality thresholds for a device',
    value: {
      ph_min: '6.5',
      ph_max: '8.5',
      tds_min: '200',
      tds_max: '800',
      do_min: '5.0',
      do_max: '12.0',
      temp_min: '20.0',
      temp_max: '30.0',
    },
  },

  PARTIAL_THRESHOLD_REQUEST: {
    summary: 'Partial Threshold Configuration',
    description: 'Set only pH and temperature thresholds',
    value: {
      ph_min: '6.8',
      ph_max: '7.8',
      temp_min: '22.0',
      temp_max: '28.0',
    },
  },

  SINGLE_PARAMETER_REQUEST: {
    summary: 'Single Parameter Threshold',
    description: 'Set only TDS maximum threshold',
    value: {
      tds_max: '750',
    },
  },

  // Success Response Examples
  THRESHOLD_SUCCESS_RESPONSE: {
    summary: 'Successful Threshold Response',
    description: 'Response when thresholds are sent successfully',
    value: {
      status: 'success',
      data: {
        id: 'thr-123e4567-e89b-12d3-a456-426614174000',
        device_id: 'SMNR-1234',
        threshold_data: {
          ph_min: '6.5',
          ph_max: '8.5',
          tds_min: '200',
          tds_max: '800',
          do_min: '5.0',
          do_max: '12.0',
          temp_min: '20.0',
          temp_max: '30.0',
        },
        updated_at: '2024-01-15T10:30:00.123Z',
        updated_by: 'user-456e7890-e89b-12d3-a456-426614174000',
        ack_status: 'pending',
        ack_received_at: null,
        mqtt_published: true,
      },
      metadata: {
        timestamp: '2024-01-15T10:30:00.456Z',
        path: '/api/devices/SMNR-1234/thresholds',
        executionTime: 38,
        requestId: 'req-123e4567-e89b-12d3-a456-426614174000',
        version: '1.0.0',
      },
    },
  },

  // Current Threshold Configuration Response
  CURRENT_THRESHOLD_RESPONSE: {
    summary: 'Current Threshold Configuration',
    description: 'Response when retrieving current device thresholds',
    value: {
      status: 'success',
      data: {
        device_id: 'SMNR-1234',
        thresholds: {
          ph_min: '6.5',
          ph_max: '8.5',
          tds_min: '200',
          tds_max: '800',
          do_min: '5.0',
          do_max: '12.0',
          temp_min: '20.0',
          temp_max: '30.0',
        },
        updated_at: '2024-01-15T10:30:00.123Z',
        ack_status: 'success',
        is_active: true,
      },
      metadata: {
        timestamp: '2024-01-15T10:35:00.123Z',
        path: '/api/devices/SMNR-1234/thresholds',
        executionTime: 15,
        requestId: 'req-234e5678-e89b-12d3-a456-426614174001',
        version: '1.0.0',
      },
    },
  },

  // Empty Threshold Configuration Response
  EMPTY_THRESHOLD_RESPONSE: {
    summary: 'No Threshold Configuration',
    description: 'Response when device has no threshold configuration',
    value: {
      status: 'success',
      data: {
        device_id: 'SMNR-5678',
        thresholds: {},
        updated_at: '2024-01-15T10:35:00.123Z',
        ack_status: 'pending',
        is_active: false,
      },
      metadata: {
        timestamp: '2024-01-15T10:35:00.123Z',
        path: '/api/devices/SMNR-5678/thresholds',
        executionTime: 12,
        requestId: 'req-345e6789-e89b-12d3-a456-426614174002',
        version: '1.0.0',
      },
    },
  },

  // Error Response Examples
  VALIDATION_ERROR_RESPONSE: {
    summary: 'Threshold Validation Error',
    description: 'Response when threshold validation fails',
    value: {
      status: 'error',
      error: {
        code: 400,
        message: 'Validation failed',
        type: 'VALIDATION_ERROR',
        details: [
          {
            field: 'ph_min',
            message: 'pH minimum must be less than pH maximum',
            value: '8.0',
            constraint: 'isLessThan',
          },
          {
            field: 'tds_max',
            message: 'TDS value must be between 0 and 2000 ppm',
            value: '3000',
            constraint: 'isValidThresholdRange',
          },
        ],
      },
      metadata: {
        timestamp: '2024-01-15T10:30:00.123Z',
        path: '/api/devices/SMNR-1234/thresholds',
        executionTime: 8,
        requestId: 'req-456e7890-e89b-12d3-a456-426614174003',
        version: '1.0.0',
      },
    },
  },

  DEVICE_ACCESS_ERROR: {
    summary: 'Device Access Denied',
    description: 'Response when user cannot access the device',
    value: {
      status: 'error',
      error: {
        code: 403,
        message: 'You are not authorized to access device "SMNR-1234"',
        type: 'FORBIDDEN',
        deviceId: 'SMNR-1234',
      },
      metadata: {
        timestamp: '2024-01-15T10:30:00.123Z',
        path: '/api/devices/SMNR-1234/thresholds',
        executionTime: 25,
        requestId: 'req-567e8901-e89b-12d3-a456-426614174004',
        version: '1.0.0',
      },
    },
  },
};

export const THRESHOLD_CURL_EXAMPLES = {
  SET_ALL_THRESHOLDS: `curl -X POST "https://api.simonair.com/devices/SMNR-1234/thresholds" \\
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{
    "ph_min": "6.5",
    "ph_max": "8.5",
    "tds_min": "200",
    "tds_max": "800",
    "do_min": "5.0",
    "do_max": "12.0",
    "temp_min": "20.0",
    "temp_max": "30.0"
  }'`,

  SET_PARTIAL_THRESHOLDS: `curl -X POST "https://api.simonair.com/devices/SMNR-1234/thresholds" \\
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{
    "ph_min": "6.8",
    "ph_max": "7.8"
  }'`,

  GET_CURRENT_THRESHOLDS: `curl -X GET "https://api.simonair.com/devices/SMNR-1234/thresholds" \\
  -H "Authorization: Bearer YOUR_JWT_TOKEN"`,
};

// MQTT Payload Examples (for documentation)
export const MQTT_PAYLOAD_EXAMPLES = {
  THRESHOLD_MQTT_PAYLOAD: {
    summary: 'MQTT Threshold Payload',
    description:
      'Actual MQTT payload sent to device (transformed from min/max to good/bad format)',
    value: {
      threshold: {
        ph_good: 6.5,
        ph_bad: 8.5,
        tds_good: 200,
        tds_bad: 800,
        do_good: 5.0,
        do_bad: 12.0,
        temp_low: 20.0,
        temp_high: 30.0,
      },
    },
  },
};
