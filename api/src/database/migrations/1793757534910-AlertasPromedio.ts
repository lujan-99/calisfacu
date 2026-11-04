import type { MigrationInterface, QueryRunner } from 'typeorm';

/** Alertas de promedio bajo (US-08, T-060; decisión D22). */
export class AlertasPromedio1793757534910 implements MigrationInterface {
  name = 'AlertasPromedio1793757534910';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "alertas_promedio" ("id" SERIAL NOT NULL, "nota" integer NOT NULL, "nota_anterior" integer, "creada_en" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "leida_en" TIMESTAMP WITH TIME ZONE, "atendida_en" TIMESTAMP WITH TIME ZONE, "nota_atencion" text, "superada_en" TIMESTAMP WITH TIME ZONE, "estudiante_id" integer NOT NULL, "materia_id" integer NOT NULL, "trimestre_id" integer NOT NULL, "atendida_por_id" integer, CONSTRAINT "PK_b18801ef96f75dd59c9ba495094" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "alertas_promedio_una_vigente" ON "alertas_promedio" ("estudiante_id", "materia_id", "trimestre_id") WHERE "superada_en" IS NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "alertas_promedio" ADD CONSTRAINT "FK_4cbbe51d71efddb6ca5672d221b" FOREIGN KEY ("estudiante_id") REFERENCES "estudiantes"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "alertas_promedio" ADD CONSTRAINT "FK_2e26e7f5f6b666606dd3b642643" FOREIGN KEY ("materia_id") REFERENCES "materias"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "alertas_promedio" ADD CONSTRAINT "FK_91511e7aea060cbf66fb67b0288" FOREIGN KEY ("trimestre_id") REFERENCES "trimestres"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "alertas_promedio" ADD CONSTRAINT "FK_cbe974cb060bce55804e2478c43" FOREIGN KEY ("atendida_por_id") REFERENCES "usuarios"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "alertas_promedio" DROP CONSTRAINT "FK_cbe974cb060bce55804e2478c43"`,
    );
    await queryRunner.query(
      `ALTER TABLE "alertas_promedio" DROP CONSTRAINT "FK_91511e7aea060cbf66fb67b0288"`,
    );
    await queryRunner.query(
      `ALTER TABLE "alertas_promedio" DROP CONSTRAINT "FK_2e26e7f5f6b666606dd3b642643"`,
    );
    await queryRunner.query(
      `ALTER TABLE "alertas_promedio" DROP CONSTRAINT "FK_4cbbe51d71efddb6ca5672d221b"`,
    );
    await queryRunner.query(`DROP INDEX "public"."alertas_promedio_una_vigente"`);
    await queryRunner.query(`DROP TABLE "alertas_promedio"`);
  }
}
