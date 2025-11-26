import { MigrationInterface, QueryRunner } from "typeorm";

export class AddOrganizationToNotification1764111079659 implements MigrationInterface {
    name = 'AddOrganizationToNotification1764111079659'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "notification" ADD "organization_id" integer`);
        await queryRunner.query(`ALTER TABLE "notification" ADD CONSTRAINT "FK_203543da9a28e0d7bd87e66cd20" FOREIGN KEY ("organization_id") REFERENCES "organization"("organization_id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "notification" DROP CONSTRAINT "FK_203543da9a28e0d7bd87e66cd20"`);
        await queryRunner.query(`ALTER TABLE "notification" DROP COLUMN "organization_id"`);
    }

}
