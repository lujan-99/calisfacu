import type { MigrationInterface, QueryRunner } from 'typeorm';

/** Bandeja de salida de correos (T-061, ADR-0011) y avisos de boletín al padre (US-12, T-062; decisión D23). */
export class CorreosYAvisos1793763318081 implements MigrationInterface {
  name = 'CorreosYAvisos1793763318081';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."estado_correo" AS ENUM('PENDIENTE', 'ENVIADO', 'FALLIDO', 'SIN_PROVEEDOR')`,
    );
    await queryRunner.query(
      `CREATE TABLE "correos" ("id" SERIAL NOT NULL, "destinatario" character varying NOT NULL, "asunto" character varying NOT NULL, "texto" text NOT NULL, "html" text NOT NULL, "estado" "public"."estado_correo" NOT NULL DEFAULT 'PENDIENTE', "intentos" integer NOT NULL DEFAULT '0', "siguiente_intento" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "ultimo_error" text, "creado_en" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "enviado_en" TIMESTAMP WITH TIME ZONE, CONSTRAINT "PK_cc4bd0c8eca9b043b3f9940812b" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_3fd052f4581194635303c99c28" ON "correos" ("estado", "siguiente_intento") `,
    );
    await queryRunner.query(
      `CREATE TABLE "avisos_boletin" ("id" SERIAL NOT NULL, "creado_en" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "leido_en" TIMESTAMP WITH TIME ZONE, "padre_id" integer NOT NULL, "estudiante_id" integer NOT NULL, "trimestre_id" integer NOT NULL, "correo_id" integer, CONSTRAINT "UQ_9eb0c27df8e35ef5ccba9c21635" UNIQUE ("padre_id", "estudiante_id", "trimestre_id"), CONSTRAINT "PK_41033c079910016fe46f7aeb596" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(`ALTER TABLE "alertas_promedio" ADD "correo_id" integer`);
    await queryRunner.query(
      `ALTER TABLE "alertas_promedio" ADD CONSTRAINT "FK_0f5b2f1390a74d8afff6613c60c" FOREIGN KEY ("correo_id") REFERENCES "correos"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "avisos_boletin" ADD CONSTRAINT "FK_5ea0f3c5428025d0fe41150aca1" FOREIGN KEY ("padre_id") REFERENCES "usuarios"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "avisos_boletin" ADD CONSTRAINT "FK_1ec547a1c96bc1ad83c816e06c2" FOREIGN KEY ("estudiante_id") REFERENCES "estudiantes"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "avisos_boletin" ADD CONSTRAINT "FK_b99bff1c31eda8788bdb0d33f5c" FOREIGN KEY ("trimestre_id") REFERENCES "trimestres"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "avisos_boletin" ADD CONSTRAINT "FK_a28715bb49edd70e5eeefaf29be" FOREIGN KEY ("correo_id") REFERENCES "correos"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "avisos_boletin" DROP CONSTRAINT "FK_a28715bb49edd70e5eeefaf29be"`,
    );
    await queryRunner.query(
      `ALTER TABLE "avisos_boletin" DROP CONSTRAINT "FK_b99bff1c31eda8788bdb0d33f5c"`,
    );
    await queryRunner.query(
      `ALTER TABLE "avisos_boletin" DROP CONSTRAINT "FK_1ec547a1c96bc1ad83c816e06c2"`,
    );
    await queryRunner.query(
      `ALTER TABLE "avisos_boletin" DROP CONSTRAINT "FK_5ea0f3c5428025d0fe41150aca1"`,
    );
    await queryRunner.query(
      `ALTER TABLE "alertas_promedio" DROP CONSTRAINT "FK_0f5b2f1390a74d8afff6613c60c"`,
    );
    await queryRunner.query(`ALTER TABLE "alertas_promedio" DROP COLUMN "correo_id"`);
    await queryRunner.query(`DROP TABLE "avisos_boletin"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_3fd052f4581194635303c99c28"`);
    await queryRunner.query(`DROP TABLE "correos"`);
    await queryRunner.query(`DROP TYPE "public"."estado_correo"`);
  }
}
