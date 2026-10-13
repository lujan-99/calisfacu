import { MigrationInterface, QueryRunner } from 'typeorm';

export class Inicial1791866158228 implements MigrationInterface {
  name = 'Inicial1791866158228';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."rol" AS ENUM('ADMINISTRADOR', 'SECRETARIA', 'PROFESOR', 'PADRE')`,
    );
    await queryRunner.query(
      `CREATE TABLE "usuarios" ("id" SERIAL NOT NULL, "email" character varying NOT NULL, "nombre" character varying NOT NULL, "hash_contrasena" character varying NOT NULL, "rol" "public"."rol" NOT NULL, "activo" boolean NOT NULL DEFAULT true, "intentos_fallidos" integer NOT NULL DEFAULT '0', "bloqueado_hasta" TIMESTAMP WITH TIME ZONE, "creado_en" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_446adfc18b35418aac32ae0b7b5" UNIQUE ("email"), CONSTRAINT "PK_d7281c63c176e152e4c531594a8" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "unidades_educativas" ("id" SERIAL NOT NULL, "nombre" character varying NOT NULL, "codigo_sie" character varying NOT NULL, CONSTRAINT "UQ_1cec21a726e76bfb7fdb0bac6a7" UNIQUE ("codigo_sie"), CONSTRAINT "PK_f56a81b58fe3edc5d5e264260d8" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "gestiones" ("id" SERIAL NOT NULL, "anio" integer NOT NULL, "unidad_educativa_id" integer NOT NULL, CONSTRAINT "UQ_71247fb17bd7537e70f5c1e886d" UNIQUE ("unidad_educativa_id", "anio"), CONSTRAINT "PK_3cbd25517eb7cb0e52e182ea32f" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "trimestres" ("id" SERIAL NOT NULL, "numero" integer NOT NULL, "cerrado" boolean NOT NULL DEFAULT false, "gestion_id" integer NOT NULL, CONSTRAINT "UQ_22ba04f068b5b33ad4dbf46add5" UNIQUE ("gestion_id", "numero"), CONSTRAINT "PK_2dfcbdf13495ca2a68c842548cf" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "dimensiones_evaluacion" ("id" SERIAL NOT NULL, "codigo" character varying NOT NULL, "nombre" character varying NOT NULL, "puntaje_maximo" integer NOT NULL, "orden" integer NOT NULL DEFAULT '0', "gestion_id" integer NOT NULL, CONSTRAINT "UQ_54acaac232e9557a23c28658585" UNIQUE ("gestion_id", "codigo"), CONSTRAINT "PK_d203869b559b13118c58686f9fc" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."nivel" AS ENUM('INICIAL', 'PRIMARIA', 'SECUNDARIA')`,
    );
    await queryRunner.query(
      `CREATE TABLE "cursos" ("id" SERIAL NOT NULL, "nivel" "public"."nivel" NOT NULL, "anio_escolaridad" integer NOT NULL, "paralelo" character varying NOT NULL, "gestion_id" integer NOT NULL, CONSTRAINT "UQ_1b1636390d4929a1a65a55645ec" UNIQUE ("gestion_id", "nivel", "anio_escolaridad", "paralelo"), CONSTRAINT "PK_391c5a635ef6b4bd0a46cb75653" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "materias" ("id" SERIAL NOT NULL, "nombre" character varying NOT NULL, "curso_id" integer NOT NULL, CONSTRAINT "UQ_41f2efe74e47090f8e35ac379f5" UNIQUE ("curso_id", "nombre"), CONSTRAINT "PK_3715a51974d6fcefbc528059df6" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "asignaciones_materia" ("id" SERIAL NOT NULL, "materia_id" integer NOT NULL, "profesor_id" integer NOT NULL, CONSTRAINT "REL_28d515b838240a9cfe4092ee4c" UNIQUE ("materia_id"), CONSTRAINT "PK_3693dbcf8d57bbdc34ccbcede9d" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "estudiantes" ("id" SERIAL NOT NULL, "nombres" character varying NOT NULL, "apellidos" character varying NOT NULL, "curso_id" integer NOT NULL, CONSTRAINT "PK_34e9c0289e8e3f437ec6c902f6b" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "vinculos_padre" ("padre_id" integer NOT NULL, "estudiante_id" integer NOT NULL, CONSTRAINT "PK_ce9ebdd19611943e5601b941079" PRIMARY KEY ("padre_id", "estudiante_id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "actividades" ("id" SERIAL NOT NULL, "nombre" character varying NOT NULL, "materia_id" integer NOT NULL, "trimestre_id" integer NOT NULL, "dimension_id" integer NOT NULL, CONSTRAINT "PK_03490866fef1c23456f0e289d9c" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "notas" ("id" SERIAL NOT NULL, "valor" numeric(5,2) NOT NULL, "actualizado_en" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "actividad_id" integer NOT NULL, "estudiante_id" integer NOT NULL, CONSTRAINT "UQ_872da4e4d4ee1870bca81a0867e" UNIQUE ("actividad_id", "estudiante_id"), CONSTRAINT "PK_1f3d47f136b291534c128bb4516" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."origen_cambio" AS ENUM('REGISTRO', 'CORRECCION', 'IMPORTACION')`,
    );
    await queryRunner.query(
      `CREATE TABLE "registros_auditoria" ("id" SERIAL NOT NULL, "valor_anterior" numeric(5,2), "valor_nuevo" numeric(5,2) NOT NULL, "motivo" text, "origen" "public"."origen_cambio" NOT NULL, "creado_en" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "nota_id" integer NOT NULL, "usuario_id" integer NOT NULL, CONSTRAINT "PK_52a47d9f5f33f509ae83e56a747" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_4440a2f6c350961e58adafcd62" ON "registros_auditoria" ("nota_id") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."estado_asistencia" AS ENUM('PRESENTE', 'AUSENTE', 'LICENCIA')`,
    );
    await queryRunner.query(
      `CREATE TABLE "asistencias" ("id" SERIAL NOT NULL, "fecha" date NOT NULL, "estado" "public"."estado_asistencia" NOT NULL, "materia_id" integer NOT NULL, "estudiante_id" integer NOT NULL, CONSTRAINT "UQ_1856e50ad25099a6e034dc41527" UNIQUE ("materia_id", "estudiante_id", "fecha"), CONSTRAINT "PK_f7eb09d44d6c7dd4ccc6eb29af8" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "gestiones" ADD CONSTRAINT "FK_252b1614fc989fae46d8b0d62d2" FOREIGN KEY ("unidad_educativa_id") REFERENCES "unidades_educativas"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "trimestres" ADD CONSTRAINT "FK_4dc9de64dddaec0fce580fdb9ce" FOREIGN KEY ("gestion_id") REFERENCES "gestiones"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "dimensiones_evaluacion" ADD CONSTRAINT "FK_d24caf5f281498c41a16720e009" FOREIGN KEY ("gestion_id") REFERENCES "gestiones"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "cursos" ADD CONSTRAINT "FK_d76b1da43ece6669cc22186eb61" FOREIGN KEY ("gestion_id") REFERENCES "gestiones"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "materias" ADD CONSTRAINT "FK_e5027e028699f0ec81483fffeb0" FOREIGN KEY ("curso_id") REFERENCES "cursos"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "asignaciones_materia" ADD CONSTRAINT "FK_28d515b838240a9cfe4092ee4c0" FOREIGN KEY ("materia_id") REFERENCES "materias"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "asignaciones_materia" ADD CONSTRAINT "FK_26fc024a7e7945d850e6a1d16c3" FOREIGN KEY ("profesor_id") REFERENCES "usuarios"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "estudiantes" ADD CONSTRAINT "FK_09cd3f2cec1ff04464f068b69c9" FOREIGN KEY ("curso_id") REFERENCES "cursos"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "vinculos_padre" ADD CONSTRAINT "FK_6020f9aa2fa4c9921f18a202011" FOREIGN KEY ("padre_id") REFERENCES "usuarios"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "vinculos_padre" ADD CONSTRAINT "FK_f50cad96d9b224eda50013d5621" FOREIGN KEY ("estudiante_id") REFERENCES "estudiantes"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "actividades" ADD CONSTRAINT "FK_3d4d6b16834615594cee8bf574f" FOREIGN KEY ("materia_id") REFERENCES "materias"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "actividades" ADD CONSTRAINT "FK_dd12f4fb896ef03817b4264bb6d" FOREIGN KEY ("trimestre_id") REFERENCES "trimestres"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "actividades" ADD CONSTRAINT "FK_c8dc142740bbdbe443cf3bc719d" FOREIGN KEY ("dimension_id") REFERENCES "dimensiones_evaluacion"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "notas" ADD CONSTRAINT "FK_e90ca7c2affdcd54f84341f30ce" FOREIGN KEY ("actividad_id") REFERENCES "actividades"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "notas" ADD CONSTRAINT "FK_08c68215682d0f40814f2a2da9b" FOREIGN KEY ("estudiante_id") REFERENCES "estudiantes"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "registros_auditoria" ADD CONSTRAINT "FK_4440a2f6c350961e58adafcd62a" FOREIGN KEY ("nota_id") REFERENCES "notas"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "registros_auditoria" ADD CONSTRAINT "FK_d6689562c5d3417485e11acb63e" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "asistencias" ADD CONSTRAINT "FK_f565fca8b25085e906bf7af206e" FOREIGN KEY ("materia_id") REFERENCES "materias"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "asistencias" ADD CONSTRAINT "FK_11500c6b636d8af7cd8da3df0ec" FOREIGN KEY ("estudiante_id") REFERENCES "estudiantes"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "asistencias" DROP CONSTRAINT "FK_11500c6b636d8af7cd8da3df0ec"`,
    );
    await queryRunner.query(
      `ALTER TABLE "asistencias" DROP CONSTRAINT "FK_f565fca8b25085e906bf7af206e"`,
    );
    await queryRunner.query(
      `ALTER TABLE "registros_auditoria" DROP CONSTRAINT "FK_d6689562c5d3417485e11acb63e"`,
    );
    await queryRunner.query(
      `ALTER TABLE "registros_auditoria" DROP CONSTRAINT "FK_4440a2f6c350961e58adafcd62a"`,
    );
    await queryRunner.query(`ALTER TABLE "notas" DROP CONSTRAINT "FK_08c68215682d0f40814f2a2da9b"`);
    await queryRunner.query(`ALTER TABLE "notas" DROP CONSTRAINT "FK_e90ca7c2affdcd54f84341f30ce"`);
    await queryRunner.query(
      `ALTER TABLE "actividades" DROP CONSTRAINT "FK_c8dc142740bbdbe443cf3bc719d"`,
    );
    await queryRunner.query(
      `ALTER TABLE "actividades" DROP CONSTRAINT "FK_dd12f4fb896ef03817b4264bb6d"`,
    );
    await queryRunner.query(
      `ALTER TABLE "actividades" DROP CONSTRAINT "FK_3d4d6b16834615594cee8bf574f"`,
    );
    await queryRunner.query(
      `ALTER TABLE "vinculos_padre" DROP CONSTRAINT "FK_f50cad96d9b224eda50013d5621"`,
    );
    await queryRunner.query(
      `ALTER TABLE "vinculos_padre" DROP CONSTRAINT "FK_6020f9aa2fa4c9921f18a202011"`,
    );
    await queryRunner.query(
      `ALTER TABLE "estudiantes" DROP CONSTRAINT "FK_09cd3f2cec1ff04464f068b69c9"`,
    );
    await queryRunner.query(
      `ALTER TABLE "asignaciones_materia" DROP CONSTRAINT "FK_26fc024a7e7945d850e6a1d16c3"`,
    );
    await queryRunner.query(
      `ALTER TABLE "asignaciones_materia" DROP CONSTRAINT "FK_28d515b838240a9cfe4092ee4c0"`,
    );
    await queryRunner.query(
      `ALTER TABLE "materias" DROP CONSTRAINT "FK_e5027e028699f0ec81483fffeb0"`,
    );
    await queryRunner.query(
      `ALTER TABLE "cursos" DROP CONSTRAINT "FK_d76b1da43ece6669cc22186eb61"`,
    );
    await queryRunner.query(
      `ALTER TABLE "dimensiones_evaluacion" DROP CONSTRAINT "FK_d24caf5f281498c41a16720e009"`,
    );
    await queryRunner.query(
      `ALTER TABLE "trimestres" DROP CONSTRAINT "FK_4dc9de64dddaec0fce580fdb9ce"`,
    );
    await queryRunner.query(
      `ALTER TABLE "gestiones" DROP CONSTRAINT "FK_252b1614fc989fae46d8b0d62d2"`,
    );
    await queryRunner.query(`DROP TABLE "asistencias"`);
    await queryRunner.query(`DROP TYPE "public"."estado_asistencia"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_4440a2f6c350961e58adafcd62"`);
    await queryRunner.query(`DROP TABLE "registros_auditoria"`);
    await queryRunner.query(`DROP TYPE "public"."origen_cambio"`);
    await queryRunner.query(`DROP TABLE "notas"`);
    await queryRunner.query(`DROP TABLE "actividades"`);
    await queryRunner.query(`DROP TABLE "vinculos_padre"`);
    await queryRunner.query(`DROP TABLE "estudiantes"`);
    await queryRunner.query(`DROP TABLE "asignaciones_materia"`);
    await queryRunner.query(`DROP TABLE "materias"`);
    await queryRunner.query(`DROP TABLE "cursos"`);
    await queryRunner.query(`DROP TYPE "public"."nivel"`);
    await queryRunner.query(`DROP TABLE "dimensiones_evaluacion"`);
    await queryRunner.query(`DROP TABLE "trimestres"`);
    await queryRunner.query(`DROP TABLE "gestiones"`);
    await queryRunner.query(`DROP TABLE "unidades_educativas"`);
    await queryRunner.query(`DROP TABLE "usuarios"`);
    await queryRunner.query(`DROP TYPE "public"."rol"`);
  }
}
