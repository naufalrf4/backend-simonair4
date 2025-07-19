import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateFeedData1752127041110 implements MigrationInterface {
  name = 'CreateFeedData1752127041110';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "feed_data" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "device_id" varchar(20) NOT NULL,
        "feed_name" varchar(255) NOT NULL,
        "feed_type" varchar(50) NOT NULL,
        "feeding_schedule" jsonb,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_feed_data_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_feed_data_device_id" FOREIGN KEY ("device_id") REFERENCES "devices"("device_id") ON DELETE CASCADE ON UPDATE CASCADE
      );
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_feed_data_device_id_created_at" ON "feed_data" ("device_id", "created_at")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_feed_data_device_id_created_at"`);
    await queryRunner.query(`DROP TABLE "feed_data"`);
  }
}
