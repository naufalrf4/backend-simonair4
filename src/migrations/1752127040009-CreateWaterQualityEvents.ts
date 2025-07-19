import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateWaterQualityEvents1752127040009
  implements MigrationInterface
{
  name = 'CreateWaterQualityEvents1752127040009';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "water_quality_events" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "device_id" varchar(20) NOT NULL,
        "event_type" varchar(50) NOT NULL,
        "event_date" date NOT NULL,
        "description" text,
        "created_by" uuid,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_water_quality_events_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_water_quality_events_device_id" FOREIGN KEY ("device_id") REFERENCES "devices"("device_id") ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "FK_water_quality_events_created_by" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE
      );
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_water_quality_events_device_id_event_date" ON "water_quality_events" ("device_id", "event_date")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_water_quality_events_event_type_event_date" ON "water_quality_events" ("event_type", "event_date")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "IDX_water_quality_events_event_type_event_date"`,
    );
    await queryRunner.query(
      `DROP INDEX "IDX_water_quality_events_device_id_event_date"`,
    );
    await queryRunner.query(`DROP TABLE "water_quality_events"`);
  }
}
