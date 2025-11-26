import { MigrationInterface, QueryRunner } from "typeorm";

export class UpdateTagAssignmentLogicAndOptimizeDTOs1763912032720 implements MigrationInterface {
    name = 'UpdateTagAssignmentLogicAndOptimizeDTOs1763912032720'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "rfid_tag" DROP CONSTRAINT "UQ_767de4969f4fd7bf6fa7a73a599"`);
        await queryRunner.query(`ALTER TABLE "rfid_tag" DROP COLUMN "serial_id"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "rfid_tag" ADD "serial_id" integer NOT NULL`);
        await queryRunner.query(`ALTER TABLE "rfid_tag" ADD CONSTRAINT "UQ_767de4969f4fd7bf6fa7a73a599" UNIQUE ("serial_id")`);
    }

}
