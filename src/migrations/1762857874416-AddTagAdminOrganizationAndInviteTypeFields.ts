import { MigrationInterface, QueryRunner } from "typeorm";

export class AddTagAdminOrganizationAndInviteTypeFields1762857874416 implements MigrationInterface {
    name = 'AddTagAdminOrganizationAndInviteTypeFields1762857874416'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "invite_token" DROP CONSTRAINT "FK_10fe4e300dd50175dbfaddfc093"`);
        await queryRunner.query(`ALTER TABLE "invite_token" DROP COLUMN "used_by"`);
        await queryRunner.query(`ALTER TABLE "tag_admin" ADD "organization_id" integer`);
        await queryRunner.query(`CREATE TYPE "public"."invite_token_invite_type_enum" AS ENUM('organization-admin-invite', 'tag-admin-invite')`);
        await queryRunner.query(`ALTER TABLE "invite_token" ADD "invite_type" "public"."invite_token_invite_type_enum" NOT NULL`);
        await queryRunner.query(`ALTER TABLE "invite_token" ADD "organization_id" integer`);
        await queryRunner.query(`ALTER TABLE "invite_token" ADD "used_by_organization_admin_id" integer`);
        await queryRunner.query(`ALTER TABLE "invite_token" ADD "used_by_tag_admin_id" integer`);
        await queryRunner.query(`ALTER TABLE "tag_admin" ADD CONSTRAINT "FK_1387c68e9f023ef5412c71f793e" FOREIGN KEY ("organization_id") REFERENCES "organization"("organization_id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "invite_token" ADD CONSTRAINT "FK_489bf9886e6686cab9f77846499" FOREIGN KEY ("organization_id") REFERENCES "organization"("organization_id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "invite_token" ADD CONSTRAINT "FK_381a8d20adc4869d3a972cad2c4" FOREIGN KEY ("used_by_organization_admin_id") REFERENCES "organization_admin"("organization_admin_id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "invite_token" ADD CONSTRAINT "FK_94ba7e137d492d48f40f48a8cd7" FOREIGN KEY ("used_by_tag_admin_id") REFERENCES "tag_admin"("tag_admin_id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "invite_token" DROP CONSTRAINT "FK_94ba7e137d492d48f40f48a8cd7"`);
        await queryRunner.query(`ALTER TABLE "invite_token" DROP CONSTRAINT "FK_381a8d20adc4869d3a972cad2c4"`);
        await queryRunner.query(`ALTER TABLE "invite_token" DROP CONSTRAINT "FK_489bf9886e6686cab9f77846499"`);
        await queryRunner.query(`ALTER TABLE "tag_admin" DROP CONSTRAINT "FK_1387c68e9f023ef5412c71f793e"`);
        await queryRunner.query(`ALTER TABLE "invite_token" DROP COLUMN "used_by_tag_admin_id"`);
        await queryRunner.query(`ALTER TABLE "invite_token" DROP COLUMN "used_by_organization_admin_id"`);
        await queryRunner.query(`ALTER TABLE "invite_token" DROP COLUMN "organization_id"`);
        await queryRunner.query(`ALTER TABLE "invite_token" DROP COLUMN "invite_type"`);
        await queryRunner.query(`DROP TYPE "public"."invite_token_invite_type_enum"`);
        await queryRunner.query(`ALTER TABLE "tag_admin" DROP COLUMN "organization_id"`);
        await queryRunner.query(`ALTER TABLE "invite_token" ADD "used_by" integer`);
        await queryRunner.query(`ALTER TABLE "invite_token" ADD CONSTRAINT "FK_10fe4e300dd50175dbfaddfc093" FOREIGN KEY ("used_by") REFERENCES "organization_admin"("organization_admin_id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

}
