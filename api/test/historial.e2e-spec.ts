import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { DataSource } from 'typeorm';
import { Actividad, DimensionEvaluacion } from '../src/database/entities';
import { crearApp, escenario, limpiar, token, type Escenario } from './utils';

/** US-03 (T-034): historial académico del estudiante por trimestre, con control de acceso. */
describe('Historial académico del estudiante (US-03)', () => {
  let app: INestApplication;
  let ds: DataSource;
  let e: Escenario;
  const tk: Record<string, string> = {};
  const http = () => request(app.getHttpServer());
  const historial = (estudianteId: number, quien = 'profesor') =>
    http()
      .get(`/api/estudiantes/${estudianteId}/historial`)
      .set('Authorization', `Bearer ${tk[quien]}`);
  const registrar = (actividadId: number, valor: number, quien: string) =>
    http()
      .post('/api/notas/planilla')
      .set('Authorization', `Bearer ${tk[quien]}`)
      .send({ actividadId, notas: [{ estudianteId: e.estudiantes[0].id, valor }] })
      .expect(201);

  beforeAll(async () => {
    ({ app, ds } = await crearApp());
    await limpiar(ds);
    e = await escenario(ds);
    for (const [k, email] of Object.entries({
      profesor: 'profe@ue.test',
      otro: 'otro@ue.test',
      secretaria: 'secre@ue.test',
    })) {
      tk[k] = await token(app, email);
    }

    // Matemática, 1.er trimestre: Ser 8 + Saber 36 + Hacer 24 + Autoevaluación 5 = 73.
    const a = e.actividades;
    for (const [actividad, valor] of [
      [a.ser, 80],
      [a.saber1, 70],
      [a.saber2, 90],
      [a.hacer, 60],
      [a.auto, 100],
    ] as const) {
      await registrar(actividad.id, valor, 'profesor');
    }
    // Lenguaje, 1.er trimestre: Ser 5 + Saber 27 + Hacer 20 + Autoevaluación 3 = 55.
    const dims = await ds.getRepository(DimensionEvaluacion).find();
    const dim = (codigo: string) => dims.find((d) => d.codigo === codigo)!;
    const actividad = (nombre: string, codigo: string) =>
      ds
        .getRepository(Actividad)
        .save({ nombre, materia: e.lenguaje, trimestre: e.t1, dimension: dim(codigo) });
    await registrar(a.lenguaje.id, 60, 'otro');
    await registrar((await actividad('Debate', 'SER')).id, 50, 'otro');
    await registrar((await actividad('Ensayo', 'HACER')).id, 50, 'otro');
    await registrar((await actividad('Autoevaluación', 'AUTOEVALUACION')).id, 60, 'otro');
  });

  afterAll(() => app.close());

  it('debe mostrar las notas y promedios de cada trimestre en orden cronológico (criterio 1)', async () => {
    const r = await historial(e.estudiantes[0].id).expect(200);
    expect(r.body.estudiante).toMatchObject({
      id: e.estudiantes[0].id,
      codigoRude: 'RUDE000001',
      nombres: 'Ana',
      apellidos: 'Quispe',
      curso: { nombre: 'Secundaria 3.º «A»' },
      gestion: { anio: 2026 },
    });
    const trimestres = r.body.trimestres as {
      numero: number;
      cerrado: boolean;
      promedioTrimestral: number | null;
      materias: { materia: string; profesor: string; nota: number | null; pendientes: string[] }[];
    }[];
    expect(trimestres.map((t) => t.numero)).toEqual([1, 2, 3]);
    expect(trimestres[2].cerrado).toBe(true);

    const [t1, t2] = trimestres;
    expect(t1.materias.map((m) => [m.materia, m.profesor, m.nota])).toEqual([
      ['Lenguaje', 'Luis Profesor', 55],
      ['Matemática', 'Ana Profesora', 73],
    ]);
    expect(t1.promedioTrimestral).toBe(64);
    expect(t2.promedioTrimestral).toBeNull();
    expect(t2.materias[0].pendientes).toEqual(['SER', 'SABER', 'HACER', 'AUTOEVALUACION']);
    expect(r.body).toMatchObject({
      promedioAnual: 64,
      tendencia: 'PENDIENTE',
      estadoAnual: 'PROMOVIDO',
    });
  });

  it('debe detallar los puntos de cada dimensión con su puntaje máximo', async () => {
    const r = await historial(e.estudiantes[0].id).expect(200);
    const matematica = (
      r.body.trimestres[0].materias as { materia: string; dimensiones: unknown[] }[]
    ).find((m) => m.materia === 'Matemática');
    expect(matematica?.dimensiones).toEqual([
      { codigo: 'SER', nombre: 'Ser', puntos: 8, puntajeMaximo: 10 },
      { codigo: 'SABER', nombre: 'Saber', puntos: 36, puntajeMaximo: 45 },
      { codigo: 'HACER', nombre: 'Hacer', puntos: 24, puntajeMaximo: 40 },
      { codigo: 'AUTOEVALUACION', nombre: 'Autoevaluación', puntos: 5, puntajeMaximo: 5 },
    ]);
  });

  it('debe mostrar el historial completo a cualquier profesor que le da clases', async () => {
    const r = await historial(e.estudiantes[0].id, 'otro').expect(200);
    expect(r.body.trimestres[0].materias).toHaveLength(2);
  });

  it('debe permitir a la secretaria consultar el historial', async () => {
    await historial(e.ajeno.id, 'secretaria').expect(200);
  });

  it('debe responder 403 si el estudiante no cursa ninguna materia del profesor (criterio 2)', async () => {
    const r = await historial(e.ajeno.id).expect(403);
    expect(r.body.message).toBe('Usted no da clases a este estudiante');
  });

  it('debe responder 404 si el estudiante no existe', async () => {
    await historial(99999).expect(404);
  });
});
