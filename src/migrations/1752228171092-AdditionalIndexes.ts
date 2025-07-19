import { MigrationInterface, QueryRunner } from 'typeorm';

export class AdditionalIndexes1752228171092 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE INDEX idx_users_email ON users (email)`);
    await queryRunner.query(
      `CREATE INDEX idx_devices_user_id ON devices (user_id)`,
    );
    await queryRunner.query(
      `CREATE INDEX idx_sensor_data_device_time ON sensor_data (device_id, "time" DESC)`,
    );
    await queryRunner.query(
      `CREATE INDEX idx_feed_data_device_created_at ON feed_data (device_id, created_at DESC)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_users_email`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_users_username`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_devices_user_id`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_sensor_data_device_time`);
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_feed_data_device_created_at`,
    );
  }
}
