import type { MigrationInterface, QueryRunner } from 'typeorm';

/** Entrega de las notas de cada materia por trimestre (US-10, T-040): una por materia y trimestre. */
export class EntregasNotas1792558608919 implements MigrationInterface {
  name = 'EntregasNotas1792558608919';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "entregas_notas" ("id" SERIAL NOT NULL, "entregado_en" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "materia_id" integer NOT NULL, "trimestre_id" integer NOT NULL, "profesor_id" integer NOT NULL, CONSTRAINT "UQ_5836149c903d3c0d67af2d9ba45" UNIQUE ("materia_id", "trimestre_id"), CONSTRAINT "PK_c141cb35984d04dc3e0f4fa08d5" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "entregas_notas" ADD CONSTRAINT "FK_3034ce0b84d7dcc0b2910e6f36b" FOREIGN KEY ("materia_id") REFERENCES "materias"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "entregas_notas" ADD CONSTRAINT "FK_41ba31cd9e27a4c2dd6f2407423" FOREIGN KEY ("trimestre_id") REFERENCES "trimestres"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "entregas_notas" ADD CONSTRAINT "FK_0c223331e985617baa7e0c65bdf" FOREIGN KEY ("profesor_id") REFERENCES "usuarios"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "entregas_notas" DROP CONSTRAINT "FK_0c223331e985617baa7e0c65bdf"`,
    );
    await queryRunner.query(
      `ALTER TABLE "entregas_notas" DROP CONSTRAINT "FK_41ba31cd9e27a4c2dd6f2407423"`,
    );
    await queryRunner.query(
      `ALTER TABLE "entregas_notas" DROP CONSTRAINT "FK_3034ce0b84d7dcc0b2910e6f36b"`,
    );
    await queryRunner.query(`DROP TABLE "entregas_notas"`);
  }
}
