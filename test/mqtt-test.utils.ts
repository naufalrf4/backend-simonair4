import * as mqtt from 'mqtt';

// MQTT mock types
export interface MqttMockClient {
  publish: jest.MockedFunction<any>;
  subscribe: jest.MockedFunction<any>;
  on: jest.MockedFunction<any>;
  end: jest.MockedFunction<any>;
  connected: boolean;
  reconnect: jest.MockedFunction<any>;
}

export interface MqttMock {
  connect: jest.MockedFunction<any>;
  Client: jest.MockedFunction<any>;
  __mockClient: MqttMockClient;
  __mockPublish: jest.MockedFunction<any>;
  __mockSubscribe: jest.MockedFunction<any>;
  __mockOn: jest.MockedFunction<any>;
}

/**
 * Get the MQTT mock instance
 * This is useful for testing MQTT functionality without actual broker connections
 */
export function getMqttMock(): MqttMock {
  return mqtt as unknown as MqttMock;
}

/**
 * Reset all MQTT mocks before each test
 */
export function resetMqttMocks(): void {
  const mqttMock = getMqttMock();

  mqttMock.__mockPublish.mockReset();
  mqttMock.__mockSubscribe.mockReset();
  mqttMock.__mockOn.mockReset();
  mqttMock.connect.mockReset();
  mqttMock.__mockClient.end.mockReset();
  mqttMock.__mockClient.reconnect.mockReset();

  // Reset connected state
  mqttMock.__mockClient.connected = true;
}

/**
 * Simulate MQTT message receipt
 * @param topic The MQTT topic
 * @param message The message payload (will be converted to Buffer)
 */
export function simulateMqttMessage(
  topic: string,
  message: string | object,
): void {
  const mqttMock = getMqttMock();
  const messageHandlers = mqttMock.__mockOn.mock.calls
    .filter(([event]) => event === 'message')
    .map(([_, handler]) => handler);

  const messageBuffer =
    typeof message === 'string'
      ? Buffer.from(message)
      : Buffer.from(JSON.stringify(message));

  messageHandlers.forEach((handler) => handler(topic, messageBuffer));
}

/**
 * Simulate MQTT connection error
 * @param error The error to simulate
 */
export function simulateMqttError(error: Error): void {
  const mqttMock = getMqttMock();
  const errorHandlers = mqttMock.__mockOn.mock.calls
    .filter(([event]) => event === 'error')
    .map(([_, handler]) => handler);

  errorHandlers.forEach((handler) => handler(error));

  // Set connected to false
  mqttMock.__mockClient.connected = false;
}

/**
 * Simulate MQTT connection success
 */
export function simulateMqttConnect(): void {
  const mqttMock = getMqttMock();
  mqttMock.__mockClient.connected = true;

  // Find the connect handler and call it
  const connectHandlers = mqttMock.__mockOn.mock.calls
    .filter(([event]) => event === 'connect')
    .map(([_, handler]) => handler);

  connectHandlers.forEach((handler) => handler());
}

/**
 * Simulate MQTT disconnection
 */
export function simulateMqttDisconnect(): void {
  const mqttMock = getMqttMock();
  mqttMock.__mockClient.connected = false;

  // Find the disconnect handler and call it
  const disconnectHandlers = mqttMock.__mockOn.mock.calls
    .filter(([event]) => event === 'disconnect')
    .map(([_, handler]) => handler);

  disconnectHandlers.forEach((handler) => handler());
}

/**
 * Get MQTT publish calls for verification
 */
export function getMqttPublishCalls(): any[] {
  const mqttMock = getMqttMock();
  return mqttMock.__mockPublish.mock.calls;
}

/**
 * Get MQTT subscribe calls for verification
 */
export function getMqttSubscribeCalls(): any[] {
  const mqttMock = getMqttMock();
  return mqttMock.__mockSubscribe.mock.calls;
}

/**
 * Create test MQTT service configuration
 */
export function createTestMqttConfig() {
  return {
    brokerUrl: 'ws://localhost:8083/mqtt',
    clientId: 'test-client',
    username: 'test-user',
    password: 'test-password',
    topicPrefix: 'test/',
    retryInterval: 1000,
    maxRetries: 3,
    publishTimeout: 5000,
    qos: 1,
  };
}
