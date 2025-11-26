import { MigrationInterface, QueryRunner } from "typeorm";

export class DeleteAccessTypeAllowed1764001330781 implements MigrationInterface {
    name = 'DeleteAccessTypeAllowed1764001330781'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TYPE "public"."zone_access_rule_access_type_enum" RENAME TO "zone_access_rule_access_type_enum_old"`);
        await queryRunner.query(`CREATE TYPE "public"."zone_access_rule_access_type_enum" AS ENUM('TIME_LIMITED', 'FORBIDDEN')`);
        await queryRunner.query(`ALTER TABLE "zone_access_rule" ALTER COLUMN "access_type" TYPE "public"."zone_access_rule_access_type_enum" USING "access_type"::"text"::"public"."zone_access_rule_access_type_enum"`);
        await queryRunner.query(`DROP TYPE "public"."zone_access_rule_access_type_enum_old"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."zone_access_rule_access_type_enum_old" AS ENUM('ALLOWED', 'TIME_LIMITED', 'FORBIDDEN')`);
        await queryRunner.query(`ALTER TABLE "zone_access_rule" ALTER COLUMN "access_type" TYPE "public"."zone_access_rule_access_type_enum_old" USING "access_type"::"text"::"public"."zone_access_rule_access_type_enum_old"`);
        await queryRunner.query(`DROP TYPE "public"."zone_access_rule_access_type_enum"`);
        await queryRunner.query(`ALTER TYPE "public"."zone_access_rule_access_type_enum_old" RENAME TO "zone_access_rule_access_type_enum"`);
    }

}
