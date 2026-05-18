import { MigrationInterface, QueryRunner } from "typeorm";

export class AddFloorName1777381823530 implements MigrationInterface {
    name = 'AddFloorName1777381823530'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "floor" ADD "floor_name" character varying(100)`);
        await queryRunner.query(`UPDATE "floor" SET "floor_name" = 'Новий поверх' WHERE "floor_name" IS NULL`);
        await queryRunner.query(`ALTER TABLE "floor" ALTER COLUMN "floor_name" SET NOT NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "floor" DROP COLUMN "floor_name"`);
    }

}
