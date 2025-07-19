import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import * as path from 'path';

// Load test environment variables
config({ path: '.env.test' });

let testDataSourceInstance: DataSource | null = null;

// Create test DataSource configuration
export const testDataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  entities: [path.join(__dirname, '../src/**/*.entity{.ts,.js}')],
  migrations: [path.join(__dirname, '../src/migrations/*{.ts,.js}')],
  synchronize: false,
  migrationsRun: false,
  logging: process.env.NODE_ENV === 'test' ? ['error'] : ['query', 'error'],
  ssl:
    process.env.DATABASE_SSL === 'true'
      ? {
          rejectUnauthorized: false,
        }
      : false,
  // Connection pool settings optimized for tests
  extra: {
    max: 5, // Smaller connection pool for tests
    min: 1,
    acquireTimeoutMillis: 30000,
    idleTimeoutMillis: 30000,
  },
});

/**
 * Initialize test database connection
 * This function sets up a clean database connection for testing
 */
export async function initializeTestDatabase(): Promise<DataSource> {
  if (testDataSourceInstance && testDataSourceInstance.isInitialized) {
    return testDataSourceInstance;
  }

  if (!testDataSource.isInitialized) {
    await testDataSource.initialize();
  }

  testDataSourceInstance = testDataSource;

  // Run migrations if needed
  if (process.env.DATABASE_MIGRATIONS_RUN === 'true') {
    await testDataSource.runMigrations();
  }

  return testDataSource;
}

/**
 * Close test database connection
 */
export async function closeTestDatabase(): Promise<void> {
  if (testDataSource.isInitialized) {
    await testDataSource.destroy();
  }
  testDataSourceInstance = null;
}

/**
 * Clean test database by truncating all tables
 * This is safer than dropping the database and preserves structure
 */
export async function cleanTestDatabase(): Promise<void> {
  if (!testDataSource.isInitialized) {
    await testDataSource.initialize();
  }

  // Get all entities
  const entities = testDataSource.entityMetadatas;

  await testDataSource.query('BEGIN');

  try {
    // Disable foreign key checks temporarily
    await testDataSource.query('SET CONSTRAINTS ALL DEFERRED');

    // Truncate each entity table except migration tables
    for (const entity of entities) {
      if (
        !entity.tableName.includes('migration') &&
        !entity.tableName.includes('typeorm_migrations')
      ) {
        await testDataSource.query(
          `TRUNCATE TABLE "${entity.tableName}" RESTART IDENTITY CASCADE`,
        );
      }
    }

    await testDataSource.query('COMMIT');
  } catch (error) {
    await testDataSource.query('ROLLBACK');
    throw error;
  }
}

/**
 * Get test database connection
 * Ensures the database is initialized before returning
 */
export async function getTestDatabase(): Promise<DataSource> {
  if (!testDataSourceInstance || !testDataSourceInstance.isInitialized) {
    return await initializeTestDatabase();
  }
  return testDataSourceInstance;
}

/**
 * Helper to create test transaction
 * Useful for tests that need to rollback changes
 */
export async function createTestTransaction() {
  const dataSource = await getTestDatabase();
  const queryRunner = dataSource.createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction();

  return {
    queryRunner,
    manager: queryRunner.manager,
    rollback: async () => {
      await queryRunner.rollbackTransaction();
      await queryRunner.release();
    },
    commit: async () => {
      await queryRunner.commitTransaction();
      await queryRunner.release();
    },
  };
}
