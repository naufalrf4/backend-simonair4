import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAuthTables1752400000000 implements MigrationInterface {
  name = 'CreateAuthTables1752400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create login_attempts table
    await queryRunner.query(`
      CREATE TABLE "login_attempts" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "email" varchar(255) NOT NULL,
        "ip_address" varchar(45) NOT NULL,
        "success" boolean NOT NULL DEFAULT false,
        "user_agent" varchar(255),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_login_attempts_id" PRIMARY KEY ("id")
      );
    `);

    // Create indexes for login_attempts
    await queryRunner.query(`
      CREATE INDEX "IDX_login_attempts_ip_created" ON "login_attempts" ("ip_address", "created_at");
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_login_attempts_email_created" ON "login_attempts" ("email", "created_at");
    `);

    // Create refresh_tokens table
    await queryRunner.query(`
      CREATE TABLE "refresh_tokens" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "token" varchar(255) NOT NULL,
        "user_id" uuid NOT NULL,
        "ip_address" varchar(45),
        "user_agent" varchar(255),
        "is_valid" boolean NOT NULL DEFAULT true,
        "expires_at" TIMESTAMP NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "revoked_at" TIMESTAMP,
        "revoked_reason" varchar(255),
        CONSTRAINT "UQ_refresh_tokens_token" UNIQUE ("token"),
        CONSTRAINT "PK_refresh_tokens_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_refresh_tokens_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
      );
    `);

    // Create indexes for refresh_tokens
    await queryRunner.query(`
      CREATE INDEX "IDX_refresh_tokens_user_valid" ON "refresh_tokens" ("user_id", "is_valid");
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_refresh_tokens_expires" ON "refresh_tokens" ("expires_at");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop refresh_tokens indexes and table
    await queryRunner.query(`DROP INDEX "IDX_refresh_tokens_expires"`);
    await queryRunner.query(`DROP INDEX "IDX_refresh_tokens_user_valid"`);
    await queryRunner.query(`DROP TABLE "refresh_tokens"`);

    // Drop login_attempts indexes and table
    await queryRunner.query(`DROP INDEX "IDX_login_attempts_email_created"`);
    await queryRunner.query(`DROP INDEX "IDX_login_attempts_ip_created"`);
    await queryRunner.query(`DROP TABLE "login_attempts"`);
  }
}
