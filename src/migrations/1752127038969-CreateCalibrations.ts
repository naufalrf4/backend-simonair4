import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCalibrations1752127038969 implements MigrationInterface {
  name = 'CreateCalibrations1752127038969';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "calibrations" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "device_id" varchar(20) NOT NULL,
        "sensor_type" varchar(20) NOT NULL,
        "calibration_data" jsonb NOT NULL,
        "applied_at" TIMESTAMP NOT NULL DEFAULT now(),
        "applied_by" uuid,
        CONSTRAINT "PK_calibrations_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_calibrations_device_id" FOREIGN KEY ("device_id") REFERENCES "devices"("device_id") ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "FK_calibrations_applied_by" FOREIGN KEY ("applied_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE
      );
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_calibrations_device_id_sensor_type_applied_at" ON "calibrations" ("device_id", "sensor_type", "applied_at");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_calibrations_device_id_sensor_type_applied_at"`);
    await queryRunner.query(`DROP TABLE "calibrations"`);
  }
}
