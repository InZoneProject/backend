import { MigrationInterface, QueryRunner } from "typeorm";

export class ChangeNotificationRelations1764278526643 implements MigrationInterface {
  name = 'ChangeNotificationRelations1764278526643'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "notification" DROP CONSTRAINT IF EXISTS "FK_203543da9a28e0d7bd87e66cd20"`);
    await queryRunner.query(`ALTER TABLE "notification" DROP COLUMN IF EXISTS "organization_id"`);
    await queryRunner.query(`ALTER TABLE "notification" ADD COLUMN IF NOT EXISTS "zone_id" integer`);
    await queryRunner.query(`
            DO $$
            BEGIN
                IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'notification') THEN
                    -- Видаляємо constraint, якщо він вже є (щоб уникнути дублікатів або конфліктів)
                    ALTER TABLE "notification" DROP CONSTRAINT IF EXISTS "FK_85abd50f58d48428be58fb4fcb2";
                    -- Створюємо constraint
                    ALTER TABLE "notification" ADD CONSTRAINT "FK_85abd50f58d48428be58fb4fcb2" FOREIGN KEY ("zone_id") REFERENCES "zone"("zone_id") ON DELETE CASCADE ON UPDATE NO ACTION;
                END IF;
            END $$;
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "notification" DROP CONSTRAINT IF EXISTS "FK_85abd50f58d48428be58fb4fcb2"`);
    await queryRunner.query(`ALTER TABLE "notification" DROP COLUMN IF EXISTS "zone_id"`);
    await queryRunner.query(`ALTER TABLE "notification" ADD COLUMN IF NOT EXISTS "organization_id" integer`);
    await queryRunner.query(`
            DO $$
            BEGIN
                IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'notification') THEN
                    ALTER TABLE "notification" DROP CONSTRAINT IF EXISTS "FK_203543da9a28e0d7bd87e66cd20";
                    ALTER TABLE "notification" ADD CONSTRAINT "FK_203543da9a28e0d7bd87e66cd20" FOREIGN KEY ("organization_id") REFERENCES "organization"("organization_id") ON DELETE CASCADE ON UPDATE NO ACTION;
                END IF;
            END $$;
        `);
  }
}