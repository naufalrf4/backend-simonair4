# Requirements Document

## Introduction

The Device Management feature enables users to register, manage, and monitor IoT aquarium devices within the SimonAir system. This feature serves as the foundation for aquarium monitoring by allowing users to create device profiles, track device status, and manage device-specific configurations for their aquarium monitoring setup.

## Requirements

### Requirement 1: Device Registration

**User Story:** As an aquarium owner, I want to register my IoT monitoring device, so that I can start monitoring my aquarium's conditions.

#### Acceptance Criteria

1. WHEN a user submits device registration data THEN the system SHALL validate the device ID format as SMNR-XXXX where XXXX is alphanumeric
2. WHEN a user registers a device THEN the system SHALL ensure the device ID is unique across all devices
3. WHEN device registration is successful THEN the system SHALL create a device record linked to the current user
4. WHEN device registration fails due to duplicate ID THEN the system SHALL return a 409 conflict error
5. IF device registration data is invalid THEN the system SHALL return validation errors with specific field details

### Requirement 2: Device Information Management

**User Story:** As a device owner, I want to update my device information, so that I can maintain accurate records of my aquarium setup.

#### Acceptance Criteria

1. WHEN a user updates device information THEN the system SHALL validate all provided fields
2. WHEN a user updates device status THEN the system SHALL allow toggling the is_active flag
3. WHEN device update is successful THEN the system SHALL return the updated device information
4. IF a user tries to update a device they don't own THEN the system SHALL return a 403 forbidden error
5. WHEN device name is updated THEN the system SHALL ensure it's not empty

### Requirement 3: Device Access Control

**User Story:** As a system administrator, I want to ensure users can only access their own devices, so that data privacy and security are maintained.

#### Acceptance Criteria

1. WHEN a user requests device information THEN the system SHALL only return devices owned by that user
2. WHEN a user attempts to access another user's device THEN the system SHALL return a 403 forbidden error
3. WHEN an admin user accesses devices THEN the system SHALL allow access to all devices based on role permissions
4. IF a device doesn't exist THEN the system SHALL return a 404 not found error
5. WHEN authentication fails THEN the system SHALL return a 401 unauthorized error

### Requirement 4: Device Status Tracking

**User Story:** As a device owner, I want to track when my device was last seen, so that I can monitor device connectivity and health.

#### Acceptance Criteria

1. WHEN a device sends data THEN the system SHALL update the last_seen timestamp
2. WHEN retrieving device information THEN the system SHALL include the last_seen timestamp
3. WHEN a device hasn't been seen for extended periods THEN the system SHALL maintain the last known timestamp
4. IF a device has never connected THEN the last_seen field SHALL be null
5. WHEN device status changes THEN the system SHALL reflect the current is_active state

### Requirement 5: Device Listing and Search

**User Story:** As a user with multiple devices, I want to view and search through my devices, so that I can easily find and manage specific devices.

#### Acceptance Criteria

1. WHEN a user requests device list THEN the system SHALL return paginated results
2. WHEN a user provides search criteria THEN the system SHALL filter devices by device name or device ID
3. WHEN retrieving device list THEN the system SHALL include latest sensor data for each device
4. WHEN pagination parameters are provided THEN the system SHALL respect page and limit values
5. IF no devices exist for a user THEN the system SHALL return an empty array with appropriate metadata

### Requirement 6: Device Deletion

**User Story:** As a device owner, I want to remove devices I no longer use, so that I can keep my device list clean and organized.

#### Acceptance Criteria

1. WHEN a user deletes a device THEN the system SHALL remove the device record
2. WHEN device deletion is successful THEN the system SHALL return a success confirmation
3. IF a user tries to delete a device they don't own THEN the system SHALL return a 403 forbidden error
4. WHEN a device is deleted THEN the system SHALL handle related data appropriately
5. IF the device to delete doesn't exist THEN the system SHALL return a 404 not found error

### Requirement 7: Device Validation and Registration

**User Story:** As a system, I want to validate device registration attempts, so that only properly configured devices can connect to the monitoring system.

#### Acceptance Criteria

1. WHEN validating device registration THEN the system SHALL check if the device ID exists
2. WHEN a device attempts to connect THEN the system SHALL validate the device is registered and active
3. IF device validation fails THEN the system SHALL return appropriate error messages
4. WHEN device validation succeeds THEN the system SHALL allow the device to proceed with operations
5. WHEN checking device existence THEN the system SHALL return boolean confirmation

### Requirement 8: Integration with Related Systems

**User Story:** As a comprehensive monitoring system, I want devices to integrate with sensor data, calibrations, and other monitoring features, so that users get complete aquarium management capabilities.

#### Acceptance Criteria

1. WHEN a device is created THEN the system SHALL support relationships with sensor data, fish growth, calibrations, events, and feed data
2. WHEN retrieving device details THEN the system SHALL optionally include related data based on request parameters
3. WHEN a device has thresholds configured THEN the system SHALL maintain the one-to-one relationship
4. IF related data exists for a device THEN the system SHALL maintain referential integrity
5. WHEN device relationships are queried THEN the system SHALL use proper database indexing for performance

### Requirement 9: Real-time Sensor Data via MQTT

**User Story:** As an aquarium owner, I want to receive real-time sensor data from my device via MQTT, so that I can monitor my aquarium conditions without manual data entry.

#### Acceptance Criteria

1. WHEN a user pairs a device THEN the system SHALL only require the device ID for complete pairing
2. WHEN a device is paired THEN the system SHALL automatically subscribe to the device's MQTT topics
3. WHEN sensor data is published to MQTT THEN the system SHALL process and store it in real-time
4. WHEN real-time data is received THEN the system SHALL update the user interface without page refresh
5. IF connection to MQTT broker is lost THEN the system SHALL attempt reconnection and notify the user

### Requirement 10: Manual Measurement Comparison

**User Story:** As an aquarium owner, I want to record manual measurements of water parameters, so that I can compare them with automated sensor readings and verify sensor accuracy.

#### Acceptance Criteria

1. WHEN a user adds a manual measurement THEN the system SHALL store it with timestamp and device association
2. WHEN viewing sensor data THEN the system SHALL display manual measurements alongside sensor readings for the same time period
3. WHEN comparing measurements THEN the system SHALL calculate and display the difference between manual and sensor readings
4. WHEN manual measurements are recorded THEN the system SHALL allow specifying the same parameter types as available from sensors
5. IF manual and sensor readings differ significantly THEN the system SHALL highlight the discrepancy to suggest possible calibration needs
