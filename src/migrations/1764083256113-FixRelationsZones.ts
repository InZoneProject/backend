import { MigrationInterface, QueryRunner } from "typeorm";

export class FixRelationsZones1764083256113 implements MigrationInterface {
    name = 'FixRelationsZones1764083256113'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "zone_positions_position" ("zoneZoneId" integer NOT NULL, "positionPositionId" integer NOT NULL, CONSTRAINT "PK_bbc8d5154c58d87f67303e5e5a4" PRIMARY KEY ("zoneZoneId", "positionPositionId"))`);
        await queryRunner.query(`CREATE INDEX "IDX_84b0cbd8bd3c5ac893fe65ea12" ON "zone_positions_position" ("zoneZoneId") `);
        await queryRunner.query(`CREATE INDEX "IDX_15b6de26aa24a3b03393b56c24" ON "zone_positions_position" ("positionPositionId") `);
        await queryRunner.query(`ALTER TABLE "zone_positions_position" ADD CONSTRAINT "FK_84b0cbd8bd3c5ac893fe65ea124" FOREIGN KEY ("zoneZoneId") REFERENCES "zone"("zone_id") ON DELETE CASCADE ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE "zone_positions_position" ADD CONSTRAINT "FK_15b6de26aa24a3b03393b56c24f" FOREIGN KEY ("positionPositionId") REFERENCES "position"("position_id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "zone_positions_position" DROP CONSTRAINT "FK_15b6de26aa24a3b03393b56c24f"`);
        await queryRunner.query(`ALTER TABLE "zone_positions_position" DROP CONSTRAINT "FK_84b0cbd8bd3c5ac893fe65ea124"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_15b6de26aa24a3b03393b56c24"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_84b0cbd8bd3c5ac893fe65ea12"`);
        await queryRunner.query(`DROP TABLE "zone_positions_position"`);
    }

}
