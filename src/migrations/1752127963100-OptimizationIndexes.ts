import { MigrationInterface, QueryRunner } from 'typeorm';

export class OptimizationIndexes1752127963100 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE INDEX idx_sensor_data_temperature_gin 
      ON sensor_data USING GIN (temperature)
    `);

    await queryRunner.query(`
      CREATE INDEX idx_sensor_data_ph_gin 
      ON sensor_data USING GIN (ph)
    `);

    await queryRunner.query(`
      CREATE INDEX idx_sensor_data_tds_gin 
      ON sensor_data USING GIN (tds)
    `);

    await queryRunner.query(`
      CREATE INDEX idx_sensor_data_do_gin 
      ON sensor_data USING GIN (do_level)
    `);

    await queryRunner.query(`
      CREATE INDEX idx_devices_active 
      ON devices (last_seen DESC) WHERE is_active = true
    `);

    await queryRunner.query(`
      CREATE INDEX idx_fish_growth_device_date_desc 
      ON fish_growth (device_id, measurement_date DESC)
    `);

    await queryRunner.query(`
      CREATE INDEX idx_calibrations_device_sensor_applied_desc 
      ON calibrations (device_id, sensor_type, applied_at DESC)
    `);

    await queryRunner.query(`
      ALTER TABLE devices 
      ADD CONSTRAINT chk_device_id_format 
      CHECK (device_id ~ '^SMNR-[A-Z0-9]{4}$')
    `);

    await queryRunner.query(`
      ALTER TABLE fish_growth 
      ADD CONSTRAINT chk_positive_values 
      CHECK (
        (length_cm IS NULL OR length_cm > 0) AND
        (weight_gram IS NULL OR weight_gram > 0) AND
        (biomass_kg IS NULL OR biomass_kg > 0)
      )
    `);

    await queryRunner.query(`
      ALTER TABLE calibrations 
      ADD CONSTRAINT chk_sensor_type_valid 
      CHECK (sensor_type IN ('ph', 'tds', 'do', 'temperature'))
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_sensor_data_temperature_gin`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS idx_sensor_data_ph_gin`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_sensor_data_tds_gin`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_sensor_data_do_gin`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_devices_active`);
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_fish_growth_device_date_desc`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_calibrations_device_sensor_applied_desc`,
    );
    await queryRunner.query(
      `ALTER TABLE devices DROP CONSTRAINT IF EXISTS chk_device_id_format`,
    );
    await queryRunner.query(
      `ALTER TABLE fish_growth DROP CONSTRAINT IF EXISTS chk_positive_values`,
    );
    await queryRunner.query(
      `ALTER TABLE calibrations DROP CONSTRAINT IF EXISTS chk_sensor_type_valid`,
    );
  }
}
