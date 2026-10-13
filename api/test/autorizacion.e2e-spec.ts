import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { DataSource } from 'typeorm';
import { crearApp, escenario, limpiar, token, type Escenario } from './utils';

/**
 * M09: el 100 % de las rutas protegidas rechazan con 403 al usuario sin permiso
 * (rol incorrecto o profesor no asignado a la materia) y con 401 al que no inició sesión.
 */
describe('Autorización de las rutas de notas (M09, RNF-04)', () => {
  let app: INestApplication;
  let ds: DataSource;
  let e: Escenario;
  const tk: Record<string, string> = {};

  beforeAll(async () => {
    ({ app, ds } = await crearApp());
    await limpiar(ds);
    e = await escenario(ds);
    for (const [k, email] of Object.entries({
      profesor: 'profe@ue.test',
      otro: 'otro@ue.test',
      secretaria: 'secre@ue.test',
      padre: 'padre@ue.test',
    })) {
      tk[k] = await token(app, email);
    }
    await request(app.getHttpServer())
      .post('/api/notas/planilla')
      .set('Authorization', `Bearer ${tk.profesor}`)
      .send({
        actividadId: e.actividades.ser.id,
        notas: [{ estudianteId: e.estudiantes[0].id, valor: 80 }],
      })
      .expect(201);
  });

  afterAll(() => app.close());

  const rutas = () => [
    {
      nombre: 'registrar planilla',
      metodo: 'post' as const,
      url: '/api/notas/planilla',
      cuerpo: {
        actividadId: e.actividades.saber1.id,
        notas: [{ estudianteId: e.estudiantes[0].id, valor: 70 }],
      },
    },
    {
      nombre: 'corregir nota',
      metodo: 'patch' as const,
      url: '/api/notas/1/correccion',
      cuerpo: { valor: 90, motivo: 'prueba' },
    },
    {
      nombre: 'ver planilla',
      metodo: 'get' as const,
      url: `/api/notas/actividades/${e.actividades.ser.id}`,
    },
    { nombre: 'ver historial', metodo: 'get' as const, url: '/api/notas/1/historial' },
    {
      nombre: 'ver notas trimestrales',
      metodo: 'get' as const,
      url: `/api/calculo/materias/${e.matematica.id}/trimestres/${e.t1.id}`,
    },
    {
      nombre: 'registrar asistencia',
      metodo: 'put' as const,
      url: `/api/asistencias/materias/${e.matematica.id}/fechas/2026-03-02`,
      cuerpo: { registros: e.estudiantes.map((x) => ({ estudianteId: x.id, estado: 'PRESENTE' })) },
    },
    {
      nombre: 'ver lista de asistencia',
      metodo: 'get' as const,
      url: `/api/asistencias/materias/${e.matematica.id}/fechas/2026-03-02`,
    },
    {
      nombre: 'ver porcentajes de asistencia',
      metodo: 'get' as const,
      url: `/api/asistencias/materias/${e.matematica.id}/porcentajes`,
    },
    {
      nombre: 'configurar dimensiones (solo administrador)',
      metodo: 'put' as const,
      url: `/api/gestiones/${e.t1.gestion.id}/dimensiones`,
      cuerpo: {
        dimensiones: [{ codigo: 'SER', nombre: 'Ser', puntajeMaximo: 100, orden: 1 }],
      },
    },
  ];

  it('debe responder 401 a todas las rutas protegidas sin token', async () => {
    for (const r of rutas()) {
      await request(app.getHttpServer())[r.metodo](r.url).send(r.cuerpo).expect(401);
    }
  });

  it('debe responder 403 al padre de familia en todas las rutas de notas', async () => {
    for (const r of rutas()) {
      await request(app.getHttpServer())
        [r.metodo](r.url)
        .set('Authorization', `Bearer ${tk.padre}`)
        .send(r.cuerpo)
        .expect(403);
    }
  });

  it('debe responder 403 al profesor que no está asignado a la materia', async () => {
    for (const r of rutas()) {
      await request(app.getHttpServer())
        [r.metodo](r.url)
        .set('Authorization', `Bearer ${tk.otro}`)
        .send(r.cuerpo)
        .expect(403);
    }
  });

  it('debe responder 403 a la secretaria en las rutas de escritura', async () => {
    for (const r of rutas().filter((x) => x.metodo !== 'get')) {
      await request(app.getHttpServer())
        [r.metodo](r.url)
        .set('Authorization', `Bearer ${tk.secretaria}`)
        .send(r.cuerpo)
        .expect(403);
    }
  });

  it('debe permitir a la secretaria consultar las notas trimestrales', async () => {
    await request(app.getHttpServer())
      .get(`/api/calculo/materias/${e.matematica.id}/trimestres/${e.t1.id}`)
      .set('Authorization', `Bearer ${tk.secretaria}`)
      .expect(200);
  });

  it('debe responder 401 a un token falsificado', async () => {
    await request(app.getHttpServer())
      .get('/api/notas/1/historial')
      .set('Authorization', 'Bearer abc.def.ghi')
      .expect(401);
  });

  it('debe dejar pública la ruta de salud', async () => {
    const r = await request(app.getHttpServer()).get('/api/salud').expect(200);
    expect(r.body).toMatchObject({ estado: 'ok' });
  });
});

describe('Inicio de sesión (US-17)', () => {
  let app: INestApplication;
  let ds: DataSource;

  beforeAll(async () => {
    ({ app, ds } = await crearApp());
    await limpiar(ds);
    await escenario(ds);
  });

  afterAll(() => app.close());

  it('debe devolver el token y el rol del usuario', async () => {
    const r = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'PROFE@ue.test', contrasena: 'Prueba2026!' })
      .expect(200);
    expect(r.body.usuario).toEqual({
      id: expect.any(Number),
      nombre: 'Ana Profesora',
      rol: 'PROFESOR',
    });
    expect(r.body.token).toEqual(expect.any(String));
  });

  it('debe usar el mismo mensaje para un correo inexistente y una contraseña incorrecta', async () => {
    const a = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'nadie@ue.test', contrasena: 'x' })
      .expect(401);
    const b = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'otro@ue.test', contrasena: 'x' })
      .expect(401);
    expect(a.body.message).toBe('Credenciales inválidas');
    expect(b.body.message).toBe(a.body.message);
  });

  it('debe bloquear la cuenta después de 5 intentos fallidos, aun con la contraseña correcta', async () => {
    for (let i = 0; i < 5; i++) {
      await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'secre@ue.test', contrasena: 'mala' })
        .expect(401);
    }
    const r = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'secre@ue.test', contrasena: 'Prueba2026!' })
      .expect(401);
    // El bloqueo no se anuncia: el mensaje es el mismo que el de un correo inexistente (no revela la cuenta).
    expect(r.body.message).toBe('Credenciales inválidas');
  });

  it('debe contar cada intento fallido una sola vez aunque lleguen en paralelo', async () => {
    await Promise.all(
      Array.from({ length: 8 }, () =>
        request(app.getHttpServer())
          .post('/api/auth/login')
          .send({ email: 'admin@ue.test', contrasena: 'mala' })
          .expect(401),
      ),
    );
    const [fila] = await ds.query<{ bloqueado_hasta: Date | null }[]>(
      `SELECT bloqueado_hasta FROM usuarios WHERE email = 'admin@ue.test'`,
    );
    expect(fila.bloqueado_hasta).not.toBeNull();
    await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'admin@ue.test', contrasena: 'Prueba2026!' })
      .expect(401);
  });

  it('debe rechazar datos de entrada inválidos con 400', async () => {
    await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'no-es-correo' })
      .expect(400);
  });
});
