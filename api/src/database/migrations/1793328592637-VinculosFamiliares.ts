import type { MigrationInterface, QueryRunner } from 'typeorm';

/** Parentesco y fecha del vínculo padre–estudiante (US-20, T-048; decisión D17). */
export class VinculosFamiliares1793328592637 implements MigrationInterface {
  name = 'VinculosFamiliares1793328592637';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."parentesco" AS ENUM('PADRE', 'MADRE', 'TUTOR_LEGAL', 'APODERADO', 'OTRO')`,
    );
    await queryRunner.query(
      `ALTER TABLE "vinculos_padre" ADD "parentesco" "public"."parentesco" NOT NULL DEFAULT 'PADRE'`,
    );
    await queryRunner.query(
      `ALTER TABLE "vinculos_padre" ADD "creado_en" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "vinculos_padre" DROP COLUMN "creado_en"`);
    await queryRunner.query(`ALTER TABLE "vinculos_padre" DROP COLUMN "parentesco"`);
    await queryRunner.query(`DROP TYPE "public"."parentesco"`);
  }
}
