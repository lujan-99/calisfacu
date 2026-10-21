import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { DataSource } from 'typeorm';
import { Nota } from '../src/database/entities';
import { crearApp, escenario, limpiar, token, type Escenario } from './utils';

interface Solicitud {
  id: number;
  estado: string;
  estudiantes: {
    estudianteId: number;
    estudianteNombre: string;
    notaActual: number;
    usada: boolean;
  }[];
  observacionAdmin: string | null;
  fechaResolucion: string | null;
}

/** Decisión D16: el profesor pide editar notas registradas y el administrador aprueba o rechaza. */
describe('Solicitudes de edición de notas (US-04, decisión D16)', () => {
  let app: INestApplication;
  let ds: DataSource;
  let e: Escenario;
  const tk: Record<string, string> = {};
  const http = () => request(app.getHttpServer());
  const como = (quien: string) => ({ Authorization: `Bearer ${tk[quien]}` });
  const pedir = (cuerpo: object, quien = 'profesor') =>
    http().post('/api/solicitudes-edicion').set(como(quien)).send(cuerpo);
  const nueva = (estudianteIds: number[], actividadId = e.actividades.saber1.id) =>
    pedir({ actividadId, estudianteIds, motivo: 'Revisión del examen con el estudiante' });
  const notaDe = async (estudianteId: number) =>
    (
      await ds.getRepository(Nota).findOneByOrFail({
        estudiante: { id: estudianteId },
        actividad: { id: e.actividades.saber1.id },
      })
    ).id;
  let primera: Solicitud;

  beforeAll(async () => {
    ({ app, ds } = await crearApp());
    await limpiar(ds);
    e = await escenario(ds);
    for (const [k, email] of Object.entries({
      profesor: 'profe@ue.test',
      otro: 'otro@ue.test',
      secretaria: 'secre@ue.test',
      admin: 'admin@ue.test',
    })) {
      tk[k] = await token(app, email);
    }
    await http()
      .post('/api/notas/planilla')
      .set(como('profesor'))
      .send({
        actividadId: e.actividades.saber1.id,
        notas: [
          { estudianteId: e.estudiantes[0].id, valor: 70 },
          { estudianteId: e.estudiantes[1].id, valor: 55 },
        ],
      })
      .expect(201);
  });

  afterAll(() => app.close());

  it('debe crear la solicitud del profesor con sus estudiantes y notas actuales', async () => {
    const r = await nueva([e.estudiantes[0].id, e.estudiantes[1].id]).expect(201);
    primera = r.body as Solicitud;
    expect(r.body).toMatchObject({
      estado: 'PENDIENTE',
      profesorNombre: 'Ana Profesora',
      actividadId: e.actividades.saber1.id,
      actividadNombre: 'Examen 1',
      materiaNombre: 'Matemática',
      cursoNombre: 'Secundaria 3.º «A»',
      dimension: 'Saber',
      motivo: 'Revisión del examen con el estudiante',
      fechaResolucion: null,
      observacionAdmin: null,
    });
    expect(primera.estudiantes).toEqual([
      {
        estudianteId: e.estudiantes[0].id,
        estudianteNombre: 'Quispe, Ana',
        notaActual: 70,
        usada: false,
      },
      {
        estudianteId: e.estudiantes[1].id,
        estudianteNombre: 'Mamani, Luis',
        notaActual: 55,
        usada: false,
      },
    ]);
  });

  it('debe pedir edición solo de notas ya registradas', async () => {
    const r = await nueva([e.estudiantes[2].id]).expect(422);
    expect(r.body.message).toBe('Solo se puede pedir la edición de notas ya registradas');
  });

  it('debe rechazar a un estudiante que ya tiene una solicitud abierta en la actividad', async () => {
    const r = await nueva([e.estudiantes[0].id]).expect(409);
    expect(r.body.message).toBe('Ya hay una solicitud abierta para Quispe, Ana en esta actividad');
  });

  it('debe exigir motivo y al menos un estudiante', async () => {
    await pedir({
      actividadId: e.actividades.saber1.id,
      estudianteIds: [e.estudiantes[0].id],
      motivo: ' ',
    }).expect(400);
    await pedir({ actividadId: e.actividades.saber1.id, estudianteIds: [], motivo: 'x' }).expect(
      400,
    );
  });

  it('debe negar la solicitud al profesor no asignado y a la secretaria', async () => {
    await pedir(
      { actividadId: e.actividades.saber1.id, estudianteIds: [e.estudiantes[0].id], motivo: 'x' },
      'otro',
    ).expect(403);
    await pedir(
      { actividadId: e.actividades.saber1.id, estudianteIds: [e.estudiantes[0].id], motivo: 'x' },
      'secretaria',
    ).expect(403);
  });

  it('debe mostrar a cada profesor solo sus solicitudes y al administrador todas', async () => {
    const propias = await http()
      .get(`/api/solicitudes-edicion?actividadId=${e.actividades.saber1.id}`)
      .set(como('profesor'))
      .expect(200);
    expect((propias.body as Solicitud[]).map((s) => s.id)).toEqual([primera.id]);
    const ajenas = await http().get('/api/solicitudes-edicion').set(como('otro')).expect(200);
    expect(ajenas.body).toEqual([]);
    const pendientes = await http()
      .get('/api/solicitudes-edicion?estado=PENDIENTE')
      .set(como('admin'))
      .expect(200);
    expect((pendientes.body as Solicitud[]).map((s) => s.id)).toEqual([primera.id]);
  });

  it('debe dejar aprobar solo al administrador y una sola vez', async () => {
    await http()
      .patch(`/api/solicitudes-edicion/${primera.id}/aprobar`)
      .set(como('profesor'))
      .expect(403);
    const r = await http()
      .patch(`/api/solicitudes-edicion/${primera.id}/aprobar`)
      .set(como('admin'))
      .expect(200);
    expect(r.body).toMatchObject({ estado: 'APROBADA', fechaResolucion: expect.any(String) });
    const otra = await http()
      .patch(`/api/solicitudes-edicion/${primera.id}/aprobar`)
      .set(como('admin'))
      .expect(409);
    expect(otra.body.message).toBe('La solicitud ya fue resuelta');
  });

  it('debe habilitar una corrección por estudiante aprobado y marcarla como usada', async () => {
    await http()
      .patch(`/api/notas/${await notaDe(e.estudiantes[0].id)}/correccion`)
      .set(como('profesor'))
      .send({ valor: 85, motivo: 'Revisión del examen' })
      .expect(200);
    const r = await http()
      .get(`/api/solicitudes-edicion?actividadId=${e.actividades.saber1.id}`)
      .set(como('profesor'))
      .expect(200);
    expect((r.body as Solicitud[])[0].estudiantes.map((x) => [x.notaActual, x.usada])).toEqual([
      [85, true],
      [55, false],
    ]);
  });

  it('debe exigir una observación para rechazar y entonces no habilitar la corrección', async () => {
    const s = (await nueva([e.estudiantes[0].id]).expect(201)).body as Solicitud;
    await http()
      .patch(`/api/solicitudes-edicion/${s.id}/rechazar`)
      .set(como('admin'))
      .send({ observacion: '' })
      .expect(400);
    const r = await http()
      .patch(`/api/solicitudes-edicion/${s.id}/rechazar`)
      .set(como('admin'))
      .send({ observacion: 'Falta la hoja de respuestas' })
      .expect(200);
    expect(r.body).toMatchObject({
      estado: 'RECHAZADA',
      observacionAdmin: 'Falta la hoja de respuestas',
    });
    await http()
      .patch(`/api/notas/${await notaDe(e.estudiantes[0].id)}/correccion`)
      .set(como('profesor'))
      .send({ valor: 90, motivo: 'Otra revisión' })
      .expect(422);
  });

  it('debe responder 404 a una solicitud inexistente y rechazar un trimestre cerrado', async () => {
    await http().patch('/api/solicitudes-edicion/9999/aprobar').set(como('admin')).expect(404);
    await nueva([e.estudiantes[0].id], e.actividades.cerrada.id).expect(422);
  });
});
