import { config } from 'dotenv';
import * as pg from 'pg';

export default async function globalTeardown() {
  // Load test environment variables to ensure we have the right DB connection info
  config({ path: '.env.test' });

  console.log('🧹 Cleaning up test environment...');

  // Check environment to ensure we don't accidentally run in non-test environments
  if (process.env.NODE_ENV !== 'test') {
    console.warn('⚠️ Not in test environment, skipping teardown cleanup!');
    return;
  }

  try {
    // Connect to test database
    const client = new pg.Client({
      connectionString: process.env.DATABASE_URL,
    });

    await client.connect();

    // Truncate all tables to clean up test data (except migration tables)
    // This is faster than dropping and recreating the database
    await client.query(`
      DO $$ 
      DECLARE
        r RECORD;
      BEGIN
        -- Disable triggers temporarily
        SET session_replication_role = 'replica';
        
        -- Truncate all tables except migration tables
        FOR r IN (
          SELECT tablename 
          FROM pg_catalog.pg_tables 
          WHERE schemaname='public' 
          AND tablename != '_prisma_migrations'
          AND tablename != 'typeorm_migrations'
          AND tablename != 'migrations'
        ) LOOP
          EXECUTE 'TRUNCATE TABLE "' || r.tablename || '" CASCADE';
        END LOOP;
        
        -- Re-enable triggers
        SET session_replication_role = 'origin';
      END $$;
    `);

    await client.end();
  } catch (error) {
    console.error('Failed to clean up test database', error);
  }

  console.log('✅ Test environment cleanup complete');
}
