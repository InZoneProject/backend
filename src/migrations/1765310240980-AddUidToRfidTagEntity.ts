import { MigrationInterface, QueryRunner } from "typeorm";

export class AddUidToRfidTagEntity1765310240980 implements MigrationInterface {
    name = 'AddUidToRfidTagEntity1765310240980'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "rfid_tag" ADD "tag_uid" integer NOT NULL`);
        await queryRunner.query(`ALTER TABLE "rfid_tag" ADD CONSTRAINT "UQ_21368319f5cd14c9efbf8d2bd41" UNIQUE ("tag_uid")`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "rfid_tag" DROP CONSTRAINT "UQ_21368319f5cd14c9efbf8d2bd41"`);
        await queryRunner.query(`ALTER TABLE "rfid_tag" DROP COLUMN "tag_uid"`);
    }

}
