import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateDevices1752127035756 implements MigrationInterface {
  name = 'CreateDevices1752127035756';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "devices" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "device_id" varchar(20) NOT NULL,
        "user_id" uuid NOT NULL,
        "device_name" varchar(255) NOT NULL,
        "location" varchar(255),
        "aquarium_size" varchar(50),
        "glass_type" varchar(50),
        "fish_count" integer NOT NULL DEFAULT 0,
        "last_seen" TIMESTAMP,
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_devices_device_id" UNIQUE ("device_id"),
        CONSTRAINT "PK_devices_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_devices_user_id" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
      );
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_devices_device_id" ON "devices" ("device_id");
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_devices_user_id_is_active" ON "devices" ("user_id", "is_active");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_devices_user_id_is_active"`);
    await queryRunner.query(`DROP INDEX "IDX_devices_device_id"`);
    await queryRunner.query(`DROP TABLE "devices"`);
  }
}
