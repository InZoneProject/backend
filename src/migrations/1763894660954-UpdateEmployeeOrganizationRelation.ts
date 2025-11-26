import { MigrationInterface, QueryRunner } from "typeorm";

export class UpdateEmployeeOrganizationRelation1763894660954 implements MigrationInterface {
    name = 'UpdateEmployeeOrganizationRelation1763894660954'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "employee_organizations_organization" ("employeeEmployeeId" integer NOT NULL, "organizationOrganizationId" integer NOT NULL, CONSTRAINT "PK_0dc629d7f8d1e7bde6453ee1e09" PRIMARY KEY ("employeeEmployeeId", "organizationOrganizationId"))`);
        await queryRunner.query(`CREATE INDEX "IDX_a647d9e404656319016fe15dba" ON "employee_organizations_organization" ("employeeEmployeeId") `);
        await queryRunner.query(`CREATE INDEX "IDX_3ade58e619f59d270020392694" ON "employee_organizations_organization" ("organizationOrganizationId") `);
        await queryRunner.query(`ALTER TABLE "employee_organizations_organization" ADD CONSTRAINT "FK_a647d9e404656319016fe15dbad" FOREIGN KEY ("employeeEmployeeId") REFERENCES "employee"("employee_id") ON DELETE CASCADE ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE "employee_organizations_organization" ADD CONSTRAINT "FK_3ade58e619f59d2700203926949" FOREIGN KEY ("organizationOrganizationId") REFERENCES "organization"("organization_id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "employee_organizations_organization" DROP CONSTRAINT "FK_3ade58e619f59d2700203926949"`);
        await queryRunner.query(`ALTER TABLE "employee_organizations_organization" DROP CONSTRAINT "FK_a647d9e404656319016fe15dbad"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_3ade58e619f59d270020392694"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_a647d9e404656319016fe15dba"`);
        await queryRunner.query(`DROP TABLE "employee_organizations_organization"`);
    }

}
