import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateUsers1752127029714 implements MigrationInterface {
  name = 'CreateUsers1752127029714';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "user_role" AS ENUM ('superuser', 'admin', 'user');
    `);

    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "email" varchar(255) NOT NULL,
        "password_hash" varchar(255),
        "full_name" varchar(255) NOT NULL,
        "role" "user_role" NOT NULL DEFAULT 'user',
        "social_provider" varchar(50),
        "social_id" varchar(255),
        "email_verified" boolean NOT NULL DEFAULT false,
        "reset_token" varchar(255),
        "reset_token_expires" TIMESTAMP,
        "verification_token" varchar(255),
        "last_login" TIMESTAMP,
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_users_email" UNIQUE ("email"),
        CONSTRAINT "PK_users_id" PRIMARY KEY ("id")
      );
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users" DROP COLUMN "is_active";
      ALTER TABLE "users" DROP COLUMN "last_login";
      ALTER TABLE "users" DROP COLUMN "verification_token";
      ALTER TABLE "users" DROP COLUMN "reset_token_expires";
      ALTER TABLE "users" DROP COLUMN "reset_token";
    `);
    await queryRunner.query(`DROP TABLE "users"`);
    await queryRunner.query(`DROP TYPE "user_role"`);
  }
}
