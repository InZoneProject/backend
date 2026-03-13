import { MigrationInterface, QueryRunner } from 'typeorm';

export class DropUnusedZoneAccessRuleJoinTables1773411758000
  implements MigrationInterface
{
  name = 'DropUnusedZoneAccessRuleJoinTables1773411758000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'DROP TABLE IF EXISTS "zone_access_rule_zones_zone"',
    );
    await queryRunner.query(
      'DROP TABLE IF EXISTS "zone_zone_access_rules_zone_access_rule"',
    );
    await queryRunner.query(
      'DROP TABLE IF EXISTS "position_zone_access_rules_zone_access_rule"',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'CREATE TABLE "zone_access_rule_zones_zone" ("zoneAccessRuleZoneAccessRuleId" integer NOT NULL, "zoneZoneId" integer NOT NULL, CONSTRAINT "PK_zone_access_rule_zones_zone" PRIMARY KEY ("zoneAccessRuleZoneAccessRuleId", "zoneZoneId"))',
    );
    await queryRunner.query(
      'CREATE INDEX "IDX_zone_access_rule_zones_zone_rule" ON "zone_access_rule_zones_zone" ("zoneAccessRuleZoneAccessRuleId")',
    );
    await queryRunner.query(
      'CREATE INDEX "IDX_zone_access_rule_zones_zone_zone" ON "zone_access_rule_zones_zone" ("zoneZoneId")',
    );
    await queryRunner.query(
      'ALTER TABLE "zone_access_rule_zones_zone" ADD CONSTRAINT "FK_zone_access_rule_zones_zone_rule" FOREIGN KEY ("zoneAccessRuleZoneAccessRuleId") REFERENCES "zone_access_rule"("zone_access_rule_id") ON DELETE CASCADE ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "zone_access_rule_zones_zone" ADD CONSTRAINT "FK_zone_access_rule_zones_zone_zone" FOREIGN KEY ("zoneZoneId") REFERENCES "zone"("zone_id") ON DELETE CASCADE ON UPDATE NO ACTION',
    );

    await queryRunner.query(
      'CREATE TABLE "zone_zone_access_rules_zone_access_rule" ("zoneZoneId" integer NOT NULL, "zoneAccessRuleZoneAccessRuleId" integer NOT NULL, CONSTRAINT "PK_zone_zone_access_rules_zone_access_rule" PRIMARY KEY ("zoneZoneId", "zoneAccessRuleZoneAccessRuleId"))',
    );
    await queryRunner.query(
      'CREATE INDEX "IDX_zone_zone_access_rules_zone_zone" ON "zone_zone_access_rules_zone_access_rule" ("zoneZoneId")',
    );
    await queryRunner.query(
      'CREATE INDEX "IDX_zone_zone_access_rules_zone_rule" ON "zone_zone_access_rules_zone_access_rule" ("zoneAccessRuleZoneAccessRuleId")',
    );
    await queryRunner.query(
      'ALTER TABLE "zone_zone_access_rules_zone_access_rule" ADD CONSTRAINT "FK_zone_zone_access_rules_zone_zone" FOREIGN KEY ("zoneZoneId") REFERENCES "zone"("zone_id") ON DELETE CASCADE ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "zone_zone_access_rules_zone_access_rule" ADD CONSTRAINT "FK_zone_zone_access_rules_zone_rule" FOREIGN KEY ("zoneAccessRuleZoneAccessRuleId") REFERENCES "zone_access_rule"("zone_access_rule_id") ON DELETE CASCADE ON UPDATE NO ACTION',
    );

    await queryRunner.query(
      'CREATE TABLE IF NOT EXISTS "position_zone_access_rules_zone_access_rule" ("positionPositionId" integer NOT NULL, "zoneAccessRuleZoneAccessRuleId" integer NOT NULL, CONSTRAINT "PK_479f0c771a0dc6baea22c938b52" PRIMARY KEY ("positionPositionId", "zoneAccessRuleZoneAccessRuleId"))',
    );
    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS "IDX_a17a181ae32931fde2bc51e1c2" ON "position_zone_access_rules_zone_access_rule" ("positionPositionId")',
    );
    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS "IDX_c79196878bae6a4f4ad9dbb2b7" ON "position_zone_access_rules_zone_access_rule" ("zoneAccessRuleZoneAccessRuleId")',
    );
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'FK_a17a181ae32931fde2bc51e1c25'
        ) THEN
          ALTER TABLE "position_zone_access_rules_zone_access_rule"
          ADD CONSTRAINT "FK_a17a181ae32931fde2bc51e1c25"
          FOREIGN KEY ("positionPositionId") REFERENCES "position"("position_id")
          ON DELETE CASCADE ON UPDATE CASCADE;
        END IF;
      END $$;
    `);
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'FK_c79196878bae6a4f4ad9dbb2b71'
        ) THEN
          ALTER TABLE "position_zone_access_rules_zone_access_rule"
          ADD CONSTRAINT "FK_c79196878bae6a4f4ad9dbb2b71"
          FOREIGN KEY ("zoneAccessRuleZoneAccessRuleId") REFERENCES "zone_access_rule"("zone_access_rule_id")
          ON DELETE CASCADE ON UPDATE CASCADE;
        END IF;
      END $$;
    `);
  }
}
