import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Gestión académica de la secretaria (US-18, T-016) y apariencia de la institución (ADR-0010):
 *  - Estudiante: código RUDE único por gestión (decisión D10) y la gestión copiada del curso. Las filas que ya
 *    existían (datos sintéticos de staging) reciben un RUDE provisional SINRUDE + id, que la secretaria corrige.
 *  - Unidad educativa: colores y logo de la web, con los valores predeterminados del diseño.
 */
export class GestionAcademica1791939157894 implements MigrationInterface {
  name = 'GestionAcademica1791939157894';

  public async up(q: QueryRunner): Promise<void> {
    await q.query(
      `ALTER TABLE "unidades_educativas" ADD "color_marca" character varying(7) NOT NULL DEFAULT '#13283F'`,
    );
    await q.query(
      `ALTER TABLE "unidades_educativas" ADD "color_primario" character varying(7) NOT NULL DEFAULT '#1D4E89'`,
    );
    await q.query(
      `ALTER TABLE "unidades_educativas" ADD "color_acento" character varying(7) NOT NULL DEFAULT '#F2B33D'`,
    );
    await q.query(`ALTER TABLE "unidades_educativas" ADD "logo" bytea`);
    await q.query(`ALTER TABLE "unidades_educativas" ADD "logo_tipo" character varying`);
    await q.query(
      `ALTER TABLE "unidades_educativas" ADD "logo_actualizado_en" TIMESTAMP WITH TIME ZONE`,
    );
    await q.query(
      `ALTER TABLE "unidades_educativas" ADD CONSTRAINT "unidades_colores_hex" CHECK (color_marca ~ '^#[0-9A-F]{6}$' AND color_primario ~ '^#[0-9A-F]{6}$' AND color_acento ~ '^#[0-9A-F]{6}$')`,
    );

    await q.query(`ALTER TABLE "estudiantes" ADD "codigo_rude" character varying(20)`);
    await q.query(`ALTER TABLE "estudiantes" ADD "gestion_id" integer`);
    await q.query(
      `UPDATE "estudiantes" e SET gestion_id = c.gestion_id, codigo_rude = 'SINRUDE' || lpad(e.id::text, 6, '0')
         FROM "cursos" c WHERE c.id = e.curso_id`,
    );
    await q.query(`ALTER TABLE "estudiantes" ALTER COLUMN "codigo_rude" SET NOT NULL`);
    await q.query(`ALTER TABLE "estudiantes" ALTER COLUMN "gestion_id" SET NOT NULL`);
    await q.query(
      `ALTER TABLE "estudiantes" ADD CONSTRAINT "estudiantes_rude_por_gestion" UNIQUE ("gestion_id", "codigo_rude")`,
    );
    await q.query(
      `ALTER TABLE "estudiantes" ADD CONSTRAINT "FK_2376c781b27b25b5dc687fda77a" FOREIGN KEY ("gestion_id") REFERENCES "gestiones"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query(`ALTER TABLE "estudiantes" DROP CONSTRAINT "FK_2376c781b27b25b5dc687fda77a"`);
    await q.query(`ALTER TABLE "estudiantes" DROP CONSTRAINT "estudiantes_rude_por_gestion"`);
    await q.query(`ALTER TABLE "estudiantes" DROP COLUMN "gestion_id"`);
    await q.query(`ALTER TABLE "estudiantes" DROP COLUMN "codigo_rude"`);
    await q.query(`ALTER TABLE "unidades_educativas" DROP CONSTRAINT "unidades_colores_hex"`);
    for (const columna of [
      'logo_actualizado_en',
      'logo_tipo',
      'logo',
      'color_acento',
      'color_primario',
      'color_marca',
    ]) {
      await q.query(`ALTER TABLE "unidades_educativas" DROP COLUMN "${columna}"`);
    }
  }
}
