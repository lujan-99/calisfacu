import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { DataSource } from 'typeorm';
import { Nota } from '../src/database/entities';
import { crearApp, escenario, limpiar, token, type Escenario } from './utils';

describe('Registro de notas (US-01) y cálculo trimestral (US-02)', () => {
  let app: INestApplication;
  let ds: DataSource;
  let e: Escenario;
  let tk: string;
  const http = () => request(app.getHttpServer());
  const planilla = (actividadId: number, notas: { estudianteId: number; valor: unknown }[]) =>
    http()
      .post('/api/notas/planilla')
      .set('Authorization', `Bearer ${tk}`)
      .send({ actividadId, notas });

  beforeAll(async () => {
    ({ app, ds } = await crearApp());
    await limpiar(ds);
    e = await escenario(ds);
    tk = await token(app, 'profe@ue.test');
  });

  afterAll(() => app.close());

  it('debe mostrar la planilla con todos los estudiantes del curso, ordenados por apellido', async () => {
    const r = await http()
      .get(`/api/notas/actividades/${e.actividades.ser.id}`)
      .set('Authorization', `Bearer ${tk}`)
      .expect(200);
    expect(r.body.actividad).toEqual({
      id: e.actividades.ser.id,
      nombre: 'Participación',
      dimension: 'Ser',
      materia: 'Matemática',
      materiaId: e.matematica.id,
      curso: 'Secundaria 3.º «A»',
      trimestre: { id: e.t1.id, numero: 1, cerrado: false },
    });
    expect((r.body as { filas: { estudiante: string }[] }).filas.map((f) => f.estudiante)).toEqual([
      'Condori, Eva',
      'Mamani, Luis',
      'Quispe, Ana',
    ]);
  });

  it.each([0, 101, 'ochenta', 70.123])('debe rechazar con 400 la nota %p', async (valor) => {
    await planilla(e.actividades.ser.id, [{ estudianteId: e.estudiantes[0].id, valor }]).expect(
      400,
    );
  });

  it('debe rechazar una nota fuera de 1 a 100 aun si se escribe directo en la base', async () => {
    await expect(
      ds.query(`INSERT INTO notas (actividad_id, estudiante_id, valor) VALUES ($1, $2, 0)`, [
        e.actividades.ser.id,
        e.estudiantes[0].id,
      ]),
    ).rejects.toThrow('notas_valor_escala');
  });

  it('debe guardar todas o ninguna: un estudiante de otro curso anula la planilla (US-01, criterio 3)', async () => {
    await planilla(e.actividades.ser.id, [
      { estudianteId: e.estudiantes[0].id, valor: 80 },
      { estudianteId: e.ajeno.id, valor: 80 },
    ]).expect(422);
    expect(await ds.getRepository(Nota).count()).toBe(0);
  });

  it('debe rechazar un estudiante repetido en la misma planilla', async () => {
    await planilla(e.actividades.ser.id, [
      { estudianteId: e.estudiantes[0].id, valor: 80 },
      { estudianteId: e.estudiantes[0].id, valor: 90 },
    ]).expect(422);
  });

  it('debe responder 404 si la actividad no existe', async () => {
    await planilla(9999, [{ estudianteId: e.estudiantes[0].id, valor: 80 }]).expect(404);
  });

  it('debe impedir registrar notas en un trimestre cerrado', async () => {
    const r = await planilla(e.actividades.cerrada.id, [
      { estudianteId: e.estudiantes[0].id, valor: 80 },
    ]).expect(422);
    expect(r.body.message).toContain('trimestre está cerrado');
  });

  it('debe guardar la planilla completa y no permitir sobrescribir una nota ya registrada', async () => {
    const todos = (valor: number) => e.estudiantes.map((s) => ({ estudianteId: s.id, valor }));
    await planilla(e.actividades.ser.id, todos(80)).expect(201, { guardadas: 3 });
    await planilla(e.actividades.ser.id, todos(90)).expect(422);
  });

  it('debe calcular la nota trimestral con las dimensiones de la gestión (RM 001/2026)', async () => {
    const todos = (valor: number) => e.estudiantes.map((s) => ({ estudianteId: s.id, valor }));
    await planilla(e.actividades.saber1.id, todos(70)).expect(201);
    await planilla(e.actividades.saber2.id, todos(90)).expect(201);
    await planilla(e.actividades.hacer.id, todos(80)).expect(201);

    const parcial = await http()
      .get(`/api/calculo/materias/${e.matematica.id}/trimestres/${e.t1.id}`)
      .set('Authorization', `Bearer ${tk}`)
      .expect(200);
    expect(parcial.body[0]).toMatchObject({ nota: null, pendientes: ['AUTOEVALUACION'] });

    await planilla(e.actividades.auto.id, todos(100)).expect(201);
    const r = await http()
      .get(`/api/calculo/materias/${e.matematica.id}/trimestres/${e.t1.id}`)
      .set('Authorization', `Bearer ${tk}`)
      .expect(200);
    // Ser 80 → 8; Saber (70+90)/2 = 80 → 36; Hacer 80 → 32; Autoevaluación 100 → 5. Total 81.
    expect(r.body[0]).toMatchObject({
      estudiante: 'Condori, Eva',
      nota: 81,
      aprobado: true,
      pendientes: [],
    });
  });

  describe('crear actividad', () => {
    const crear = (cuerpo: object, t = tk) =>
      http().post('/api/notas/actividades').set('Authorization', `Bearer ${t}`).send(cuerpo);
    const base = () => ({
      materiaId: e.matematica.id,
      trimestreId: e.t1.id,
      dimensionId: e.actividades.ser.id,
      nombre: 'Práctica 3',
    });

    it('debe crear una actividad en la materia del profesor', async () => {
      const dims = await ds.query<{ id: number }[]>(
        `SELECT id FROM dimensiones_evaluacion WHERE codigo = 'SABER'`,
      );
      const r = await crear({ ...base(), dimensionId: dims[0].id }).expect(201);
      expect(r.body).toEqual({ id: expect.any(Number), nombre: 'Práctica 3' });
    });

    it('debe rechazar una materia de otro profesor, un trimestre cerrado y datos inexistentes', async () => {
      const dims = await ds.query<{ id: number }[]>(
        `SELECT id FROM dimensiones_evaluacion LIMIT 1`,
      );
      const ok = { ...base(), dimensionId: dims[0].id };
      await crear({ ...ok, materiaId: e.lenguaje.id }).expect(403);
      await crear({ ...ok, trimestreId: e.t3.id }).expect(422);
      await crear({ ...ok, trimestreId: 9999 }).expect(404);
      await crear({ ...ok, nombre: '' }).expect(400);
    });

    it('debe rechazar una dimensión de otra gestión', async () => {
      const [ue] = await ds.query<{ id: number }[]>(`SELECT id FROM unidades_educativas LIMIT 1`);
      const [g] = await ds.query<{ id: number }[]>(
        `INSERT INTO gestiones (anio, unidad_educativa_id) VALUES (2027, $1) RETURNING id`,
        [ue.id],
      );
      const [d] = await ds.query<{ id: number }[]>(
        `INSERT INTO dimensiones_evaluacion (codigo, nombre, puntaje_maximo, gestion_id) VALUES ('SER', 'Ser', 10, $1) RETURNING id`,
        [g.id],
      );
      await crear({ ...base(), dimensionId: d.id }).expect(422);
    });
  });

  it('debe responder 404 si el trimestre no es de la gestión de la materia', async () => {
    await http()
      .get(`/api/calculo/materias/${e.matematica.id}/trimestres/9999`)
      .set('Authorization', `Bearer ${tk}`)
      .expect(404);
  });
});
