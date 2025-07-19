import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMqttTrackingToCalibrations1753000000000 implements MigrationInterface {
  name = 'AddMqttTrackingToCalibrations1753000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add MQTT tracking fields to calibrations table
    await queryRunner.query(`
      ALTER TABLE "calibrations" 
      ADD COLUMN "mqtt_published_at" TIMESTAMP NULL,
      ADD COLUMN "mqtt_ack_received_at" TIMESTAMP NULL,
      ADD COLUMN "mqtt_ack_status" varchar(20) NOT NULL DEFAULT 'pending',
      ADD COLUMN "mqtt_retry_count" integer NOT NULL DEFAULT 0;
    `);

    // Add indexes for MQTT tracking performance
    await queryRunner.query(`
      CREATE INDEX "IDX_calibrations_mqtt_ack_status_mqtt_published_at" ON "calibrations" ("mqtt_ack_status", "mqtt_published_at");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop the index first
    await queryRunner.query(`
      DROP INDEX "IDX_calibrations_mqtt_ack_status_mqtt_published_at";
    `);

    // Remove MQTT tracking fields from calibrations table
    await queryRunner.query(`
      ALTER TABLE "calibrations" 
      DROP COLUMN "mqtt_published_at",
      DROP COLUMN "mqtt_ack_received_at",
      DROP COLUMN "mqtt_ack_status",
      DROP COLUMN "mqtt_retry_count";
    `);
  }
}
