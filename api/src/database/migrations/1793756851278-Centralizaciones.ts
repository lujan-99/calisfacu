import type { MigrationInterface, QueryRunner } from 'typeorm';

/** Centralización de notas por curso y trimestre (US-09, T-057; decisión D21). */
export class Centralizaciones1793756851278 implements MigrationInterface {
  name = 'Centralizaciones1793756851278';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "centralizaciones" ("id" SERIAL NOT NULL, "centralizado_en" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "curso_id" integer NOT NULL, "trimestre_id" integer NOT NULL, "centralizado_por_id" integer NOT NULL, CONSTRAINT "UQ_0dac0c9121e47567a5e1854d2b4" UNIQUE ("curso_id", "trimestre_id"), CONSTRAINT "PK_f425e7940c45e7b62ddb82e7ce3" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "centralizaciones" ADD CONSTRAINT "FK_e5bedf633f371041f3d749da926" FOREIGN KEY ("curso_id") REFERENCES "cursos"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "centralizaciones" ADD CONSTRAINT "FK_f2151ae2192d5eabbb11b48d72c" FOREIGN KEY ("trimestre_id") REFERENCES "trimestres"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "centralizaciones" ADD CONSTRAINT "FK_f9ea1cf40fa8d0714b0dbee69a1" FOREIGN KEY ("centralizado_por_id") REFERENCES "usuarios"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "centralizaciones" DROP CONSTRAINT "FK_f9ea1cf40fa8d0714b0dbee69a1"`,
    );
    await queryRunner.query(
      `ALTER TABLE "centralizaciones" DROP CONSTRAINT "FK_f2151ae2192d5eabbb11b48d72c"`,
    );
    await queryRunner.query(
      `ALTER TABLE "centralizaciones" DROP CONSTRAINT "FK_e5bedf633f371041f3d749da926"`,
    );
    await queryRunner.query(`DROP TABLE "centralizaciones"`);
  }
}
