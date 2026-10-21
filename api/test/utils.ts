import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';
import { configurarApp } from '../src/app.setup';
import {
  Actividad,
  AsignacionMateria,
  Curso,
  DimensionEvaluacion,
  ENTIDADES,
  EstadoSolicitud,
  Estudiante,
  Gestion,
  Materia,
  Nivel,
  Rol,
  SolicitudEdicion,
  SolicitudEdicionEstudiante,
  Trimestre,
  UnidadEducativa,
  Usuario,
  VinculoPadre,
} from '../src/database/entities';
import { DIMENSIONES_RM_001_2026 } from '../src/modules/calculo/reglas';
import { AuthService } from '../src/modules/auth/auth.service';

export const CONTRASENA = 'Prueba2026!';

export async function crearApp() {
  const modulo = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = configurarApp(modulo.createNestApplication());
  await app.init();
  return { app, ds: app.get(DataSource) };
}

export async function limpiar(ds: DataSource) {
  const tablas = ENTIDADES.map((e) => `"${ds.getMetadata(e).tableName}"`).join(', ');
  await ds.query(`TRUNCATE ${tablas} RESTART IDENTITY CASCADE`);
}

/** Escenario sintético mínimo: una gestión 2026 con un curso, dos materias y sus profesores. */
export async function escenario(ds: DataSource) {
  const hash = await AuthService.hash(CONTRASENA);
  const usuario = (email: string, rol: Rol, nombre: string) =>
    ds.getRepository(Usuario).save({ email, rol, nombre, hashContrasena: hash });
  const profesor = await usuario('profe@ue.test', Rol.PROFESOR, 'Ana Profesora');
  const otroProfesor = await usuario('otro@ue.test', Rol.PROFESOR, 'Luis Profesor');
  const secretaria = await usuario('secre@ue.test', Rol.SECRETARIA, 'Rosa Secretaria');
  const padre = await usuario('padre@ue.test', Rol.PADRE, 'Juan Padre');
  const admin = await usuario('admin@ue.test', Rol.ADMINISTRADOR, 'Admin');

  const ue = await ds
    .getRepository(UnidadEducativa)
    .save({ nombre: 'U. E. de prueba', codigoSie: '80000001' });
  const gestion = await ds.getRepository(Gestion).save({ anio: 2026, unidadEducativa: ue });
  const dims = await ds
    .getRepository(DimensionEvaluacion)
    .save(DIMENSIONES_RM_001_2026.map((d) => ({ ...d, gestion })));
  const porCodigo = Object.fromEntries(dims.map((d) => [d.codigo, d]));
  const [t1, , t3] = await ds.getRepository(Trimestre).save([
    { gestion, numero: 1 },
    { gestion, numero: 2 },
    { gestion, numero: 3, cerrado: true },
  ]);
  const curso = await ds
    .getRepository(Curso)
    .save({ gestion, nivel: Nivel.SECUNDARIA, anioEscolaridad: 3, paralelo: 'A' });
  const otroCurso = await ds
    .getRepository(Curso)
    .save({ gestion, nivel: Nivel.SECUNDARIA, anioEscolaridad: 3, paralelo: 'B' });
  const matematica = await ds.getRepository(Materia).save({ nombre: 'Matemática', curso });
  const lenguaje = await ds.getRepository(Materia).save({ nombre: 'Lenguaje', curso });
  await ds.getRepository(AsignacionMateria).save([
    { materia: matematica, profesor },
    { materia: lenguaje, profesor: otroProfesor },
  ]);
  const estudiantes = await ds.getRepository(Estudiante).save([
    { codigoRude: 'RUDE000001', nombres: 'Ana', apellidos: 'Quispe', curso, gestion },
    { codigoRude: 'RUDE000002', nombres: 'Luis', apellidos: 'Mamani', curso, gestion },
    { codigoRude: 'RUDE000003', nombres: 'Eva', apellidos: 'Condori', curso, gestion },
  ]);
  const ajeno = await ds.getRepository(Estudiante).save({
    codigoRude: 'RUDE000004',
    nombres: 'Otro',
    apellidos: 'Curso',
    curso: otroCurso,
    gestion,
  });
  await ds.getRepository(VinculoPadre).save({ padreId: padre.id, estudianteId: estudiantes[0].id });

  const act = (nombre: string, codigo: string, trimestre = t1, materia = matematica) =>
    ds.getRepository(Actividad).save({ nombre, materia, trimestre, dimension: porCodigo[codigo] });
  const actividades = {
    ser: await act('Participación', 'SER'),
    saber1: await act('Examen 1', 'SABER'),
    saber2: await act('Examen 2', 'SABER'),
    hacer: await act('Proyecto', 'HACER'),
    auto: await act('Autoevaluación', 'AUTOEVALUACION'),
    cerrada: await act('Examen T3', 'SABER', t3),
    lenguaje: await act('Lectura', 'SABER', t1, lenguaje),
  };
  return {
    profesor,
    otroProfesor,
    secretaria,
    padre,
    admin,
    matematica,
    lenguaje,
    t1,
    t3,
    estudiantes,
    ajeno,
    actividades,
  };
}

export type Escenario = Awaited<ReturnType<typeof escenario>>;

export async function token(app: INestApplication<App>, email: string): Promise<string> {
  const r = await request(app.getHttpServer())
    .post('/api/auth/login')
    .send({ email, contrasena: CONTRASENA })
    .expect(200);
  return (r.body as { token: string }).token;
}

/**
 * Solicitud de edición ya aprobada por el administrador (decisión D16): habilita una corrección de la nota del
 * estudiante en la actividad. El flujo completo por la API se prueba en solicitudes.e2e-spec.ts.
 */
export async function habilitarCorreccion(
  ds: DataSource,
  e: Escenario,
  actividadId: number,
  estudianteId: number,
) {
  const solicitud = await ds.getRepository(SolicitudEdicion).save({
    actividad: { id: actividadId },
    profesor: { id: e.profesor.id },
    motivo: 'Revisión del examen',
    estado: EstadoSolicitud.APROBADA,
    resueltoEn: new Date(),
    resueltoPor: { id: e.admin.id },
  });
  await ds
    .getRepository(SolicitudEdicionEstudiante)
    .save({ solicitud, estudiante: { id: estudianteId } });
}
