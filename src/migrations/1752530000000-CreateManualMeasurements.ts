import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateManualMeasurements1752530000000 implements MigrationInterface {
  name = 'CreateManualMeasurements1752530000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "manual_measurements" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "device_id" varchar(20) NOT NULL,
        "measured_by" uuid NOT NULL,
        "measurement_timestamp" TIMESTAMPTZ NOT NULL,
        "temperature" decimal(5,2),
        "ph" decimal(4,2),
        "tds" integer,
        "do_level" decimal(4,2),
        "notes" text,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_manual_measurements_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_manual_measurements_device_id" FOREIGN KEY ("device_id") REFERENCES "devices"("device_id") ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "FK_manual_measurements_measured_by" FOREIGN KEY ("measured_by") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
      );
    `);

    // Create indexes for optimal performance
    await queryRunner.query(`
      CREATE INDEX "IDX_manual_measurements_device_timestamp" ON "manual_measurements" ("device_id", "measurement_timestamp");
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_manual_measurements_device_created" ON "manual_measurements" ("device_id", "created_at");
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_manual_measurements_user_created" ON "manual_measurements" ("measured_by", "created_at");
    `);

    // Create unique constraint to prevent duplicate measurements at the same timestamp for the same device
    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_manual_measurements_device_timestamp" ON "manual_measurements" ("device_id", "measurement_timestamp");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "UQ_manual_measurements_device_timestamp"`);
    await queryRunner.query(`DROP INDEX "IDX_manual_measurements_user_created"`);
    await queryRunner.query(`DROP INDEX "IDX_manual_measurements_device_created"`);
    await queryRunner.query(`DROP INDEX "IDX_manual_measurements_device_timestamp"`);
    await queryRunner.query(`DROP TABLE "manual_measurements"`);
  }
}
