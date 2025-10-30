import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialSchema1761835150243 implements MigrationInterface {
    name = 'InitialSchema1761835150243'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "global_admin" ("global_admin_id" SERIAL NOT NULL, "email" character varying(100) NOT NULL, "password" character varying(500) NOT NULL, CONSTRAINT "UQ_d7866d29c43fa5950465e5fe910" UNIQUE ("email"), CONSTRAINT "PK_1c05004a86c210ac5728ed49b37" PRIMARY KEY ("global_admin_id"))`);
        await queryRunner.query(`CREATE TABLE "notification" ("notification_id" SERIAL NOT NULL, "title" character varying(100) NOT NULL, "message" character varying(500) NOT NULL, "is_read" boolean NOT NULL DEFAULT false, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "employeeEmployeeId" integer, CONSTRAINT "PK_fc4db99eb33f32cea47c5b6a39c" PRIMARY KEY ("notification_id"))`);
        await queryRunner.query(`CREATE TYPE "public"."zone_access_rule_access_type_enum" AS ENUM('ALLOWED', 'TIME_LIMITED', 'FORBIDDEN')`);
        await queryRunner.query(`CREATE TABLE "zone_access_rule" ("zone_access_rule_id" SERIAL NOT NULL, "title" character varying(100) NOT NULL, "access_type" "public"."zone_access_rule_access_type_enum" NOT NULL, "max_duration_minutes" integer, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_1cdbc803799f00389e23ea0f4b3" PRIMARY KEY ("zone_access_rule_id"))`);
        await queryRunner.query(`CREATE TABLE "rfid_reader" ("rfid_reader_id" SERIAL NOT NULL, "secret_token" character varying(200) NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_64f1b377bf5b90d0e3f5a5012b5" PRIMARY KEY ("rfid_reader_id"))`);
        await queryRunner.query(`CREATE TABLE "scan_event" ("scan_event_id" SERIAL NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "rfidTagRfidTagId" integer, "rfidReaderRfidReaderId" integer, CONSTRAINT "PK_12e23d1fd55b4d1a8c7861a7b07" PRIMARY KEY ("scan_event_id"))`);
        await queryRunner.query(`CREATE TABLE "rfid_tag" ("rfid_tag_id" SERIAL NOT NULL, "serial_id" integer NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "organizationOrganizationId" integer, CONSTRAINT "UQ_767de4969f4fd7bf6fa7a73a599" UNIQUE ("serial_id"), CONSTRAINT "PK_7500f504fe9646fff4b78b8d15c" PRIMARY KEY ("rfid_tag_id"))`);
        await queryRunner.query(`CREATE TABLE "organization_admin" ("organization_admin_id" SERIAL NOT NULL, "full_name" character varying(100) NOT NULL, "email" character varying(100) NOT NULL, "password" character varying(500), "phone" character varying(50), "photo" character varying(1000), "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_fbb730f1fb8371e0f383f9fc13f" UNIQUE ("email"), CONSTRAINT "PK_8dc8743d54d9f9c2053f21f3121" PRIMARY KEY ("organization_admin_id"))`);
        await queryRunner.query(`CREATE TABLE "door" ("door_id" SERIAL NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "rfidReaderRfidReaderId" integer, "zoneFromZoneId" integer, "zoneToZoneId" integer, CONSTRAINT "REL_b469c833550195a4f46dc01d6f" UNIQUE ("rfidReaderRfidReaderId"), CONSTRAINT "PK_182379ee7c8d6c567f5ec481e0f" PRIMARY KEY ("door_id"))`);
        await queryRunner.query(`CREATE TABLE "zone" ("zone_id" SERIAL NOT NULL, "title" character varying(100) NOT NULL, "is_transition_between_floors" boolean NOT NULL DEFAULT false, "width" integer NOT NULL DEFAULT '10', "height" integer NOT NULL DEFAULT '10', "photo" character varying(1000) NOT NULL, "x_coordinate" integer NOT NULL, "y_coordinate" integer NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "floorFloorId" integer, "buildingBuildingId" integer, CONSTRAINT "PK_b87da63fe57855a705d64478e25" PRIMARY KEY ("zone_id"))`);
        await queryRunner.query(`CREATE TABLE "floor" ("floor_id" SERIAL NOT NULL, "floor_number" integer NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "buildingBuildingId" integer, CONSTRAINT "PK_45e4850aab53c1130ba72995e74" PRIMARY KEY ("floor_id"))`);
        await queryRunner.query(`CREATE TABLE "building" ("building_id" SERIAL NOT NULL, "title" character varying(100) NOT NULL, "address" character varying(250), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "organizationOrganizationId" integer, CONSTRAINT "PK_03b4a92f4aaa6114958969b6a9c" PRIMARY KEY ("building_id"))`);
        await queryRunner.query(`CREATE TABLE "organization" ("organization_id" SERIAL NOT NULL, "title" character varying(100) NOT NULL, "description" character varying(500), "work_day_start_time" TIME NOT NULL, "work_day_end_time" TIME NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "organizationAdminOrganizationAdminId" integer, CONSTRAINT "PK_ed1251fa3856cd1a6c98d7bcaa3" PRIMARY KEY ("organization_id"))`);
        await queryRunner.query(`CREATE TABLE "position" ("position_id" SERIAL NOT NULL, "role" character varying(100) NOT NULL, "description" character varying(500), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "organizationOrganizationId" integer, CONSTRAINT "PK_dc114aba6f9c9047c922ccb6d3a" PRIMARY KEY ("position_id"))`);
        await queryRunner.query(`CREATE TABLE "employee" ("employee_id" SERIAL NOT NULL, "full_name" character varying(100) NOT NULL, "email" character varying(100) NOT NULL, "password" character varying(500), "phone" character varying(50), "photo" character varying(1000), "is_consent_given" boolean NOT NULL DEFAULT false, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "organizationOrganizationId" integer, CONSTRAINT "UQ_817d1d427138772d47eca048855" UNIQUE ("email"), CONSTRAINT "PK_f9d306b968b54923539b3936b03" PRIMARY KEY ("employee_id"))`);
        await queryRunner.query(`CREATE TABLE "tag_assignment" ("tag_assignment_id" SERIAL NOT NULL, "tag_assignment_change_date_and_time" TIMESTAMP NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "employeeEmployeeId" integer, "tagAdminTagAdminId" integer, "rfidTagRfidTagId" integer, CONSTRAINT "PK_1a096cf1894afd1ec3e51d32683" PRIMARY KEY ("tag_assignment_id"))`);
        await queryRunner.query(`CREATE TABLE "tag_admin" ("tag_admin_id" SERIAL NOT NULL, "full_name" character varying(100) NOT NULL, "email" character varying(100) NOT NULL, "password" character varying(500), "phone" character varying(50), "photo" character varying(1000), "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_b51b017732f52cf6ef9168c109f" UNIQUE ("email"), CONSTRAINT "PK_2a15020ca04b7797ed7abe47dd5" PRIMARY KEY ("tag_admin_id"))`);
        await queryRunner.query(`CREATE TABLE "zone_zone_access_rules_zone_access_rule" ("zoneZoneId" integer NOT NULL, "zoneAccessRuleZoneAccessRuleId" integer NOT NULL, CONSTRAINT "PK_59fa3c54671de232432f89959be" PRIMARY KEY ("zoneZoneId", "zoneAccessRuleZoneAccessRuleId"))`);
        await queryRunner.query(`CREATE INDEX "IDX_6de9cd6e46946f310b0e3f33f7" ON "zone_zone_access_rules_zone_access_rule" ("zoneZoneId") `);
        await queryRunner.query(`CREATE INDEX "IDX_a11463cecaf1802a8b26662970" ON "zone_zone_access_rules_zone_access_rule" ("zoneAccessRuleZoneAccessRuleId") `);
        await queryRunner.query(`CREATE TABLE "position_zone_access_rules_zone_access_rule" ("positionPositionId" integer NOT NULL, "zoneAccessRuleZoneAccessRuleId" integer NOT NULL, CONSTRAINT "PK_479f0c771a0dc6baea22c938b52" PRIMARY KEY ("positionPositionId", "zoneAccessRuleZoneAccessRuleId"))`);
        await queryRunner.query(`CREATE INDEX "IDX_a17a181ae32931fde2bc51e1c2" ON "position_zone_access_rules_zone_access_rule" ("positionPositionId") `);
        await queryRunner.query(`CREATE INDEX "IDX_c79196878bae6a4f4ad9dbb2b7" ON "position_zone_access_rules_zone_access_rule" ("zoneAccessRuleZoneAccessRuleId") `);
        await queryRunner.query(`CREATE TABLE "employee_positions_position" ("employeeEmployeeId" integer NOT NULL, "positionPositionId" integer NOT NULL, CONSTRAINT "PK_e7940a2ba9618cb04c5516b5229" PRIMARY KEY ("employeeEmployeeId", "positionPositionId"))`);
        await queryRunner.query(`CREATE INDEX "IDX_2a8b027ed055e95e823ae01b52" ON "employee_positions_position" ("employeeEmployeeId") `);
        await queryRunner.query(`CREATE INDEX "IDX_948bb4f2960c4f830ff5dd0544" ON "employee_positions_position" ("positionPositionId") `);
        await queryRunner.query(`ALTER TABLE "notification" ADD CONSTRAINT "FK_538c78d8c037855770c0016a2a6" FOREIGN KEY ("employeeEmployeeId") REFERENCES "employee"("employee_id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "scan_event" ADD CONSTRAINT "FK_bf16cb66edae19dd629de83fa16" FOREIGN KEY ("rfidTagRfidTagId") REFERENCES "rfid_tag"("rfid_tag_id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "scan_event" ADD CONSTRAINT "FK_7f8dc260004b7f79098e04767b1" FOREIGN KEY ("rfidReaderRfidReaderId") REFERENCES "rfid_reader"("rfid_reader_id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "rfid_tag" ADD CONSTRAINT "FK_99c5e7a0cf89d113b293c292195" FOREIGN KEY ("organizationOrganizationId") REFERENCES "organization"("organization_id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "door" ADD CONSTRAINT "FK_b469c833550195a4f46dc01d6f9" FOREIGN KEY ("rfidReaderRfidReaderId") REFERENCES "rfid_reader"("rfid_reader_id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "door" ADD CONSTRAINT "FK_d697d1b00ded9cb355f427f10ef" FOREIGN KEY ("zoneFromZoneId") REFERENCES "zone"("zone_id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "door" ADD CONSTRAINT "FK_d3b232ecb258065a35cede91aed" FOREIGN KEY ("zoneToZoneId") REFERENCES "zone"("zone_id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "zone" ADD CONSTRAINT "FK_e54e40db7de06711084c3877f2f" FOREIGN KEY ("floorFloorId") REFERENCES "floor"("floor_id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "zone" ADD CONSTRAINT "FK_076cf2522d43ffaf46810996163" FOREIGN KEY ("buildingBuildingId") REFERENCES "building"("building_id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "floor" ADD CONSTRAINT "FK_fe5643c4295398f67a56f52b405" FOREIGN KEY ("buildingBuildingId") REFERENCES "building"("building_id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "building" ADD CONSTRAINT "FK_184998b381f8d2db3f99fde01ab" FOREIGN KEY ("organizationOrganizationId") REFERENCES "organization"("organization_id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "organization" ADD CONSTRAINT "FK_51f88571a43626038bf348ee4f1" FOREIGN KEY ("organizationAdminOrganizationAdminId") REFERENCES "organization_admin"("organization_admin_id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "position" ADD CONSTRAINT "FK_1c8c77edbb9538a9ad042e4f4b9" FOREIGN KEY ("organizationOrganizationId") REFERENCES "organization"("organization_id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "employee" ADD CONSTRAINT "FK_24cef36c983a76c171fd1e70e90" FOREIGN KEY ("organizationOrganizationId") REFERENCES "organization"("organization_id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "tag_assignment" ADD CONSTRAINT "FK_c772bb5c1a54379162b5be76641" FOREIGN KEY ("employeeEmployeeId") REFERENCES "employee"("employee_id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "tag_assignment" ADD CONSTRAINT "FK_b1e6ef03ed7d0d2ca2e6b971c8c" FOREIGN KEY ("tagAdminTagAdminId") REFERENCES "tag_admin"("tag_admin_id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "tag_assignment" ADD CONSTRAINT "FK_8c3fe1cd7146d06ee1b7199c738" FOREIGN KEY ("rfidTagRfidTagId") REFERENCES "rfid_tag"("rfid_tag_id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "zone_zone_access_rules_zone_access_rule" ADD CONSTRAINT "FK_6de9cd6e46946f310b0e3f33f75" FOREIGN KEY ("zoneZoneId") REFERENCES "zone"("zone_id") ON DELETE CASCADE ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE "zone_zone_access_rules_zone_access_rule" ADD CONSTRAINT "FK_a11463cecaf1802a8b266629703" FOREIGN KEY ("zoneAccessRuleZoneAccessRuleId") REFERENCES "zone_access_rule"("zone_access_rule_id") ON DELETE CASCADE ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE "position_zone_access_rules_zone_access_rule" ADD CONSTRAINT "FK_a17a181ae32931fde2bc51e1c25" FOREIGN KEY ("positionPositionId") REFERENCES "position"("position_id") ON DELETE CASCADE ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE "position_zone_access_rules_zone_access_rule" ADD CONSTRAINT "FK_c79196878bae6a4f4ad9dbb2b71" FOREIGN KEY ("zoneAccessRuleZoneAccessRuleId") REFERENCES "zone_access_rule"("zone_access_rule_id") ON DELETE CASCADE ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE "employee_positions_position" ADD CONSTRAINT "FK_2a8b027ed055e95e823ae01b529" FOREIGN KEY ("employeeEmployeeId") REFERENCES "employee"("employee_id") ON DELETE CASCADE ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE "employee_positions_position" ADD CONSTRAINT "FK_948bb4f2960c4f830ff5dd05444" FOREIGN KEY ("positionPositionId") REFERENCES "position"("position_id") ON DELETE CASCADE ON UPDATE CASCADE`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "employee_positions_position" DROP CONSTRAINT "FK_948bb4f2960c4f830ff5dd05444"`);
        await queryRunner.query(`ALTER TABLE "employee_positions_position" DROP CONSTRAINT "FK_2a8b027ed055e95e823ae01b529"`);
        await queryRunner.query(`ALTER TABLE "position_zone_access_rules_zone_access_rule" DROP CONSTRAINT "FK_c79196878bae6a4f4ad9dbb2b71"`);
        await queryRunner.query(`ALTER TABLE "position_zone_access_rules_zone_access_rule" DROP CONSTRAINT "FK_a17a181ae32931fde2bc51e1c25"`);
        await queryRunner.query(`ALTER TABLE "zone_zone_access_rules_zone_access_rule" DROP CONSTRAINT "FK_a11463cecaf1802a8b266629703"`);
        await queryRunner.query(`ALTER TABLE "zone_zone_access_rules_zone_access_rule" DROP CONSTRAINT "FK_6de9cd6e46946f310b0e3f33f75"`);
        await queryRunner.query(`ALTER TABLE "tag_assignment" DROP CONSTRAINT "FK_8c3fe1cd7146d06ee1b7199c738"`);
        await queryRunner.query(`ALTER TABLE "tag_assignment" DROP CONSTRAINT "FK_b1e6ef03ed7d0d2ca2e6b971c8c"`);
        await queryRunner.query(`ALTER TABLE "tag_assignment" DROP CONSTRAINT "FK_c772bb5c1a54379162b5be76641"`);
        await queryRunner.query(`ALTER TABLE "employee" DROP CONSTRAINT "FK_24cef36c983a76c171fd1e70e90"`);
        await queryRunner.query(`ALTER TABLE "position" DROP CONSTRAINT "FK_1c8c77edbb9538a9ad042e4f4b9"`);
        await queryRunner.query(`ALTER TABLE "organization" DROP CONSTRAINT "FK_51f88571a43626038bf348ee4f1"`);
        await queryRunner.query(`ALTER TABLE "building" DROP CONSTRAINT "FK_184998b381f8d2db3f99fde01ab"`);
        await queryRunner.query(`ALTER TABLE "floor" DROP CONSTRAINT "FK_fe5643c4295398f67a56f52b405"`);
        await queryRunner.query(`ALTER TABLE "zone" DROP CONSTRAINT "FK_076cf2522d43ffaf46810996163"`);
        await queryRunner.query(`ALTER TABLE "zone" DROP CONSTRAINT "FK_e54e40db7de06711084c3877f2f"`);
        await queryRunner.query(`ALTER TABLE "door" DROP CONSTRAINT "FK_d3b232ecb258065a35cede91aed"`);
        await queryRunner.query(`ALTER TABLE "door" DROP CONSTRAINT "FK_d697d1b00ded9cb355f427f10ef"`);
        await queryRunner.query(`ALTER TABLE "door" DROP CONSTRAINT "FK_b469c833550195a4f46dc01d6f9"`);
        await queryRunner.query(`ALTER TABLE "rfid_tag" DROP CONSTRAINT "FK_99c5e7a0cf89d113b293c292195"`);
        await queryRunner.query(`ALTER TABLE "scan_event" DROP CONSTRAINT "FK_7f8dc260004b7f79098e04767b1"`);
        await queryRunner.query(`ALTER TABLE "scan_event" DROP CONSTRAINT "FK_bf16cb66edae19dd629de83fa16"`);
        await queryRunner.query(`ALTER TABLE "notification" DROP CONSTRAINT "FK_538c78d8c037855770c0016a2a6"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_948bb4f2960c4f830ff5dd0544"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_2a8b027ed055e95e823ae01b52"`);
        await queryRunner.query(`DROP TABLE "employee_positions_position"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_c79196878bae6a4f4ad9dbb2b7"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_a17a181ae32931fde2bc51e1c2"`);
        await queryRunner.query(`DROP TABLE "position_zone_access_rules_zone_access_rule"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_a11463cecaf1802a8b26662970"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_6de9cd6e46946f310b0e3f33f7"`);
        await queryRunner.query(`DROP TABLE "zone_zone_access_rules_zone_access_rule"`);
        await queryRunner.query(`DROP TABLE "tag_admin"`);
        await queryRunner.query(`DROP TABLE "tag_assignment"`);
        await queryRunner.query(`DROP TABLE "employee"`);
        await queryRunner.query(`DROP TABLE "position"`);
        await queryRunner.query(`DROP TABLE "organization"`);
        await queryRunner.query(`DROP TABLE "building"`);
        await queryRunner.query(`DROP TABLE "floor"`);
        await queryRunner.query(`DROP TABLE "zone"`);
        await queryRunner.query(`DROP TABLE "door"`);
        await queryRunner.query(`DROP TABLE "organization_admin"`);
        await queryRunner.query(`DROP TABLE "rfid_tag"`);
        await queryRunner.query(`DROP TABLE "scan_event"`);
        await queryRunner.query(`DROP TABLE "rfid_reader"`);
        await queryRunner.query(`DROP TABLE "zone_access_rule"`);
        await queryRunner.query(`DROP TYPE "public"."zone_access_rule_access_type_enum"`);
        await queryRunner.query(`DROP TABLE "notification"`);
        await queryRunner.query(`DROP TABLE "global_admin"`);
    }

}
