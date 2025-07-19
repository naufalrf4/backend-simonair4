import 'reflect-metadata';
import { config } from 'dotenv';
import * as pg from 'pg';
import { promisify } from 'util';
import { exec } from 'child_process';

const execAsync = promisify(exec);

export default async function globalSetup() {
  // Load test environment variables first
  config({ path: '.env.test' });

  console.log('🧪 Setting up test environment...');

  // Ensure test environment
  process.env.NODE_ENV = 'test';

  // Validate critical test environment variables
  const requiredVars = ['DATABASE_URL', 'JWT_SECRET', 'JWT_REFRESH_SECRET'];

  const missingVars = requiredVars.filter((varName) => !process.env[varName]);
  if (missingVars.length > 0) {
    console.error('❌ Missing required environment variables:', missingVars);
    process.exit(1);
  }

  // Database setup for tests
  if (!process.env.DATABASE_URL) {
    console.warn(
      '⚠️  DATABASE_URL not set for tests. Using default test database.',
    );
    process.env.DATABASE_URL =
      'postgresql://test:test@localhost:5432/simonair_test';
  }

  // MQTT setup for tests
  if (!process.env.MQTT_BROKER_URL) {
    console.warn(
      '⚠️  MQTT_BROKER_URL not set for tests. Using mock MQTT broker.',
    );
    process.env.MQTT_BROKER_URL = 'ws://localhost:8083/mqtt';
  }

  // JWT secrets for tests
  if (!process.env.JWT_SECRET) {
    process.env.JWT_SECRET = 'test_jwt_secret_key_for_testing_only';
  }

  if (!process.env.JWT_REFRESH_SECRET) {
    process.env.JWT_REFRESH_SECRET = 'test_refresh_secret_key_for_testing_only';
  }

  // Set test-specific configuration
  process.env.DATABASE_SYNCHRONIZE = 'false';
  process.env.DATABASE_MIGRATIONS_RUN = 'true';
  process.env.DATABASE_LOGGING = 'error';
  process.env.THROTTLE_TTL = '0'; // Disable throttling in tests
  process.env.THROTTLE_LIMIT = '999999';

  console.log('📋 Test environment variables:');
  console.log('  NODE_ENV:', process.env.NODE_ENV);
  console.log(
    '  DATABASE_URL:',
    process.env.DATABASE_URL?.replace(/\/\/.*@/, '//***@'),
  ); // Hide credentials
  console.log('  MQTT_BROKER_URL:', process.env.MQTT_BROKER_URL);

  // Setup test database
  try {
    // Test database connection
    console.log('🔗 Testing database connection...');
    const client = new pg.Client({
      connectionString: process.env.DATABASE_URL,
    });

    await client.connect();
    const result = await client.query('SELECT NOW() as current_time');
    console.log(
      '✅ Database connection successful. Current time:',
      result.rows[0].current_time,
    );
    await client.end();
  } catch (error) {
    console.warn('⚠️  Database connection failed:', error.message);
    console.warn('⚠️  Tests may fail without proper database connection');
    console.warn(
      '⚠️  To run database tests, ensure PostgreSQL is running and accessible',
    );
    // Don't exit - allow tests to run without database for unit tests
  }

  console.log('✅ Test environment setup complete');
}
