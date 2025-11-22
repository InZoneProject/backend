import { MigrationInterface, QueryRunner } from "typeorm";

export class UpdateZoneDefaults1763576724697 implements MigrationInterface {
    name = 'UpdateZoneDefaults1763576724697'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "zone" ALTER COLUMN "title" SET DEFAULT 'Нова зона'`);
        await queryRunner.query(`ALTER TABLE "zone" ALTER COLUMN "photo" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "zone" ALTER COLUMN "x_coordinate" SET DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE "zone" ALTER COLUMN "y_coordinate" SET DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE "floor" ALTER COLUMN "floor_number" SET DEFAULT '1'`);
        await queryRunner.query(`ALTER TABLE "building" ALTER COLUMN "title" SET DEFAULT 'Нова будівля'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "building" ALTER COLUMN "title" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "floor" ALTER COLUMN "floor_number" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "zone" ALTER COLUMN "y_coordinate" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "zone" ALTER COLUMN "x_coordinate" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "zone" ALTER COLUMN "photo" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "zone" ALTER COLUMN "title" DROP DEFAULT`);
    }

}
