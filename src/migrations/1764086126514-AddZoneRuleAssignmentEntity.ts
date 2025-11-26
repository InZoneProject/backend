import { MigrationInterface, QueryRunner } from "typeorm";

export class AddZoneRuleAssignmentEntity1764086126514 implements MigrationInterface {
    name = 'AddZoneRuleAssignmentEntity1764086126514'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "zone_rule_assignment" ("zone_rule_assignment_id" SERIAL NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "zone_id" integer, "zone_access_rule_id" integer, CONSTRAINT "UQ_ea7a22878d9fbb9b7fd25a1ba66" UNIQUE ("zone_id", "zone_access_rule_id"), CONSTRAINT "PK_25b455161288fddb0b9eb3c75e1" PRIMARY KEY ("zone_rule_assignment_id"))`);
        await queryRunner.query(`CREATE TABLE "zone_rule_assignment_positions_position" ("zoneRuleAssignmentZoneRuleAssignmentId" integer NOT NULL, "positionPositionId" integer NOT NULL, CONSTRAINT "PK_d951f25985bf5df2062c59e944d" PRIMARY KEY ("zoneRuleAssignmentZoneRuleAssignmentId", "positionPositionId"))`);
        await queryRunner.query(`CREATE INDEX "IDX_ef249d98718ad2d7549e07f48c" ON "zone_rule_assignment_positions_position" ("zoneRuleAssignmentZoneRuleAssignmentId") `);
        await queryRunner.query(`CREATE INDEX "IDX_cac7aa83fd876bb305cc551ada" ON "zone_rule_assignment_positions_position" ("positionPositionId") `);
        await queryRunner.query(`ALTER TABLE "zone_rule_assignment" ADD CONSTRAINT "FK_7fa25a869033f54560f52ad0c98" FOREIGN KEY ("zone_id") REFERENCES "zone"("zone_id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "zone_rule_assignment" ADD CONSTRAINT "FK_6cf478b7006c54b6784da828ba6" FOREIGN KEY ("zone_access_rule_id") REFERENCES "zone_access_rule"("zone_access_rule_id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "zone_rule_assignment_positions_position" ADD CONSTRAINT "FK_ef249d98718ad2d7549e07f48c8" FOREIGN KEY ("zoneRuleAssignmentZoneRuleAssignmentId") REFERENCES "zone_rule_assignment"("zone_rule_assignment_id") ON DELETE CASCADE ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE "zone_rule_assignment_positions_position" ADD CONSTRAINT "FK_cac7aa83fd876bb305cc551ada3" FOREIGN KEY ("positionPositionId") REFERENCES "position"("position_id") ON DELETE CASCADE ON UPDATE CASCADE`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "zone_rule_assignment_positions_position" DROP CONSTRAINT "FK_cac7aa83fd876bb305cc551ada3"`);
        await queryRunner.query(`ALTER TABLE "zone_rule_assignment_positions_position" DROP CONSTRAINT "FK_ef249d98718ad2d7549e07f48c8"`);
        await queryRunner.query(`ALTER TABLE "zone_rule_assignment" DROP CONSTRAINT "FK_6cf478b7006c54b6784da828ba6"`);
        await queryRunner.query(`ALTER TABLE "zone_rule_assignment" DROP CONSTRAINT "FK_7fa25a869033f54560f52ad0c98"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_cac7aa83fd876bb305cc551ada"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_ef249d98718ad2d7549e07f48c"`);
        await queryRunner.query(`DROP TABLE "zone_rule_assignment_positions_position"`);
        await queryRunner.query(`DROP TABLE "zone_rule_assignment"`);
    }

}
