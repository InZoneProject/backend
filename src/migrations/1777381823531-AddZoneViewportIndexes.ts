import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddZoneViewportIndexes1777381823531 implements MigrationInterface {
  name = 'AddZoneViewportIndexes1777381823531';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS "IDX_zone_building_floor_viewport" ON "zone" ("building_id", "floor_id", "zone_id", "x_coordinate", "y_coordinate")',
    );
    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS "IDX_zone_building_transition_viewport" ON "zone" ("building_id", "is_transition_between_floors", "zone_id", "x_coordinate", "y_coordinate")',
    );
    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS "IDX_door_floor_zone_to" ON "door" ("floor_id", "zone_to_id")',
    );
    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS "IDX_door_floor_zone_from" ON "door" ("floor_id", "zone_from_id")',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX IF EXISTS "IDX_door_floor_zone_from"');
    await queryRunner.query('DROP INDEX IF EXISTS "IDX_door_floor_zone_to"');
    await queryRunner.query('DROP INDEX IF EXISTS "IDX_zone_building_transition_viewport"');
    await queryRunner.query('DROP INDEX IF EXISTS "IDX_zone_building_floor_viewport"');
  }
}
