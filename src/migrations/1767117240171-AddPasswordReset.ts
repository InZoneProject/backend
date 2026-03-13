import { MigrationInterface, QueryRunner } from "typeorm";

export class AddPasswordReset1767117240171 implements MigrationInterface {
    name = 'AddPasswordReset1767117240171'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "password_reset" ("password_reset_id" SERIAL NOT NULL, "token_hashed" character varying NOT NULL, "expires_at" TIMESTAMP NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "organization_admin_id" integer, "tag_admin_id" integer, "employee_id" integer, CONSTRAINT "PK_d20b7bc04d484a8ca751c69d831" PRIMARY KEY ("password_reset_id"))`);
        await queryRunner.query(`ALTER TABLE "password_reset" ADD CONSTRAINT "FK_a15f115ee2ffd90cc7a9df77e8a" FOREIGN KEY ("organization_admin_id") REFERENCES "organization_admin"("organization_admin_id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "password_reset" ADD CONSTRAINT "FK_5e84c1ce4007da050b8143324d9" FOREIGN KEY ("tag_admin_id") REFERENCES "tag_admin"("tag_admin_id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "password_reset" ADD CONSTRAINT "FK_a94b633240c65be7934f42eb0c7" FOREIGN KEY ("employee_id") REFERENCES "employee"("employee_id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "password_reset" DROP CONSTRAINT "FK_a94b633240c65be7934f42eb0c7"`);
        await queryRunner.query(`ALTER TABLE "password_reset" DROP CONSTRAINT "FK_5e84c1ce4007da050b8143324d9"`);
        await queryRunner.query(`ALTER TABLE "password_reset" DROP CONSTRAINT "FK_a15f115ee2ffd90cc7a9df77e8a"`);
        await queryRunner.query(`DROP TABLE "password_reset"`);
    }

}
