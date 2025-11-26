import { MigrationInterface, QueryRunner } from "typeorm";

export class AddOrganizationToZoneAccessRule1764075231038 implements MigrationInterface {
    name = 'AddOrganizationToZoneAccessRule1764075231038'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "zone_access_rule" ADD "organization_id" integer`);
        await queryRunner.query(`ALTER TABLE "zone_access_rule" ADD CONSTRAINT "FK_d49aae7e0e1f73b0f6d2600e1d1" FOREIGN KEY ("organization_id") REFERENCES "organization"("organization_id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "zone_access_rule" DROP CONSTRAINT "FK_d49aae7e0e1f73b0f6d2600e1d1"`);
        await queryRunner.query(`ALTER TABLE "zone_access_rule" DROP COLUMN "organization_id"`);
    }

}
