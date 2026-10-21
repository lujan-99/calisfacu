import type { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';
import type { DataSource } from 'typeorm';
import { Usuario } from '../src/database/entities';
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
      nombre: 'entregar las notas de la materia',
      metodo: 'post' as const,
      url: `/api/entregas/materias/${e.matematica.id}/entregar`,
      cuerpo: { trimestreId: e.t1.id },
    },
    {
      nombre: 'ver el estado de entrega de la materia',
      metodo: 'get' as const,
      url: `/api/entregas/materias/${e.matematica.id}?trimestreId=${e.t1.id}`,
    },
    {
      nombre: 'descargar la plantilla de importación',
      metodo: 'get' as const,
      url: `/api/importaciones/actividades/${e.actividades.saber1.id}/plantilla`,
    },
    {
      nombre: 'vista previa de la importación',
      metodo: 'post' as const,
      url: `/api/importaciones/actividades/${e.actividades.saber1.id}/vista-previa`,
    },
    {
      nombre: 'confirmar la importación',
      metodo: 'post' as const,
      url: `/api/importaciones/actividades/${e.actividades.saber1.id}/confirmar`,
    },
    {
      nombre: 'pedir la edición de una nota registrada',
      metodo: 'post' as const,
      url: '/api/solicitudes-edicion',
      cuerpo: {
        actividadId: e.actividades.ser.id,
        estudianteIds: [e.estudiantes[0].id],
        motivo: 'prueba',
      },
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

/**
 * M09 en la gestión académica (T-016) y las consultas de las pantallas: cada ruta rechaza con 401 sin token y con
 * 403 a cada rol que no está autorizado. Los guards actúan antes de validar el cuerpo, así que no cambia ningún dato.
 */
describe('Autorización de la gestión académica (M09, RNF-04)', () => {
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
      admin: 'admin@ue.test',
    })) {
      tk[k] = await token(app, email);
    }
  });

  afterAll(() => app.close());

  type Metodo = 'get' | 'post' | 'put' | 'patch' | 'delete';
  const secretariaYAdmin = ['profesor', 'otro', 'padre'];
  const soloAdmin = ['profesor', 'secretaria', 'padre'];
  const rutas = (): { metodo: Metodo; url: string; noPermitidos: string[] }[] => [
    { metodo: 'get', url: '/api/gestiones', noPermitidos: ['padre'] },
    { metodo: 'get', url: `/api/gestiones/${e.t1.gestion.id}/trimestres`, noPermitidos: ['padre'] },
    { metodo: 'get', url: '/api/cursos', noPermitidos: secretariaYAdmin },
    { metodo: 'post', url: '/api/cursos', noPermitidos: secretariaYAdmin },
    { metodo: 'put', url: `/api/cursos/${e.ajeno.curso.id}`, noPermitidos: secretariaYAdmin },
    { metodo: 'delete', url: `/api/cursos/${e.ajeno.curso.id}`, noPermitidos: secretariaYAdmin },
    { metodo: 'get', url: '/api/estudiantes', noPermitidos: secretariaYAdmin },
    { metodo: 'post', url: '/api/estudiantes', noPermitidos: secretariaYAdmin },
    { metodo: 'put', url: `/api/estudiantes/${e.ajeno.id}`, noPermitidos: secretariaYAdmin },
    { metodo: 'delete', url: `/api/estudiantes/${e.ajeno.id}`, noPermitidos: secretariaYAdmin },
    { metodo: 'get', url: '/api/entregas', noPermitidos: ['profesor', 'otro', 'padre'] },
    { metodo: 'get', url: '/api/solicitudes-edicion', noPermitidos: ['secretaria', 'padre'] },
    {
      metodo: 'patch',
      url: '/api/solicitudes-edicion/1/aprobar',
      noPermitidos: ['profesor', 'otro', 'secretaria', 'padre'],
    },
    {
      metodo: 'patch',
      url: '/api/solicitudes-edicion/1/rechazar',
      noPermitidos: ['profesor', 'otro', 'secretaria', 'padre'],
    },
    // Ningún profesor del escenario da clases al curso de e.ajeno (US-03, criterio 2).
    {
      metodo: 'get',
      url: `/api/estudiantes/${e.ajeno.id}/historial`,
      noPermitidos: ['profesor', 'otro', 'padre'],
    },
    { metodo: 'get', url: '/api/materias', noPermitidos: secretariaYAdmin },
    { metodo: 'post', url: '/api/materias', noPermitidos: secretariaYAdmin },
    { metodo: 'put', url: `/api/materias/${e.lenguaje.id}`, noPermitidos: secretariaYAdmin },
    { metodo: 'delete', url: `/api/materias/${e.lenguaje.id}`, noPermitidos: secretariaYAdmin },
    { metodo: 'get', url: '/api/materias/mias', noPermitidos: ['secretaria', 'admin', 'padre'] },
    { metodo: 'get', url: `/api/materias/${e.matematica.id}`, noPermitidos: ['otro', 'padre'] },
    { metodo: 'get', url: '/api/profesores', noPermitidos: secretariaYAdmin },
    { metodo: 'get', url: '/api/unidad-educativa', noPermitidos: secretariaYAdmin },
    { metodo: 'put', url: '/api/unidad-educativa', noPermitidos: secretariaYAdmin },
    { metodo: 'put', url: '/api/unidad-educativa/colores', noPermitidos: soloAdmin },
    { metodo: 'put', url: '/api/unidad-educativa/logo', noPermitidos: soloAdmin },
    { metodo: 'delete', url: '/api/unidad-educativa/logo', noPermitidos: soloAdmin },
    {
      metodo: 'get',
      url: `/api/notas/actividades?materiaId=${e.matematica.id}&trimestreId=${e.t1.id}`,
      noPermitidos: ['otro', 'secretaria', 'padre'],
    },
  ];

  it('debe responder 401 a todas las rutas sin token', async () => {
    for (const r of [...rutas(), { metodo: 'post' as const, url: '/api/auth/renovar' }]) {
      await request(app.getHttpServer())[r.metodo](r.url).expect(401);
    }
  });

  it('debe responder 403 a cada rol sin permiso, ruta por ruta', async () => {
    for (const r of rutas()) {
      for (const quien of r.noPermitidos) {
        const res = await request(app.getHttpServer())
          [r.metodo](r.url)
          .set('Authorization', `Bearer ${tk[quien]}`);
        expect({ ruta: `${r.metodo} ${r.url}`, quien, estado: res.status }).toEqual({
          ruta: `${r.metodo} ${r.url}`,
          quien,
          estado: 403,
        });
      }
    }
  });

  it('debe dejar públicos los datos de la institución para la pantalla de ingreso', async () => {
    await request(app.getHttpServer()).get('/api/institucion').expect(200);
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

/**
 * US-17, criterio 4 (decisión D11): la sesión expira a los 30 minutos sin actividad. El token dura 30 minutos y la
 * web lo renueva con POST /api/auth/renovar mientras el usuario trabaja; si pasan 30 minutos sin peticiones, vence.
 */
describe('Expiración de la sesión (US-17, criterio 4)', () => {
  let app: INestApplication;
  let ds: DataSource;
  let jwt: JwtService;
  let e: Escenario;
  const http = () => request(app.getHttpServer());

  beforeAll(async () => {
    ({ app, ds } = await crearApp());
    await limpiar(ds);
    e = await escenario(ds);
    jwt = app.get(JwtService);
  });

  afterAll(() => app.close());

  const decodificar = (t: string) => jwt.decode<{ iat: number; exp: number; sub: number }>(t);

  it('debe emitir un token que vence a los 30 minutos', async () => {
    const { iat, exp } = decodificar(await token(app, 'profe@ue.test'));
    expect(exp - iat).toBe(30 * 60);
  });

  it('debe rechazar con 401 una petición con el token vencido', async () => {
    const vencido = jwt.sign({ sub: e.profesor.id, rol: 'PROFESOR' }, { expiresIn: -60 });
    await http()
      .get(`/api/notas/actividades/${e.actividades.ser.id}`)
      .set('Authorization', `Bearer ${vencido}`)
      .expect(401);
  });

  it('debe renovar la sesión de un usuario activo con un token nuevo de 30 minutos', async () => {
    const anterior = await token(app, 'profe@ue.test');
    const r = await http()
      .post('/api/auth/renovar')
      .set('Authorization', `Bearer ${anterior}`)
      .expect(200);
    expect(r.body.usuario).toEqual({ id: e.profesor.id, nombre: 'Ana Profesora', rol: 'PROFESOR' });
    const nuevo = decodificar(r.body.token as string);
    expect(nuevo.sub).toBe(e.profesor.id);
    expect(nuevo.exp - nuevo.iat).toBe(30 * 60);
    await http()
      .get(`/api/notas/actividades/${e.actividades.ser.id}`)
      .set('Authorization', `Bearer ${r.body.token}`)
      .expect(200);
  });

  it('debe negar la renovación sin token o con el token vencido', async () => {
    await http().post('/api/auth/renovar').expect(401);
    const vencido = jwt.sign({ sub: e.profesor.id, rol: 'PROFESOR' }, { expiresIn: -60 });
    await http().post('/api/auth/renovar').set('Authorization', `Bearer ${vencido}`).expect(401);
  });

  it('debe negar la renovación a un usuario desactivado', async () => {
    const vigente = await token(app, 'otro@ue.test');
    await ds.getRepository(Usuario).update(e.otroProfesor.id, { activo: false });
    const r = await http()
      .post('/api/auth/renovar')
      .set('Authorization', `Bearer ${vigente}`)
      .expect(401);
    expect(r.body.message).toBe('Su sesión expiró; vuelva a ingresar');
  });
});
