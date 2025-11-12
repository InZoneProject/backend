import { MigrationInterface, QueryRunner } from "typeorm";

export class AddEmailVerification1762879073085 implements MigrationInterface {
    name = 'AddEmailVerification1762879073085'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "email_verification" ("verification_id" uuid NOT NULL DEFAULT uuid_generate_v4(), "code" character varying(6) NOT NULL, "expires_at" TIMESTAMP NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "organization_admin_id" integer, "tag_admin_id" integer, "employee_id" integer, CONSTRAINT "PK_167b43717c42d48d6df7d756388" PRIMARY KEY ("verification_id"))`);
        await queryRunner.query(`ALTER TABLE "organization_admin" ADD "is_email_verified" boolean NOT NULL DEFAULT false`);
        await queryRunner.query(`ALTER TABLE "employee" ADD "is_email_verified" boolean NOT NULL DEFAULT false`);
        await queryRunner.query(`ALTER TABLE "tag_admin" ADD "is_email_verified" boolean NOT NULL DEFAULT false`);
        await queryRunner.query(`ALTER TABLE "email_verification" ADD CONSTRAINT "FK_33aa274ee46d7c7f18e776fae3e" FOREIGN KEY ("organization_admin_id") REFERENCES "organization_admin"("organization_admin_id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "email_verification" ADD CONSTRAINT "FK_3856344b296a6f98261696f75ef" FOREIGN KEY ("tag_admin_id") REFERENCES "tag_admin"("tag_admin_id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "email_verification" ADD CONSTRAINT "FK_973327e5eba7b03a6042b2947d8" FOREIGN KEY ("employee_id") REFERENCES "employee"("employee_id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "email_verification" DROP CONSTRAINT "FK_973327e5eba7b03a6042b2947d8"`);
        await queryRunner.query(`ALTER TABLE "email_verification" DROP CONSTRAINT "FK_3856344b296a6f98261696f75ef"`);
        await queryRunner.query(`ALTER TABLE "email_verification" DROP CONSTRAINT "FK_33aa274ee46d7c7f18e776fae3e"`);
        await queryRunner.query(`ALTER TABLE "tag_admin" DROP COLUMN "is_email_verified"`);
        await queryRunner.query(`ALTER TABLE "employee" DROP COLUMN "is_email_verified"`);
        await queryRunner.query(`ALTER TABLE "organization_admin" DROP COLUMN "is_email_verified"`);
        await queryRunner.query(`DROP TABLE "email_verification"`);
    }

}
