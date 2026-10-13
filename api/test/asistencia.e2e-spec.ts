import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { DataSource } from 'typeorm';
import { Asistencia } from '../src/database/entities';
import { hoyEnBolivia } from '../src/modules/asistencia/reglas-asistencia';
import { crearApp, escenario, limpiar, token, type Escenario } from './utils';

/** US-19 (T-036): registro de asistencia por clase y porcentaje por estudiante. */
describe('Registro de asistencia (US-19)', () => {
  let app: INestApplication;
  let ds: DataSource;
  let e: Escenario;
  const tk: Record<string, string> = {};
  const http = () => request(app.getHttpServer());
  const url = (fecha: string, materiaId = e.matematica.id) =>
    `/api/asistencias/materias/${materiaId}/fechas/${fecha}`;
  const registrar = (fecha: string, registros: unknown, quien = 'profesor', materiaId?: number) =>
    http()
      .put(url(fecha, materiaId))
      .set('Authorization', `Bearer ${tk[quien]}`)
      .send({ registros });
  /** Lista completa del curso: el primero con el estado dado y el resto presentes. */
  const lista = (primero: string) =>
    e.estudiantes.map((est, i) => ({
      estudianteId: est.id,
      estado: i === 0 ? primero : 'PRESENTE',
    }));

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
  });

  afterAll(() => app.close());

  it('debe mostrar la lista de la clase sin estados antes de tomar asistencia', async () => {
    const r = await http()
      .get(url('2026-03-02'))
      .set('Authorization', `Bearer ${tk.profesor}`)
      .expect(200);
    expect(r.body.fecha).toBe('2026-03-02');
    const filas = r.body.filas as { estudiante: string; estado: unknown }[];
    expect(filas.map((f) => f.estudiante)).toEqual(['Condori, Eva', 'Mamani, Luis', 'Quispe, Ana']);
    expect(filas.every((f) => f.estado === null)).toBe(true);
  });

  it('debe guardar la asistencia de la fecha con presente, ausente o licencia (criterio 1)', async () => {
    await registrar('2026-03-02', lista('AUSENTE')).expect(200, {
      fecha: '2026-03-02',
      guardados: 3,
    });
    const r = await http()
      .get(url('2026-03-02'))
      .set('Authorization', `Bearer ${tk.profesor}`)
      .expect(200);
    const porId = Object.fromEntries(
      (r.body.filas as { estudianteId: number; estado: string }[]).map((f) => [
        f.estudianteId,
        f.estado,
      ]),
    );
    expect(porId[e.estudiantes[0].id]).toBe('AUSENTE');
    expect(porId[e.estudiantes[1].id]).toBe('PRESENTE');
  });

  it('debe permitir corregir la asistencia de una fecha ya registrada sin duplicarla', async () => {
    await registrar('2026-03-02', lista('LICENCIA')).expect(200);
    const filas = await ds.getRepository(Asistencia).find({
      where: { estudiante: { id: e.estudiantes[0].id }, materia: { id: e.matematica.id } },
    });
    expect(filas).toHaveLength(1);
    expect(filas[0].estado).toBe('LICENCIA');
  });

  it('debe calcular el porcentaje de cada estudiante: (presentes + licencias) / clases (criterio 2)', async () => {
    await registrar('2026-03-03', lista('AUSENTE')).expect(200);
    await registrar('2026-03-04', lista('AUSENTE')).expect(200);
    await registrar('2026-03-05', lista('PRESENTE')).expect(200);
    const r = await http()
      .get(`/api/asistencias/materias/${e.matematica.id}/porcentajes`)
      .set('Authorization', `Bearer ${tk.secretaria}`)
      .expect(200);
    const primero = (r.body as { estudianteId: number }[]).find(
      (f) => f.estudianteId === e.estudiantes[0].id,
    );
    // 2026-03-02 licencia, 03 ausente, 04 ausente, 05 presente → 2 de 4 = 50 %
    expect(primero).toMatchObject({
      presentes: 1,
      licencias: 1,
      ausentes: 2,
      clases: 4,
      porcentaje: 50,
    });
    const otro = (r.body as { estudianteId: number }[]).find(
      (f) => f.estudianteId === e.estudiantes[1].id,
    );
    expect(otro).toMatchObject({ clases: 4, porcentaje: 100 });
  });

  it('debe filtrar el porcentaje por un rango de fechas', async () => {
    const r = await http()
      .get(
        `/api/asistencias/materias/${e.matematica.id}/porcentajes?desde=2026-03-04&hasta=2026-03-05`,
      )
      .set('Authorization', `Bearer ${tk.profesor}`)
      .expect(200);
    const primero = (r.body as { estudianteId: number }[]).find(
      (f) => f.estudianteId === e.estudiantes[0].id,
    );
    expect(primero).toMatchObject({ clases: 2, porcentaje: 50 });
  });

  it('debe impedir registrar asistencia en una fecha futura (criterio 3)', async () => {
    const manana = new Date(`${hoyEnBolivia(new Date())}T12:00:00Z`);
    manana.setUTCDate(manana.getUTCDate() + 1);
    const r = await registrar(manana.toISOString().slice(0, 10), lista('PRESENTE')).expect(422);
    expect(r.body.message).toBe('No se puede registrar asistencia de una fecha futura');
  });

  it('debe aceptar la fecha de hoy', async () => {
    await registrar(hoyEnBolivia(new Date()), lista('PRESENTE')).expect(200);
  });

  it('debe exigir la lista completa del curso', async () => {
    const r = await registrar('2026-03-06', lista('PRESENTE').slice(1)).expect(422);
    const omitido = e.estudiantes[0];
    expect(r.body.message).toBe(`Falta la asistencia de: ${omitido.apellidos}, ${omitido.nombres}`);
  });

  it('debe rechazar estudiantes de otro curso y estudiantes repetidos', async () => {
    await registrar('2026-03-06', [
      ...lista('PRESENTE'),
      { estudianteId: e.ajeno.id, estado: 'PRESENTE' },
    ]).expect(422);
    await registrar('2026-03-06', [...lista('PRESENTE'), lista('AUSENTE')[0]]).expect(422);
  });

  it.each([
    ['una fecha inválida', '2026-02-30'],
    ['un formato de fecha distinto', '02-03-2026'],
  ])('debe rechazar con 400 %s', async (_caso, fecha) => {
    await registrar(fecha, lista('PRESENTE')).expect(400);
  });

  it('debe rechazar con 400 un estado desconocido', async () => {
    await registrar('2026-03-06', lista('TARDE')).expect(400);
  });

  it('debe rechazar una fecha que no es del año de la gestión', async () => {
    await registrar('2025-11-03', lista('PRESENTE')).expect(422);
  });

  it('debe responder 403 al profesor que no está asignado a la materia', async () => {
    await registrar('2026-03-06', lista('PRESENTE'), 'otro').expect(403);
  });

  it('debe responder 404 si la materia no existe', async () => {
    await registrar('2026-03-06', lista('PRESENTE'), 'profesor', 9999).expect(404);
  });
});
