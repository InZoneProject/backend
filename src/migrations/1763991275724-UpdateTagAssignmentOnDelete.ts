import { MigrationInterface, QueryRunner } from "typeorm";

export class UpdateTagAssignmentOnDelete1763991275724 implements MigrationInterface {
    name = 'UpdateTagAssignmentOnDelete1763991275724'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "tag_assignment" DROP CONSTRAINT "FK_ca91bd1ff82a7272c50e307d299"`);
        await queryRunner.query(`ALTER TABLE "tag_assignment" ADD CONSTRAINT "FK_ca91bd1ff82a7272c50e307d299" FOREIGN KEY ("employee_id") REFERENCES "employee"("employee_id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "tag_assignment" DROP CONSTRAINT "FK_ca91bd1ff82a7272c50e307d299"`);
        await queryRunner.query(`ALTER TABLE "tag_assignment" ADD CONSTRAINT "FK_ca91bd1ff82a7272c50e307d299" FOREIGN KEY ("employee_id") REFERENCES "employee"("employee_id") ON DELETE SET NULL ON UPDATE NO ACTION`);
    }

}
