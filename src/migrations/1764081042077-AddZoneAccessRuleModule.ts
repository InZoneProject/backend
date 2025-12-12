import { MigrationInterface, QueryRunner } from "typeorm";

export class AddZoneAccessRuleModule1764081042077 implements MigrationInterface {
  name = 'AddZoneAccessRuleModule1764081042077'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE IF EXISTS "zone_access_rule_positions_position" DROP CONSTRAINT IF EXISTS "FK_fabbe221497a12eb41954618889"`);

    await queryRunner.query(`CREATE TABLE IF NOT EXISTS "zone_access_rule_zones_zone" ("zoneAccessRuleZoneAccessRuleId" integer NOT NULL, "zoneZoneId" integer NOT NULL, CONSTRAINT "PK_e8be57d3fdd193a0fdfb7f3e771" PRIMARY KEY ("zoneAccessRuleZoneAccessRuleId", "zoneZoneId"))`);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_b184b7563f63f02754aa5b5ae5" ON "zone_access_rule_zones_zone" ("zoneAccessRuleZoneAccessRuleId") `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_921b2079cd2a6d2d1c3e1b43bc" ON "zone_access_rule_zones_zone" ("zoneZoneId") `);

    await queryRunner.query(`
            DO $$
            BEGIN
                IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'zone_access_rule_zones_zone') THEN
                    ALTER TABLE "zone_access_rule_zones_zone" DROP CONSTRAINT IF EXISTS "FK_b184b7563f63f02754aa5b5ae54";
                    ALTER TABLE "zone_access_rule_zones_zone" ADD CONSTRAINT "FK_b184b7563f63f02754aa5b5ae54" FOREIGN KEY ("zoneAccessRuleZoneAccessRuleId") REFERENCES "zone_access_rule"("zone_access_rule_id") ON DELETE CASCADE ON UPDATE CASCADE;
                    
                    ALTER TABLE "zone_access_rule_zones_zone" DROP CONSTRAINT IF EXISTS "FK_921b2079cd2a6d2d1c3e1b43bc9";
                    ALTER TABLE "zone_access_rule_zones_zone" ADD CONSTRAINT "FK_921b2079cd2a6d2d1c3e1b43bc9" FOREIGN KEY ("zoneZoneId") REFERENCES "zone"("zone_id") ON DELETE NO ACTION ON UPDATE NO ACTION;
                END IF;
            END $$;
        `);

    await queryRunner.query(`
            DO $$
            BEGIN
                IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'zone_access_rule_positions_position') THEN
                    ALTER TABLE "zone_access_rule_positions_position" DROP CONSTRAINT IF EXISTS "FK_fabbe221497a12eb41954618889";
                    ALTER TABLE "zone_access_rule_positions_position" ADD CONSTRAINT "FK_fabbe221497a12eb41954618889" FOREIGN KEY ("positionPositionId") REFERENCES "position"("position_id") ON DELETE NO ACTION ON UPDATE NO ACTION;
                END IF;
            END $$;
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE IF EXISTS "zone_access_rule_positions_position" DROP CONSTRAINT IF EXISTS "FK_fabbe221497a12eb41954618889"`);

    await queryRunner.query(`ALTER TABLE IF EXISTS "zone_access_rule_zones_zone" DROP CONSTRAINT IF EXISTS "FK_921b2079cd2a6d2d1c3e1b43bc9"`);
    await queryRunner.query(`ALTER TABLE IF EXISTS "zone_access_rule_zones_zone" DROP CONSTRAINT IF EXISTS "FK_b184b7563f63f02754aa5b5ae54"`);

    await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_921b2079cd2a6d2d1c3e1b43bc"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_b184b7563f63f02754aa5b5ae5"`);

    await queryRunner.query(`DROP TABLE IF EXISTS "zone_access_rule_zones_zone"`);

    await queryRunner.query(`
            DO $$
            BEGIN
                IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'zone_access_rule_positions_position') THEN
                    ALTER TABLE "zone_access_rule_positions_position" ADD CONSTRAINT "FK_fabbe221497a12eb41954618889" FOREIGN KEY ("positionPositionId") REFERENCES "position"("position_id") ON DELETE CASCADE ON UPDATE CASCADE;
                END IF;
            END $$;
        `);
  }
}