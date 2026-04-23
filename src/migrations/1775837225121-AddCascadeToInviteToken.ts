import { MigrationInterface, QueryRunner } from "typeorm";

export class AddCascadeToInviteToken1775837225121 implements MigrationInterface {
    name = 'AddCascadeToInviteToken1775837225121'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "invite_token" DROP CONSTRAINT "FK_e36db67429ce73e28066345bc2c"`);
        await queryRunner.query(`ALTER TABLE "invite_token" DROP CONSTRAINT "FK_94ba7e137d492d48f40f48a8cd7"`);
        await queryRunner.query(`ALTER TABLE "invite_token" DROP CONSTRAINT "FK_381a8d20adc4869d3a972cad2c4"`);
        await queryRunner.query(`ALTER TABLE "invite_token" ADD CONSTRAINT "FK_381a8d20adc4869d3a972cad2c4" FOREIGN KEY ("used_by_organization_admin_id") REFERENCES "organization_admin"("organization_admin_id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "invite_token" ADD CONSTRAINT "FK_94ba7e137d492d48f40f48a8cd7" FOREIGN KEY ("used_by_tag_admin_id") REFERENCES "tag_admin"("tag_admin_id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "invite_token" ADD CONSTRAINT "FK_e36db67429ce73e28066345bc2c" FOREIGN KEY ("used_by_employee_id") REFERENCES "employee"("employee_id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "invite_token" DROP CONSTRAINT "FK_e36db67429ce73e28066345bc2c"`);
        await queryRunner.query(`ALTER TABLE "invite_token" DROP CONSTRAINT "FK_94ba7e137d492d48f40f48a8cd7"`);
        await queryRunner.query(`ALTER TABLE "invite_token" DROP CONSTRAINT "FK_381a8d20adc4869d3a972cad2c4"`);
        await queryRunner.query(`ALTER TABLE "invite_token" ADD CONSTRAINT "FK_381a8d20adc4869d3a972cad2c4" FOREIGN KEY ("used_by_organization_admin_id") REFERENCES "organization_admin"("organization_admin_id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "invite_token" ADD CONSTRAINT "FK_94ba7e137d492d48f40f48a8cd7" FOREIGN KEY ("used_by_tag_admin_id") REFERENCES "tag_admin"("tag_admin_id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "invite_token" ADD CONSTRAINT "FK_e36db67429ce73e28066345bc2c" FOREIGN KEY ("used_by_employee_id") REFERENCES "employee"("employee_id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

}
