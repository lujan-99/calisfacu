import type { MigrationInterface, QueryRunner } from 'typeorm';

/** Solicitudes de edición de notas ya registradas, aprobadas por el administrador (decisión D16). */
export class SolicitudesEdicion1792570028007 implements MigrationInterface {
  name = 'SolicitudesEdicion1792570028007';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."estado_solicitud" AS ENUM('PENDIENTE', 'APROBADA', 'RECHAZADA')`,
    );
    await queryRunner.query(
      `CREATE TABLE "solicitudes_edicion" ("id" SERIAL NOT NULL, "motivo" text NOT NULL, "estado" "public"."estado_solicitud" NOT NULL DEFAULT 'PENDIENTE', "observacion" text, "creado_en" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "resuelto_en" TIMESTAMP WITH TIME ZONE, "actividad_id" integer NOT NULL, "profesor_id" integer NOT NULL, "resuelto_por_id" integer, CONSTRAINT "solicitudes_rechazo_con_observacion" CHECK (estado <> 'RECHAZADA' OR observacion IS NOT NULL), CONSTRAINT "PK_1a6f8f00528ede06e8c010b7a34" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "solicitudes_edicion_estudiantes" ("id" SERIAL NOT NULL, "usada_en" TIMESTAMP WITH TIME ZONE, "solicitud_id" integer NOT NULL, "estudiante_id" integer NOT NULL, CONSTRAINT "UQ_4d48ad4fff0a537c131c4f43503" UNIQUE ("solicitud_id", "estudiante_id"), CONSTRAINT "PK_8b3b7cbaeb44db431c5f43a7bd0" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "solicitudes_edicion" ADD CONSTRAINT "FK_2b85f6924f71ecd8edff3ce644d" FOREIGN KEY ("actividad_id") REFERENCES "actividades"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "solicitudes_edicion" ADD CONSTRAINT "FK_0a6545cda300730ad837d068632" FOREIGN KEY ("profesor_id") REFERENCES "usuarios"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "solicitudes_edicion" ADD CONSTRAINT "FK_ccce7453c55cc6a56f4c8b02f3d" FOREIGN KEY ("resuelto_por_id") REFERENCES "usuarios"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "solicitudes_edicion_estudiantes" ADD CONSTRAINT "FK_83d01bb00bf1f32db3d65d9b7e7" FOREIGN KEY ("solicitud_id") REFERENCES "solicitudes_edicion"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "solicitudes_edicion_estudiantes" ADD CONSTRAINT "FK_84061ad4a92a797d4533e209668" FOREIGN KEY ("estudiante_id") REFERENCES "estudiantes"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "solicitudes_edicion_estudiantes" DROP CONSTRAINT "FK_84061ad4a92a797d4533e209668"`,
    );
    await queryRunner.query(
      `ALTER TABLE "solicitudes_edicion_estudiantes" DROP CONSTRAINT "FK_83d01bb00bf1f32db3d65d9b7e7"`,
    );
    await queryRunner.query(
      `ALTER TABLE "solicitudes_edicion" DROP CONSTRAINT "FK_ccce7453c55cc6a56f4c8b02f3d"`,
    );
    await queryRunner.query(
      `ALTER TABLE "solicitudes_edicion" DROP CONSTRAINT "FK_0a6545cda300730ad837d068632"`,
    );
    await queryRunner.query(
      `ALTER TABLE "solicitudes_edicion" DROP CONSTRAINT "FK_2b85f6924f71ecd8edff3ce644d"`,
    );
    await queryRunner.query(`DROP TABLE "solicitudes_edicion_estudiantes"`);
    await queryRunner.query(`DROP TABLE "solicitudes_edicion"`);
    await queryRunner.query(`DROP TYPE "public"."estado_solicitud"`);
  }
}
