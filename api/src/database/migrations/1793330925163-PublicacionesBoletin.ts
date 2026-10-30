import type { MigrationInterface, QueryRunner } from 'typeorm';

/** Publicación del boletín por curso y trimestre (US-11, T-050; decisión D20). */
export class PublicacionesBoletin1793330925163 implements MigrationInterface {
  name = 'PublicacionesBoletin1793330925163';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "publicaciones_boletin" ("id" SERIAL NOT NULL, "publicado_en" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "curso_id" integer NOT NULL, "trimestre_id" integer NOT NULL, "publicado_por_id" integer NOT NULL, CONSTRAINT "UQ_d9491255bab2d01594d19ca2030" UNIQUE ("curso_id", "trimestre_id"), CONSTRAINT "PK_4edbc4e6009ca39c421cee4d3a0" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "publicaciones_boletin" ADD CONSTRAINT "FK_a637702ee92ee7393c67ee48c78" FOREIGN KEY ("curso_id") REFERENCES "cursos"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "publicaciones_boletin" ADD CONSTRAINT "FK_08f6cf491f2ddfb4f63713d7e9e" FOREIGN KEY ("trimestre_id") REFERENCES "trimestres"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "publicaciones_boletin" ADD CONSTRAINT "FK_3643e655e3ba46255cff3ec8c5f" FOREIGN KEY ("publicado_por_id") REFERENCES "usuarios"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "publicaciones_boletin" DROP CONSTRAINT "FK_3643e655e3ba46255cff3ec8c5f"`,
    );
    await queryRunner.query(
      `ALTER TABLE "publicaciones_boletin" DROP CONSTRAINT "FK_08f6cf491f2ddfb4f63713d7e9e"`,
    );
    await queryRunner.query(
      `ALTER TABLE "publicaciones_boletin" DROP CONSTRAINT "FK_a637702ee92ee7393c67ee48c78"`,
    );
    await queryRunner.query(`DROP TABLE "publicaciones_boletin"`);
  }
}
