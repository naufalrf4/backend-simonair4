import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateSensorData1752127036814 implements MigrationInterface {
  name = 'CreateSensorData1752127036814';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "sensor_data" (
        "time" TIMESTAMPTZ NOT NULL,
        "device_id" varchar(20) NOT NULL,
        "temperature" jsonb,
        "ph" jsonb,
        "tds" jsonb,
        "do_level" jsonb,
        CONSTRAINT "PK_sensor_data" PRIMARY KEY ("time", "device_id"),
        CONSTRAINT "FK_sensor_data_device_id" FOREIGN KEY ("device_id") REFERENCES "devices"("device_id") ON DELETE CASCADE ON UPDATE CASCADE
      );
    `);

    await queryRunner.query(`CREATE INDEX "IDX_sensor_data_time_device_id" ON "sensor_data" ("time", "device_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_sensor_data_device_id_time" ON "sensor_data" ("device_id", "time")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_sensor_data_device_id_time"`);
    await queryRunner.query(`DROP INDEX "IDX_sensor_data_time_device_id"`);
    await queryRunner.query(`DROP TABLE "sensor_data"`);
  }
}
