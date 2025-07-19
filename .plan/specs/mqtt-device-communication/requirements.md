# Requirements Document

## Introduction

The MQTT Device Communication feature enables real-time communication between the SimonAir backend and IoT aquarium monitoring devices using MQTT protocol. This feature handles device calibration instructions, threshold configuration, and sensor data reception following the SIMONAIR MQTT documentation standards. The system processes HTTP API requests for calibrations and thresholds, then publishes the appropriate MQTT messages to configure devices in real-time.

## Requirements

### Requirement 1: Device Calibration Management via MQTT

**User Story:** As an aquarium owner, I want to send calibration data to my device via MQTT, so that my sensors provide accurate readings for water quality monitoring.

#### Acceptance Criteria

1. WHEN a user submits calibration data via HTTP POST to `/devices/{deviceId}/calibrations` THEN the system SHALL validate the device ID format as SMNR-XXXX
2. WHEN calibration data is received THEN the system SHALL validate the sensor type is one of: ph, tds, do
3. WHEN pH calibration data is provided THEN the system SHALL validate it contains `m` (slope) and `c` (intercept) numeric values
4. WHEN TDS calibration data is provided THEN the system SHALL validate it contains `v` (voltage), `std` (standard), and `t` (temperature) numeric values
5. WHEN DO calibration data is provided THEN the system SHALL validate it contains `ref` (reference), `v` (voltage), and `t` (temperature) numeric values
6. WHEN calibration data is valid THEN the system SHALL publish to MQTT topic `simonair/{deviceId}/calibration` with QoS 1
7. WHEN calibration is published to MQTT THEN the system SHALL format the payload according to SIMONAIR documentation standards
8. IF calibration data validation fails THEN the system SHALL return HTTP 400 with specific validation errors

### Requirement 2: Device Threshold Configuration via MQTT

**User Story:** As an aquarium owner, I want to configure water quality thresholds on my device, so that my device can automatically evaluate sensor readings and provide status indicators.

#### Acceptance Criteria

1. WHEN a user submits threshold data via HTTP POST to `/devices/{deviceId}/thresholds` THEN the system SHALL validate the device ID exists and is owned by the user
2. WHEN threshold data is received THEN the system SHALL validate numeric ranges for ph_min, ph_max, tds_min, tds_max, do_min, do_max, temp_min, temp_max
3. WHEN threshold values are provided THEN the system SHALL only include non-empty fields in the MQTT payload
4. WHEN threshold data is valid THEN the system SHALL publish to MQTT topic `simonair/{deviceId}/offset` with QoS 1
5. WHEN thresholds are published to MQTT THEN the system SHALL format payload as `{"threshold": {"ph_good": value, "ph_bad": value, ...}}`
6. WHEN min/max pairs are provided THEN the system SHALL map them to good/bad threshold format (min=good, max=bad)
7. IF threshold data validation fails THEN the system SHALL return HTTP 400 with validation errors
8. IF device is not found or not owned by user THEN the system SHALL return HTTP 403 forbidden error

### Requirement 3: MQTT Connection and Publishing

**User Story:** As a system administrator, I want reliable MQTT communication with devices, so that calibration and threshold updates are delivered successfully to monitoring devices.

#### Acceptance Criteria

1. WHEN the system starts THEN it SHALL establish connection to MQTT broker using configured credentials
2. WHEN publishing calibration or threshold data THEN the system SHALL use QoS 1 for reliable delivery
3. WHEN MQTT connection is lost THEN the system SHALL attempt automatic reconnection
4. WHEN MQTT publish fails THEN the system SHALL retry the operation up to 3 times
5. WHEN MQTT operations succeed THEN the system SHALL log successful publications for audit purposes
6. IF MQTT broker is unavailable THEN the system SHALL return HTTP 503 service unavailable error
7. WHEN device topics are published to THEN the system SHALL use the format `simonair/{deviceId}/{function}`
8. WHEN MQTT client connects THEN it SHALL use client ID format `backend-simonair-{timestamp}`

### Requirement 4: Device Data Reception via MQTT

**User Story:** As an aquarium monitoring system, I want to receive sensor data from devices via MQTT, so that I can store and display real-time water quality information.

#### Acceptance Criteria

1. WHEN the system starts THEN it SHALL subscribe to `simonair/+/data` topic to receive sensor data from all devices
2. WHEN sensor data is received via MQTT THEN the system SHALL validate the JSON payload structure
3. WHEN sensor data contains timestamp THEN the system SHALL validate it's in ISO 8601 UTC format
4. WHEN sensor data is valid THEN the system SHALL store it in the sensor_data table linked to the device
5. WHEN sensor data is stored THEN the system SHALL update the device's last_seen timestamp
6. IF received sensor data is invalid THEN the system SHALL log the error and discard the data
7. WHEN sensor data includes status fields THEN the system SHALL store the GOOD/BAD status for each parameter
8. WHEN multiple sensor readings are received THEN the system SHALL process them in order of timestamp

### Requirement 5: Calibration Data Persistence and History

**User Story:** As an aquarium owner, I want to track calibration history for my devices, so that I can monitor calibration changes and troubleshoot sensor accuracy issues.

#### Acceptance Criteria

1. WHEN calibration data is sent to a device THEN the system SHALL store the calibration record in the database
2. WHEN storing calibration data THEN the system SHALL include timestamp, device_id, sensor_type, and calibration_data
3. WHEN retrieving calibration history THEN the system SHALL return records ordered by timestamp descending
4. WHEN calibration data is requested THEN the system SHALL only return calibrations for devices owned by the requesting user
5. IF calibration storage fails THEN the system SHALL still attempt to send the MQTT message but log the storage error

### Requirement 6: Threshold Configuration Persistence

**User Story:** As an aquarium owner, I want my threshold configurations to be saved, so that I can review and modify my water quality alert settings.

#### Acceptance Criteria

1. WHEN threshold data is sent to a device THEN the system SHALL store or update the threshold record in the database
2. WHEN storing threshold data THEN the system SHALL maintain one threshold record per device
3. WHEN threshold data is updated THEN the system SHALL overwrite previous threshold values
4. WHEN retrieving device thresholds THEN the system SHALL return the current threshold configuration
5. IF threshold storage fails THEN the system SHALL still attempt to send the MQTT message but log the storage error

### Requirement 7: Error Handling and Logging

**User Story:** As a system administrator, I want comprehensive error handling and logging for MQTT operations, so that I can troubleshoot communication issues and ensure system reliability.

#### Acceptance Criteria

1. WHEN MQTT operations occur THEN the system SHALL log all publish and subscribe activities
2. WHEN errors occur during MQTT operations THEN the system SHALL log detailed error information
3. WHEN HTTP requests fail validation THEN the system SHALL return structured error responses with specific field details
4. WHEN device authorization fails THEN the system SHALL log the unauthorized access attempt
5. WHEN MQTT broker connectivity issues occur THEN the system SHALL alert administrators via logging
6. IF system errors occur THEN the system SHALL return HTTP 500 with generic error message while logging detailed information

### Requirement 8: API Response Formatting

**User Story:** As a frontend developer, I want consistent API response formats for calibration and threshold operations, so that I can reliably handle responses in the user interface.

#### Acceptance Criteria

1. WHEN calibration or threshold operations succeed THEN the system SHALL return HTTP 200 with success status
2. WHEN API responses are returned THEN they SHALL follow the standard response format with status, data, and metadata
3. WHEN operations include MQTT publishing THEN the response SHALL indicate successful publication
4. WHEN validation errors occur THEN the response SHALL include specific field-level error details
5. WHEN system errors occur THEN the response SHALL include appropriate error codes and messages