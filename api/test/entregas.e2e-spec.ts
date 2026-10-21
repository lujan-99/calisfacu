import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { DataSource } from 'typeorm';
import { crearApp, escenario, limpiar, token, type Escenario } from './utils';

interface Entrega {
  materia: string;
  curso: string;
  profesor: string;
  trimestreNumero: number;
  estado: string;
  fechaEntrega: string | null;
  totalActividades: number;
  totalEstudiantes: number;
  totalNotasRegistradas: number;
  totalNotasRequeridas: number;
  notasFaltantes: number;
}

/** US-10 (T-040): control de entrega de notas por curso. */
describe('Control de entrega de notas (US-10)', () => {
  let app: INestApplication;
  let ds: DataSource;
  let e: Escenario;
  const tk: Record<string, string> = {};
  const http = () => request(app.getHttpServer());
  const entregar = (trimestreId: number, quien = 'profesor', materiaId = e.matematica.id) =>
    http()
      .post(`/api/entregas/materias/${materiaId}/entregar`)
      .set('Authorization', `Bearer ${tk[quien]}`)
      .send({ trimestreId });
  const control = (qs = '') =>
    http().get(`/api/entregas${qs}`).set('Authorization', `Bearer ${tk.secretaria}`).expect(200);

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

  it('debe mostrar por curso cada materia con su profesor y su estado (criterio 1)', async () => {
    const r = await control(`?trimestreId=${e.t1.id}`);
    expect((r.body as Entrega[]).map((x) => [x.curso, x.materia, x.profesor, x.estado])).toEqual([
      ['Secundaria 3.º «A»', 'Lenguaje', 'Luis Profesor', 'PENDIENTE'],
      ['Secundaria 3.º «A»', 'Matemática', 'Ana Profesora', 'PENDIENTE'],
    ]);
    expect((r.body as Entrega[])[1]).toMatchObject({
      trimestreNumero: 1,
      fechaEntrega: null,
      totalActividades: 5,
      totalEstudiantes: 3,
      totalNotasRegistradas: 0,
      totalNotasRequeridas: 15,
      notasFaltantes: 15,
    });
  });

  it('debe usar el primer trimestre abierto de la última gestión si no se indica', async () => {
    const r = await control();
    expect((r.body as Entrega[]).every((x) => x.trimestreNumero === 1)).toBe(true);
  });

  it('debe rechazar la entrega si faltan notas (criterio 2)', async () => {
    const r = await entregar(e.t1.id).expect(422);
    expect(r.body.message).toContain('faltan 15 notas por registrar');
  });

  it('debe aceptar la entrega cuando todos tienen nota en todas las actividades', async () => {
    const a = e.actividades;
    for (const actividad of [a.ser, a.saber1, a.saber2, a.hacer, a.auto]) {
      await http()
        .post('/api/notas/planilla')
        .set('Authorization', `Bearer ${tk.profesor}`)
        .send({
          actividadId: actividad.id,
          notas: e.estudiantes.map((x) => ({ estudianteId: x.id, valor: 70 })),
        })
        .expect(201);
    }
    const r = await entregar(e.t1.id).expect(201);
    expect(r.body).toMatchObject({
      exito: true,
      entrega: { materia: 'Matemática', estado: 'ENTREGADO', notasFaltantes: 0 },
    });
    expect(r.body.entrega.fechaEntrega).toEqual(expect.any(String));

    const lista = (await control(`?trimestreId=${e.t1.id}`)).body as Entrega[];
    expect(lista.map((x) => [x.materia, x.estado])).toEqual([
      ['Lenguaje', 'PENDIENTE'],
      ['Matemática', 'ENTREGADO'],
    ]);
  });

  it('debe mostrar al profesor el estado de su materia', async () => {
    const r = await http()
      .get(`/api/entregas/materias/${e.matematica.id}?trimestreId=${e.t1.id}`)
      .set('Authorization', `Bearer ${tk.profesor}`)
      .expect(200);
    expect(r.body).toMatchObject({ materia: 'Matemática', estado: 'ENTREGADO' });
  });

  it('debe responder 409 si la materia ya se entregó', async () => {
    const r = await entregar(e.t1.id).expect(409);
    expect(r.body.message).toBe('La materia ya se entregó en este trimestre');
  });

  it('debe rechazar la entrega en un trimestre cerrado', async () => {
    const r = await entregar(e.t3.id).expect(422);
    expect(r.body.message).toBe('El trimestre está cerrado: ya no se pueden entregar notas');
  });

  it('debe rechazar la entrega del profesor no asignado y de la secretaria', async () => {
    await entregar(e.t1.id, 'otro').expect(403);
    await entregar(e.t1.id, 'secretaria').expect(403);
  });

  it('debe validar el trimestre y la materia', async () => {
    await entregar(99999).expect(404);
    await entregar(e.t1.id, 'profesor', 99999).expect(404);
    await http()
      .post(`/api/entregas/materias/${e.matematica.id}/entregar`)
      .set('Authorization', `Bearer ${tk.profesor}`)
      .send({})
      .expect(400);
  });
});
