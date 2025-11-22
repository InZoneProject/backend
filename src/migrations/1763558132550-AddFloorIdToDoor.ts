import { MigrationInterface, QueryRunner } from "typeorm";

export class AddFloorIdToDoor1763558132550 implements MigrationInterface {
    name = 'AddFloorIdToDoor1763558132550'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "door" ADD "floor_id" integer`);
        await queryRunner.query(`ALTER TABLE "door" ADD CONSTRAINT "FK_c2395fa50ffc47c329da9ae364a" FOREIGN KEY ("floor_id") REFERENCES "floor"("floor_id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "door" DROP CONSTRAINT "FK_c2395fa50ffc47c329da9ae364a"`);
        await queryRunner.query(`ALTER TABLE "door" DROP COLUMN "floor_id"`);
    }

}
