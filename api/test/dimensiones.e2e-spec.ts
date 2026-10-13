import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { DataSource } from 'typeorm';
import { DimensionEvaluacion, Gestion } from '../src/database/entities';
import { DIMENSIONES_RM_001_2026 } from '../src/modules/calculo/reglas';
import { crearApp, escenario, limpiar, token, type Escenario } from './utils';

/** US-18, criterios 6 y 7 (T-015): dimensiones de evaluación configurables por gestión. */
describe('Configuración de dimensiones por gestión (US-18)', () => {
  let app: INestApplication;
  let ds: DataSource;
  let e: Escenario;
  let gestion2026: number;
  let gestionNueva: number;
  const tk: Record<string, string> = {};
  const http = () => request(app.getHttpServer());
  const rm2026 = DIMENSIONES_RM_001_2026.map(({ codigo, nombre, puntajeMaximo, orden }) => ({
    codigo,
    nombre,
    puntajeMaximo,
    orden,
  }));
  const configurar = (gestionId: number, dimensiones: unknown, quien = 'admin') =>
    http()
      .put(`/api/gestiones/${gestionId}/dimensiones`)
      .set('Authorization', `Bearer ${tk[quien]}`)
      .send({ dimensiones });
  const puntajes = async (gestionId: number) =>
    (
      await ds.getRepository(DimensionEvaluacion).find({
        where: { gestion: { id: gestionId } },
        order: { orden: 'ASC' },
      })
    ).map((d) => [d.codigo, d.puntajeMaximo]);

  beforeAll(async () => {
    ({ app, ds } = await crearApp());
    await limpiar(ds);
    e = await escenario(ds);
    gestion2026 = e.t1.gestion.id;
    const nueva = await ds
      .getRepository(Gestion)
      .save({ anio: 2027, unidadEducativa: e.t1.gestion.unidadEducativa });
    gestionNueva = nueva.id;
    for (const [k, email] of Object.entries({
      admin: 'admin@ue.test',
      profesor: 'profe@ue.test',
      secretaria: 'secre@ue.test',
      padre: 'padre@ue.test',
    })) {
      tk[k] = await token(app, email);
    }
  });

  afterAll(() => app.close());

  it('debe listar las dimensiones de la gestión en orden', async () => {
    const r = await http()
      .get(`/api/gestiones/${gestion2026}/dimensiones`)
      .set('Authorization', `Bearer ${tk.profesor}`)
      .expect(200);
    expect(r.body).toEqual(rm2026.map((d) => ({ ...d, id: expect.any(Number) as number })));
  });

  it('debe responder 404 al consultar una gestión que no existe', async () => {
    await http()
      .get('/api/gestiones/9999/dimensiones')
      .set('Authorization', `Bearer ${tk.profesor}`)
      .expect(404);
  });

  it('debe negar la consulta al padre de familia', async () => {
    await http()
      .get(`/api/gestiones/${gestion2026}/dimensiones`)
      .set('Authorization', `Bearer ${tk.padre}`)
      .expect(403);
  });

  it('debe permitir al administrador registrar las dimensiones de una gestión nueva (criterio 6)', async () => {
    const r = await configurar(gestionNueva, rm2026).expect(200);
    expect(r.body).toHaveLength(4);
    expect(await puntajes(gestionNueva)).toEqual([
      ['SER', 10],
      ['SABER', 45],
      ['HACER', 40],
      ['AUTOEVALUACION', 5],
    ]);
  });

  it('debe permitir cambiar puntajes, agregar y quitar dimensiones mientras no haya notas', async () => {
    await configurar(gestionNueva, [
      { codigo: 'SER', nombre: 'Ser', puntajeMaximo: 10, orden: 1 },
      { codigo: 'SABER', nombre: 'Saber', puntajeMaximo: 40, orden: 2 },
      { codigo: 'HACER', nombre: 'Hacer', puntajeMaximo: 40, orden: 3 },
      { codigo: 'DECIDIR', nombre: 'Decidir', puntajeMaximo: 10, orden: 4 },
    ]).expect(200);
    expect(await puntajes(gestionNueva)).toEqual([
      ['SER', 10],
      ['SABER', 40],
      ['HACER', 40],
      ['DECIDIR', 10],
    ]);
  });

  it('debe rechazar con 400 y decir cuántos puntos faltan si no suman 100 (criterio 6)', async () => {
    const r = await configurar(gestionNueva, [
      { codigo: 'SER', nombre: 'Ser', puntajeMaximo: 10, orden: 1 },
      { codigo: 'SABER', nombre: 'Saber', puntajeMaximo: 45, orden: 2 },
      { codigo: 'HACER', nombre: 'Hacer', puntajeMaximo: 40, orden: 3 },
    ]).expect(400);
    expect(r.body.message).toBe('Las dimensiones suman 95; faltan 5 puntos');
    expect(await puntajes(gestionNueva)).toHaveLength(4);
  });

  it.each([
    ['una lista vacía', []],
    ['un puntaje 0', [{ codigo: 'SER', nombre: 'Ser', puntajeMaximo: 0, orden: 1 }]],
    ['un puntaje con decimales', [{ codigo: 'SER', nombre: 'Ser', puntajeMaximo: 10.5, orden: 1 }]],
    ['un código inválido', [{ codigo: 'ser 1', nombre: 'Ser', puntajeMaximo: 100, orden: 1 }]],
    [
      'códigos repetidos',
      [
        { codigo: 'SER', nombre: 'Ser', puntajeMaximo: 50, orden: 1 },
        { codigo: 'SER', nombre: 'Ser 2', puntajeMaximo: 50, orden: 2 },
      ],
    ],
  ])('debe rechazar con 400 %s', async (_caso, dimensiones) => {
    await configurar(gestionNueva, dimensiones).expect(400);
  });

  it.each(['profesor', 'secretaria', 'padre'])(
    'debe responder 403 si quien configura es %s',
    async (quien) => {
      await configurar(gestionNueva, rm2026, quien).expect(403);
    },
  );

  it('debe responder 404 si la gestión no existe', async () => {
    await configurar(9999, rm2026).expect(404);
  });

  it('debe impedir quitar una dimensión que ya tiene actividades', async () => {
    const otra = await ds
      .getRepository(Gestion)
      .save({ anio: 2028, unidadEducativa: e.t1.gestion.unidadEducativa });
    await configurar(otra.id, rm2026).expect(200);
    const [ser] = await ds.query<{ id: number }[]>(
      `SELECT id FROM dimensiones_evaluacion WHERE gestion_id = $1 AND codigo = 'SER'`,
      [otra.id],
    );
    const [t] = await ds.query<{ id: number }[]>(
      `INSERT INTO trimestres (gestion_id, numero) VALUES ($1, 1) RETURNING id`,
      [otra.id],
    );
    await ds.query(
      `INSERT INTO actividades (nombre, materia_id, trimestre_id, dimension_id) VALUES ('Tarea', $1, $2, $3)`,
      [e.matematica.id, t.id, ser.id],
    );
    const r = await configurar(otra.id, [
      { codigo: 'SABER', nombre: 'Saber', puntajeMaximo: 55, orden: 1 },
      { codigo: 'HACER', nombre: 'Hacer', puntajeMaximo: 40, orden: 2 },
      { codigo: 'AUTOEVALUACION', nombre: 'Autoevaluación', puntajeMaximo: 5, orden: 3 },
    ]).expect(422);
    expect(r.body.message).toContain('SER');
  });

  it('debe impedir cambiar los puntajes si la gestión ya tiene notas (criterio 7)', async () => {
    await http()
      .post('/api/notas/planilla')
      .set('Authorization', `Bearer ${tk.profesor}`)
      .send({
        actividadId: e.actividades.ser.id,
        notas: [{ estudianteId: e.estudiantes[0].id, valor: 80 }],
      })
      .expect(201);

    const cambio = rm2026.map((d) =>
      d.codigo === 'SABER'
        ? { ...d, puntajeMaximo: 40 }
        : d.codigo === 'HACER'
          ? { ...d, puntajeMaximo: 45 }
          : d,
    );
    const r = await configurar(gestion2026, cambio).expect(422);
    expect(r.body.message).toBe(
      'La gestión ya tiene notas registradas: no se pueden cambiar sus dimensiones',
    );
    expect(await puntajes(gestion2026)).toEqual([
      ['SER', 10],
      ['SABER', 45],
      ['HACER', 40],
      ['AUTOEVALUACION', 5],
    ]);
  });

  it('debe impedir el cambio aunque la primera nota se esté guardando al mismo tiempo (criterio 7)', async () => {
    const otra = await ds
      .getRepository(Gestion)
      .save({ anio: 2029, unidadEducativa: e.t1.gestion.unidadEducativa });
    await configurar(otra.id, rm2026).expect(200);
    const [dim] = await ds.query<{ id: number }[]>(
      `SELECT id FROM dimensiones_evaluacion WHERE gestion_id = $1 AND codigo = 'SER'`,
      [otra.id],
    );
    const [t] = await ds.query<{ id: number }[]>(
      `INSERT INTO trimestres (gestion_id, numero) VALUES ($1, 1) RETURNING id`,
      [otra.id],
    );
    const [act] = await ds.query<{ id: number }[]>(
      `INSERT INTO actividades (nombre, materia_id, trimestre_id, dimension_id) VALUES ('Tarea', $1, $2, $3) RETURNING id`,
      [e.matematica.id, t.id, dim.id],
    );

    // Una transacción de registro de notas en curso: tiene la gestión tomada y su nota aún no está confirmada.
    const registro = ds.createQueryRunner();
    await registro.connect();
    await registro.startTransaction();
    await registro.query('SELECT id FROM gestiones WHERE id = $1 FOR SHARE', [otra.id]);
    await registro.query(
      `INSERT INTO notas (actividad_id, estudiante_id, valor) VALUES ($1, $2, 70)`,
      [act.id, e.estudiantes[0].id],
    );

    const cambio = configurar(
      otra.id,
      rm2026.map((d) =>
        d.codigo === 'SER'
          ? { ...d, puntajeMaximo: 5 }
          : d.codigo === 'AUTOEVALUACION'
            ? { ...d, puntajeMaximo: 10 }
            : d,
      ),
    ).then((r) => r);
    await new Promise((listo) => setTimeout(listo, 300)); // el cambio llega y espera a la gestión
    await registro.commitTransaction();
    await registro.release();

    expect((await cambio).status).toBe(422);
    expect(await puntajes(otra.id)).toEqual([
      ['SER', 10],
      ['SABER', 45],
      ['HACER', 40],
      ['AUTOEVALUACION', 5],
    ]);
  });
});
