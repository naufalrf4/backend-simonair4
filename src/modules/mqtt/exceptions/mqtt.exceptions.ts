import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * Base class for MQTT-related exceptions
 */
export abstract class MqttException extends HttpException {
  constructor(
    message: string,
    status: HttpStatus,
    public readonly deviceId?: string,
  ) {
    super(message, status);
  }
}

/**
 * Exception thrown when MQTT broker is unavailable or connection fails
 */
export class MqttBrokerUnavailableException extends MqttException {
  constructor(deviceId?: string, originalError?: string) {
    const message = deviceId
      ? `MQTT broker unavailable for device ${deviceId}${originalError ? `: ${originalError}` : ''}`
      : `MQTT broker unavailable${originalError ? `: ${originalError}` : ''}`;

    super(message, HttpStatus.SERVICE_UNAVAILABLE, deviceId);
  }
}

/**
 * Exception thrown when MQTT publish operation fails
 */
export class MqttPublishFailedException extends MqttException {
  constructor(deviceId: string, topic: string, originalError?: string) {
    const message = `Failed to publish MQTT message to topic ${topic} for device ${deviceId}${originalError ? `: ${originalError}` : ''}`;
    super(message, HttpStatus.BAD_GATEWAY, deviceId);
  }
}

/**
 * Exception thrown when MQTT connection timeout occurs
 */
export class MqttConnectionTimeoutException extends MqttException {
  constructor(deviceId?: string) {
    const message = deviceId
      ? `MQTT connection timeout for device ${deviceId}`
      : 'MQTT connection timeout';

    super(message, HttpStatus.GATEWAY_TIMEOUT, deviceId);
  }
}

/**
 * Exception thrown when device ID format is invalid for MQTT operations
 */
export class InvalidDeviceIdFormatException extends MqttException {
  constructor(deviceId: string) {
    const message = `Invalid device ID format: ${deviceId}. Expected format: SMNR-XXXX`;
    super(message, HttpStatus.BAD_REQUEST, deviceId);
  }
}

/**
 * Exception thrown when MQTT payload validation fails
 */
export class MqttPayloadValidationException extends MqttException {
  constructor(deviceId: string, validationError: string) {
    const message = `MQTT payload validation failed for device ${deviceId}: ${validationError}`;
    super(message, HttpStatus.BAD_REQUEST, deviceId);
  }
}

/**
 * Exception thrown when MQTT operation times out
 */
export class MqttOperationTimeoutException extends MqttException {
  constructor(deviceId: string, operation: string, timeoutMs: number) {
    const message = `MQTT ${operation} operation timed out after ${timeoutMs}ms for device ${deviceId}`;
    super(message, HttpStatus.REQUEST_TIMEOUT, deviceId);
  }
}

/**
 * Exception thrown when MQTT subscription fails
 */
export class MqttSubscriptionFailedException extends MqttException {
  constructor(topic: string, originalError?: string) {
    const message = `Failed to subscribe to MQTT topic ${topic}${originalError ? `: ${originalError}` : ''}`;
    super(message, HttpStatus.BAD_GATEWAY);
  }
}

/**
 * Exception thrown when MQTT message handling fails
 */
export class MqttMessageHandlingException extends MqttException {
  constructor(topic: string, deviceId?: string, originalError?: string) {
    const message = `Failed to handle MQTT message from topic ${topic}${deviceId ? ` for device ${deviceId}` : ''}${originalError ? `: ${originalError}` : ''}`;
    super(message, HttpStatus.INTERNAL_SERVER_ERROR, deviceId);
  }
}

/**
 * Exception thrown when MQTT client initialization fails
 */
export class MqttClientInitializationException extends MqttException {
  constructor(originalError?: string) {
    const message = `Failed to initialize MQTT client${originalError ? `: ${originalError}` : ''}`;
    super(message, HttpStatus.SERVICE_UNAVAILABLE);
  }
}

/**
 * Exception thrown when MQTT configuration is invalid
 */
export class MqttConfigurationException extends MqttException {
  constructor(configField: string, originalError?: string) {
    const message = `Invalid MQTT configuration for field '${configField}'${originalError ? `: ${originalError}` : ''}`;
    super(message, HttpStatus.INTERNAL_SERVER_ERROR);
  }
}
