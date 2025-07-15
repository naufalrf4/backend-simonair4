import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateFishGrowth1752127037906 implements MigrationInterface {
  name = 'CreateFishGrowth1752127037906';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "fish_growth" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "device_id" varchar(20) NOT NULL,
        "measurement_date" date NOT NULL,
        "length_cm" decimal(5,2),
        "weight_gram" decimal(8,2),
        "biomass_kg" decimal(10,3),
        "condition_indicator" varchar(20),
        "notes" text,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_fish_growth_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_fish_growth_device_id" FOREIGN KEY ("device_id") REFERENCES "devices"("device_id") ON DELETE CASCADE ON UPDATE CASCADE
      );
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_fish_growth_device_id_measurement_date" ON "fish_growth" ("device_id", "measurement_date");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_fish_growth_device_id_measurement_date"`);
    await queryRunner.query(`DROP TABLE "fish_growth"`);
  }
}
