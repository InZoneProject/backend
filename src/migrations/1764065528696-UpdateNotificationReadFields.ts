import { MigrationInterface, QueryRunner } from "typeorm";

export class UpdateNotificationReadFields1764065528696 implements MigrationInterface {
    name = 'UpdateNotificationReadFields1764065528696'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "notification" DROP COLUMN "is_read"`);
        await queryRunner.query(`ALTER TABLE "notification" ADD "is_read_by_employee" boolean NOT NULL DEFAULT false`);
        await queryRunner.query(`ALTER TABLE "notification" ADD "is_read_by_org_admin" boolean NOT NULL DEFAULT false`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "notification" DROP COLUMN "is_read_by_org_admin"`);
        await queryRunner.query(`ALTER TABLE "notification" DROP COLUMN "is_read_by_employee"`);
        await queryRunner.query(`ALTER TABLE "notification" ADD "is_read" boolean NOT NULL DEFAULT false`);
    }

}
