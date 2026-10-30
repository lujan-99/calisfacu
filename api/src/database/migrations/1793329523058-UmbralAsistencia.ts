import type { MigrationInterface, QueryRunner } from 'typeorm';

/** Umbral de asistencia configurable por gestión para el panel de riesgo (US-06, T-043; decisión D6). */
export class UmbralAsistencia1793329523058 implements MigrationInterface {
  name = 'UmbralAsistencia1793329523058';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "gestiones" ADD "umbral_asistencia" numeric(4,1) NOT NULL DEFAULT '80'`,
    );
    await queryRunner.query(
      `ALTER TABLE "gestiones" ADD CONSTRAINT "gestiones_umbral_asistencia" CHECK (umbral_asistencia BETWEEN 0 AND 100)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "gestiones" DROP CONSTRAINT "gestiones_umbral_asistencia"`,
    );
    await queryRunner.query(`ALTER TABLE "gestiones" DROP COLUMN "umbral_asistencia"`);
  }
}
