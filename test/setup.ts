import 'reflect-metadata';
import { config } from 'dotenv';
import * as mqtt from 'mqtt';

// Load test environment variables first
config({ path: '.env.test' });

// Set default test environment variables if not provided
process.env.NODE_ENV = process.env.NODE_ENV || 'test';
process.env.DATABASE_URL =
  process.env.DATABASE_URL ||
  'postgresql://test:test@localhost:5432/simonair_test';
process.env.MQTT_BROKER_URL =
  process.env.MQTT_BROKER_URL || 'ws://localhost:8083/mqtt';
process.env.MQTT_USERNAME = process.env.MQTT_USERNAME || 'test_user';
process.env.MQTT_PASSWORD = process.env.MQTT_PASSWORD || 'test_password';
process.env.JWT_SECRET =
  process.env.JWT_SECRET || 'test_jwt_secret_key_for_testing_only';
process.env.JWT_REFRESH_SECRET =
  process.env.JWT_REFRESH_SECRET || 'test_refresh_secret_key_for_testing_only';

// Ensure test environment is properly set
if (process.env.NODE_ENV !== 'test') {
  console.warn('⚠️ Warning: NODE_ENV is not set to "test". Setting it now...');
  process.env.NODE_ENV = 'test';
}

// Mock MQTT client
jest.mock('mqtt', () => {
  const mockPublish = jest.fn((topic, message, options, callback) => {
    if (callback) callback(null);
    return true;
  });

  const mockSubscribe = jest.fn((topic, options, callback) => {
    if (callback) callback(null);
    return { topic };
  });

  const mockOn = jest.fn();

  const mockClient = {
    publish: mockPublish,
    subscribe: mockSubscribe,
    on: mockOn,
    end: jest.fn(),
    connected: true,
    reconnect: jest.fn(),
  };

  return {
    connect: jest.fn(() => mockClient),
    Client: jest.fn(() => mockClient),
    __mockClient: mockClient,
    __mockPublish: mockPublish,
    __mockSubscribe: mockSubscribe,
    __mockOn: mockOn,
  };
});

// Mock console methods for cleaner test output
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

beforeAll(() => {
  // Suppress console.error and console.warn during tests unless explicitly needed
  console.error = jest.fn();
  console.warn = jest.fn();
});

afterAll(() => {
  // Restore original console methods
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
});

// Global test utilities
global.testUtils = {
  // Helper to create mock user
  createMockUser: (overrides = {}) => ({
    id: 'test-user-id',
    email: 'test@example.com',
    username: 'testuser',
    role: 'USER',
    created_at: new Date(),
    updated_at: new Date(),
    ...overrides,
  }),

  // Helper to create mock device
  createMockDevice: (overrides = {}) => ({
    id: 'test-device-uuid',
    device_id: 'SMNR-TEST',
    name: 'Test Device',
    location: 'Test Location',
    user_id: 'test-user-id',
    created_at: new Date(),
    updated_at: new Date(),
    last_seen: new Date(),
    ...overrides,
  }),

  // Helper to create mock sensor data
  createMockSensorData: (overrides = {}) => ({
    id: 'test-sensor-data-uuid',
    device_id: 'SMNR-TEST',
    timestamp: new Date(),
    temperature: 25.5,
    ph: 7.2,
    tds: 450,
    do_level: 8.5,
    temp_status: 'GOOD',
    ph_status: 'GOOD',
    tds_status: 'GOOD',
    do_status: 'GOOD',
    ...overrides,
  }),
};

// Extend Jest matchers
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeValidUUID(): R;
      toBeValidDeviceId(): R;
      toBeValidTimestamp(): R;
    }
  }

  var testUtils: {
    createMockUser: (overrides?: any) => any;
    createMockDevice: (overrides?: any) => any;
    createMockSensorData: (overrides?: any) => any;
  };
}

// Custom Jest matchers
expect.extend({
  toBeValidUUID(received: string) {
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const pass = uuidRegex.test(received);

    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid UUID`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid UUID`,
        pass: false,
      };
    }
  },

  toBeValidDeviceId(received: string) {
    const deviceIdRegex = /^SMNR-[A-Z0-9]{4}$/;
    const pass = deviceIdRegex.test(received);

    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid device ID`,
        pass: true,
      };
    } else {
      return {
        message: () =>
          `expected ${received} to be a valid device ID (format: SMNR-XXXX)`,
        pass: false,
      };
    }
  },

  toBeValidTimestamp(received: any) {
    const pass = received instanceof Date && !isNaN(received.getTime());

    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid timestamp`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid timestamp`,
        pass: false,
      };
    }
  },
});
