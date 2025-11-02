import { MigrationInterface, QueryRunner } from "typeorm";

export class UpdateDoorAndAdminEntities1762076645079 implements MigrationInterface {
    name = 'UpdateDoorAndAdminEntities1762076645079'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "door" ADD "is_entrance" boolean NOT NULL DEFAULT false`);
        await queryRunner.query(`ALTER TABLE "organization_admin" ALTER COLUMN "password" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "tag_admin" ALTER COLUMN "password" SET NOT NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "tag_admin" ALTER COLUMN "password" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "organization_admin" ALTER COLUMN "password" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "door" DROP COLUMN "is_entrance"`);
    }

}
