import { MigrationInterface, QueryRunner } from "typeorm";

export class ChangeNotificationRelations1764278526643 implements MigrationInterface {
    name = 'ChangeNotificationRelations1764278526643'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "notification" DROP CONSTRAINT "FK_203543da9a28e0d7bd87e66cd20"`);
        await queryRunner.query(`ALTER TABLE "notification" DROP COLUMN "organization_id"`);
        await queryRunner.query(`ALTER TABLE "notification" ADD CONSTRAINT "FK_85abd50f58d48428be58fb4fcb2" FOREIGN KEY ("zone_id") REFERENCES "zone"("zone_id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "notification" DROP CONSTRAINT "FK_85abd50f58d48428be58fb4fcb2"`);
        await queryRunner.query(`ALTER TABLE "notification" ADD "organization_id" integer`);
        await queryRunner.query(`ALTER TABLE "notification" ADD CONSTRAINT "FK_203543da9a28e0d7bd87e66cd20" FOREIGN KEY ("organization_id") REFERENCES "organization"("organization_id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

}
