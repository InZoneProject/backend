import { MigrationInterface, QueryRunner } from "typeorm";

export class AddUsedByEmployeeToInviteToken1763294311015 implements MigrationInterface {
    name = 'AddUsedByEmployeeToInviteToken1763294311015'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "invite_token" ADD "used_by_employee_id" integer`);
        await queryRunner.query(`ALTER TYPE "public"."invite_token_invite_type_enum" RENAME TO "invite_token_invite_type_enum_old"`);
        await queryRunner.query(`CREATE TYPE "public"."invite_token_invite_type_enum" AS ENUM('organization-admin-invite', 'tag-admin-invite', 'employee-invite')`);
        await queryRunner.query(`ALTER TABLE "invite_token" ALTER COLUMN "invite_type" TYPE "public"."invite_token_invite_type_enum" USING "invite_type"::"text"::"public"."invite_token_invite_type_enum"`);
        await queryRunner.query(`DROP TYPE "public"."invite_token_invite_type_enum_old"`);
        await queryRunner.query(`ALTER TABLE "invite_token" ADD CONSTRAINT "FK_e36db67429ce73e28066345bc2c" FOREIGN KEY ("used_by_employee_id") REFERENCES "employee"("employee_id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "invite_token" DROP CONSTRAINT "FK_e36db67429ce73e28066345bc2c"`);
        await queryRunner.query(`CREATE TYPE "public"."invite_token_invite_type_enum_old" AS ENUM('organization-admin-invite', 'tag-admin-invite')`);
        await queryRunner.query(`ALTER TABLE "invite_token" ALTER COLUMN "invite_type" TYPE "public"."invite_token_invite_type_enum_old" USING "invite_type"::"text"::"public"."invite_token_invite_type_enum_old"`);
        await queryRunner.query(`DROP TYPE "public"."invite_token_invite_type_enum"`);
        await queryRunner.query(`ALTER TYPE "public"."invite_token_invite_type_enum_old" RENAME TO "invite_token_invite_type_enum"`);
        await queryRunner.query(`ALTER TABLE "invite_token" DROP COLUMN "used_by_employee_id"`);
    }

}
