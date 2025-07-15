import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateThresholds1752509811648 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE "thresholds" (
                "id" uuid NOT NULL DEFAULT gen_random_uuid(),
                "device_id" character varying(20) NOT NULL,
                "threshold_data" jsonb NOT NULL,
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_by" uuid,
                CONSTRAINT "UQ_thresholds_device_id" UNIQUE ("device_id"),
                CONSTRAINT "PK_thresholds_id" PRIMARY KEY ("id"),
                CONSTRAINT "FK_thresholds_device_id" FOREIGN KEY ("device_id") REFERENCES "devices"("device_id") ON DELETE CASCADE ON UPDATE CASCADE,
                CONSTRAINT "FK_thresholds_updated_by" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE
            );
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "thresholds"`);
    }

}
