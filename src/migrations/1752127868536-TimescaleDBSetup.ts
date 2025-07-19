import { MigrationInterface, QueryRunner } from 'typeorm';

export class TimescaleDBSetup1752127868536 implements MigrationInterface {
  public transaction = false;

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE EXTENSION IF NOT EXISTS timescaledb;
    `);

    await queryRunner.query(`
      SELECT create_hypertable('sensor_data', 'time', if_not_exists => TRUE,
        chunk_time_interval => INTERVAL '1 day',
        create_default_indexes => FALSE
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_sensor_data_time_device_id
      ON sensor_data (time DESC, device_id);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_sensor_data_device_id_time
      ON sensor_data (device_id, time DESC);
    `);

    await queryRunner.query(
      `DROP MATERIALIZED VIEW IF EXISTS sensor_data_hourly;`,
    );
    await queryRunner.query(`
      CREATE MATERIALIZED VIEW sensor_data_hourly
      WITH (timescaledb.continuous) AS
      SELECT
        time_bucket('1 hour', time) AS time_bucket,
        device_id,
        AVG((temperature->>'value')::float) AS avg_temperature,
        AVG((ph->>'calibrated')::float) AS avg_ph,
        AVG((tds->>'calibrated')::float) AS avg_tds,
        AVG((do_level->>'calibrated')::float) AS avg_do,
        COUNT(*) AS sample_count
      FROM sensor_data
      GROUP BY time_bucket, device_id
      WITH DATA;
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_sensor_data_hourly_time_device 
      ON sensor_data_hourly (time_bucket DESC, device_id);
    `);

    await queryRunner.query(`
      SELECT remove_retention_policy('sensor_data', if_exists => TRUE);
    `);
    await queryRunner.query(`
      SELECT add_retention_policy('sensor_data', INTERVAL '2 years');
    `);

    await queryRunner.query(`
      SELECT add_continuous_aggregate_policy('sensor_data_hourly',
        start_offset => INTERVAL '3 hours',
        end_offset => INTERVAL '1 hour',
        schedule_interval => INTERVAL '1 hour'
      );
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `SELECT remove_continuous_aggregate_policy('sensor_data_hourly');`,
    );
    await queryRunner.query(`SELECT remove_retention_policy('sensor_data');`);
    await queryRunner.query(
      `DROP MATERIALIZED VIEW IF EXISTS sensor_data_hourly`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_sensor_data_hourly_time_device`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_sensor_data_device_id_time`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_sensor_data_time_device_id`,
    );
  }
}
