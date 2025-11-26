import { MigrationInterface, QueryRunner } from "typeorm";

export class AddOrganizationToRfidReader1763852949505 implements MigrationInterface {
    name = 'AddOrganizationToRfidReader1763852949505'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "rfid_reader" ADD "organization_id" integer`);
        await queryRunner.query(`ALTER TABLE "rfid_reader" ADD CONSTRAINT "FK_99151131434cd327da39e380f17" FOREIGN KEY ("organization_id") REFERENCES "organization"("organization_id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "rfid_reader" DROP CONSTRAINT "FK_99151131434cd327da39e380f17"`);
        await queryRunner.query(`ALTER TABLE "rfid_reader" DROP COLUMN "organization_id"`);
    }

}
