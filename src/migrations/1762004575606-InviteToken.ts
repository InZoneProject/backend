import { MigrationInterface, QueryRunner } from "typeorm";

export class InviteToken1762004575606 implements MigrationInterface {
    name = 'InviteToken1762004575606'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "invite_token" ("invite_token_id" SERIAL NOT NULL, "token_encrypted" text NOT NULL, "is_used" boolean NOT NULL DEFAULT false, "used_at" TIMESTAMP, "expires_at" TIMESTAMP NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "used_by" integer, CONSTRAINT "UQ_token_encrypted" UNIQUE ("token_encrypted"), CONSTRAINT "PK_f3c93a3281bec1f8c4755e0c53d" PRIMARY KEY ("invite_token_id"))`);
        await queryRunner.query(`ALTER TABLE "invite_token" ADD CONSTRAINT "FK_10fe4e300dd50175dbfaddfc093" FOREIGN KEY ("used_by") REFERENCES "organization_admin"("organization_admin_id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "invite_token" DROP CONSTRAINT "FK_10fe4e300dd50175dbfaddfc093"`);
        await queryRunner.query(`DROP TABLE "invite_token"`);
    }

}
