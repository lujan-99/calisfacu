import type { MigrationInterface, QueryRunner } from 'typeorm';

/** Cédula de identidad opcional del estudiante (decisión D15). */
export class EstudianteCi1792569747015 implements MigrationInterface {
  name = 'EstudianteCi1792569747015';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "estudiantes" ADD "ci" character varying(15)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "estudiantes" DROP COLUMN "ci"`);
  }
}
