import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddRfidTagAndRfidReaderName1777043362242 implements MigrationInterface {
    name = 'AddRfidTagAndRfidReaderName1777043362242';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "rfid_tag" ADD "name" character varying(100)`);
        await queryRunner.query(
            `UPDATE "rfid_tag" SET "name" = CONCAT('RFID tag #', "rfid_tag_id") WHERE "name" IS NULL`,
        );
        await queryRunner.query(`ALTER TABLE "rfid_tag" ALTER COLUMN "name" SET NOT NULL`);

        await queryRunner.query(`ALTER TABLE "rfid_reader" ADD "name" character varying(100)`);
        await queryRunner.query(
            `UPDATE "rfid_reader" SET "name" = CONCAT('RFID reader #', "rfid_reader_id") WHERE "name" IS NULL`,
        );
        await queryRunner.query(`ALTER TABLE "rfid_reader" ALTER COLUMN "name" SET NOT NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "rfid_reader" DROP COLUMN "name"`);
        await queryRunner.query(`ALTER TABLE "rfid_tag" DROP COLUMN "name"`);
    }

}
