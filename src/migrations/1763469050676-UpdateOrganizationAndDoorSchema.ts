import { MigrationInterface, QueryRunner } from "typeorm";

export class UpdateOrganizationAndDoorSchema1763469050676 implements MigrationInterface {
    name = 'UpdateOrganizationAndDoorSchema1763469050676'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "invite_token" DROP CONSTRAINT "FK_489bf9886e6686cab9f77846499"`);
        await queryRunner.query(`ALTER TABLE "organization" DROP COLUMN "work_day_start_time"`);
        await queryRunner.query(`ALTER TABLE "organization" DROP COLUMN "work_day_end_time"`);
        await queryRunner.query(`CREATE TYPE "public"."door_entrance_door_side_enum" AS ENUM('top', 'bottom', 'left', 'right')`);
        await queryRunner.query(`ALTER TABLE "door" ADD "entrance_door_side" "public"."door_entrance_door_side_enum"`);
        await queryRunner.query(`ALTER TABLE "invite_token" ADD CONSTRAINT "FK_489bf9886e6686cab9f77846499" FOREIGN KEY ("organization_id") REFERENCES "organization"("organization_id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "invite_token" DROP CONSTRAINT "FK_489bf9886e6686cab9f77846499"`);
        await queryRunner.query(`ALTER TABLE "door" DROP COLUMN "entrance_door_side"`);
        await queryRunner.query(`DROP TYPE "public"."door_entrance_door_side_enum"`);
        await queryRunner.query(`ALTER TABLE "organization" ADD "work_day_end_time" TIME NOT NULL`);
        await queryRunner.query(`ALTER TABLE "organization" ADD "work_day_start_time" TIME NOT NULL`);
        await queryRunner.query(`ALTER TABLE "invite_token" ADD CONSTRAINT "FK_489bf9886e6686cab9f77846499" FOREIGN KEY ("organization_id") REFERENCES "organization"("organization_id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

}
