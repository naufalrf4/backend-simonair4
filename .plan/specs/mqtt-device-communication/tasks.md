# Implementation Plan

**Note:** These tasks are designed to be executed sequentially, with each task building upon the previous ones. Testing should be done at the end after all implementation is complete to avoid breaking changes during development.

- [x] 1. Create calibration DTOs and validation
  - Create CalibrationRequestDto with sensor type validation (ph, tds, do)
  - Create CalibrationDataDto with conditional validation based on sensor type
  - Create CalibrationResponseDto for API responses
  - Add validation decorators for pH (m, c), TDS (v, std, t), and DO (ref, v, t) parameters
  - _Requirements: 1.2, 1.3, 1.4, 1.5, 1.8_

- [x] 2. Create threshold DTOs and validation
  - Create ThresholdRequestDto with optional numeric string fields
  - Create ThresholdResponseDto for API responses
  - Create ThresholdConfigResponseDto for current threshold retrieval
  - Add validation for threshold value ranges and format
  - _Requirements: 2.2, 2.5, 2.7_

- [x] 3. Enhance MQTT service with calibration publishing
  - Add publishCalibrationWithValidation method to MqttService
  - Implement calibration data formatting according to SIMONAIR protocol
  - Add proper error handling and retry logic for calibration publishing
  - Add logging for calibration MQTT operations
  - _Requirements: 1.6, 1.7, 3.4, 3.5_

- [x] 4. Enhance MQTT service with threshold publishing
  - Add publishThresholdsWithValidation method to MqttService
  - Implement threshold data transformation from min/max to good/bad format
  - Add filtering logic to only include non-empty threshold fields
  - Add proper error handling and retry logic for threshold publishing
  - _Requirements: 2.3, 2.4, 2.5, 2.6, 3.4, 3.5_

- [x] 5. Create calibrations service with database persistence
  - Create CalibrationsService with sendCalibration method
  - Implement calibration data validation by sensor type
  - Add database persistence for calibration records with MQTT tracking fields
  - Implement getCalibrationHistory method with pagination
  - Add device ownership validation integration
  - _Requirements: 1.1, 1.2, 1.3, 5.1, 5.2, 5.3, 5.4, 5.5_

- [x] 6. Create thresholds service with database persistence
  - Create ThresholdsService with sendThresholds method
  - Implement threshold data validation and transformation
  - Add database persistence for threshold records (upsert operation)
  - Implement getCurrentThresholds method
  - Add device ownership validation integration
  - _Requirements: 2.1, 2.2, 6.1, 6.2, 6.3, 6.4, 6.5_

- [x] 7. Create calibrations controller with authentication
  - Create CalibrationsController with POST /devices/:deviceId/calibrations endpoint
  - Add JWT authentication and device ownership validation
  - Implement proper error handling and response formatting
  - Add GET /devices/:deviceId/calibrations endpoint for history
  - Add Swagger/OpenAPI documentation for calibration endpoints
  - _Requirements: 1.1, 1.8, 3.1, 3.2, 5.4, 7.4, 8.1, 8.2, 8.4_

- [x] 8. Create thresholds controller with authentication
  - Create ThresholdsController with POST /devices/:deviceId/thresholds endpoint
  - Add JWT authentication and device ownership validation
  - Implement proper error handling and response formatting
  - Add GET /devices/:deviceId/thresholds endpoint for current config
  - Add Swagger/OpenAPI documentation for threshold endpoints
  - _Requirements: 2.1, 2.7, 2.8, 3.1, 3.2, 6.4, 7.4, 8.1, 8.2, 8.4_

- [x] 9. Enhance existing calibrations module integration
  - Update existing CalibrationsModule to include new service and controller
  - Ensure proper dependency injection for MqttService and DevicesService
  - Add proper module exports for cross-module usage
  - Update existing calibration entity if needed for MQTT tracking
  - _Requirements: 5.1, 5.5, 7.1, 7.2_

- [x] 10. Enhance existing thresholds module integration
  - Update existing ThresholdsModule to include new service and controller
  - Ensure proper dependency injection for MqttService and DevicesService
  - Add proper module exports for cross-module usage
  - Verify existing threshold entity supports required MQTT tracking fields
  - _Requirements: 6.1, 6.5, 7.1, 7.2_

- [x] 11. Add comprehensive error handling and logging
  - Implement structured error responses for all validation failures
  - Add comprehensive logging for MQTT operations and failures
  - Implement proper HTTP status codes for different error scenarios
  - Add error handling for MQTT broker connectivity issues
  - Create custom exception classes for MQTT-specific errors
  - _Requirements: 3.3, 3.6, 7.1, 7.2, 7.3, 7.4, 7.5, 7.6_

- [x] 12. Implement MQTT connection health monitoring
  - Add validateMqttConnection method to MqttService
  - Implement health check endpoint for MQTT broker status
  - Add automatic reconnection logic with exponential backoff
  - Implement MQTT operation timeout handling
  - Add monitoring for message delivery confirmation
  - _Requirements: 3.1, 3.3, 3.4, 3.6_

- [x] 13. Add sensor data reception enhancements
  - Enhance existing MQTT message handling for sensor data validation
  - Add proper timestamp validation for ISO 8601 format
  - Implement sensor data status field processing (GOOD/BAD)
  - Add device last_seen timestamp updates on data reception
  - Ensure proper error handling for invalid sensor data
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8_

- [x] 14. Fix testing configuration and directory imports
  - Update Jest configuration for proper module path resolution
  - Fix TypeScript path mapping in test configuration
  - Update import paths to use @ alias consistently across test files
  - Configure test environment for MQTT and database testing
  - Set up test database configuration and cleanup
  - _Requirements: Testing infrastructure setup_

- [x] 15. Create comprehensive test suite
  - Write unit tests for all DTOs and validation logic
  - Write unit tests for MQTT service enhancements
  - Write unit tests for calibrations and thresholds services
  - Write integration tests for controllers with authentication
  - Write end-to-end tests for complete HTTP → MQTT → Database workflows
  - Write tests for error handling scenarios and MQTT failures
  - Add performance tests for high-throughput scenarios
  - _Requirements: All requirements validation_

- [x] 16. Add API documentation and response formatting
  - Ensure all endpoints follow consistent response format standards
  - Add comprehensive Swagger documentation with examples
  - Create API usage examples for calibration and threshold operations
  - Add proper HTTP status code documentation
  - Implement response timing metadata
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_