import type { INestApplication } from '@nestjs/common';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import request from 'supertest';
import type { DataSource } from 'typeorm';
import { AlertaPromedio, Correo, EntregaNotas, EstadoCorreo } from '../src/database/entities';
import { CorreosService } from '../src/modules/notificaciones/correo/correos.service';
import { crearApp, escenario, limpiar, token, type Escenario } from './utils';

interface Recibido {
  to: { email: string }[];
  subject: string;
  textContent: string;
}

/**
 * T-061 y T-062 (ADR-0011): el correo de las alertas (US-08, criterio 1) y el aviso de boletín al padre (US-12,
 * criterio 1), con un proveedor falso en un puerto local que recibe lo mismo que la API de Brevo.
 */
describe('Correo de alertas y avisos de boletín (US-08, US-12)', () => {
  let app: INestApplication;
  let ds: DataSource;
  let e: Escenario;
  let proveedor: Server;
  const recibidos: Recibido[] = [];
  /** Respuestas que dará el proveedor, en orden; vacío = 201. */
  const respuestas: number[] = [];
  const tk: Record<string, string> = {};
  const original = { ...process.env };
  const http = () => request(app.getHttpServer());
  const actividades = ['ser', 'saber1', 'saber2', 'hacer', 'auto'] as const;

  /** Espera a que el despacho asíncrono termine (sin dormir a ciegas). */
  const enviados = async () => {
    await app.get(CorreosService).enviarPendientes();
    return ds.getRepository(Correo).find({ order: { id: 'ASC' } });
  };

  beforeAll(async () => {
    proveedor = createServer((req, res) => {
      let cuerpo = '';
      req.on('data', (c: Buffer) => (cuerpo += c.toString()));
      req.on('end', () => {
        const status = respuestas.shift() ?? 201;
        if (status === 201 && req.headers['api-key'] === 'clave-de-prueba') {
          recibidos.push(JSON.parse(cuerpo) as Recibido);
        }
        res.writeHead(status).end('{}');
      });
    });
    await new Promise<void>((r) => proveedor.listen(0, '127.0.0.1', r));
    process.env.CORREO_API_KEY = 'clave-de-prueba';
    process.env.CORREO_API_URL = `http://127.0.0.1:${(proveedor.address() as AddressInfo).port}/v3/smtp/email`;
    process.env.WEB_URL = 'https://web.calisfacu.test';
    ({ app, ds } = await crearApp());
    await limpiar(ds);
    e = await escenario(ds);
    for (const [k, email] of Object.entries({
      profesor: 'profe@ue.test',
      secretaria: 'secre@ue.test',
      padre: 'padre@ue.test',
    })) {
      tk[k] = await token(app, email);
    }
  });

  afterAll(async () => {
    process.env = original;
    await app.close();
    await new Promise((r) => proveedor.close(r));
  });

  /** Registra la misma nota en las cinco actividades de Matemática para un estudiante: su nota trimestral es esa. */
  const registrar = async (estudiante: number, valor: number) => {
    for (const a of actividades) {
      await http()
        .post('/api/notas/planilla')
        .set('Authorization', `Bearer ${tk.profesor}`)
        .send({
          actividadId: e.actividades[a].id,
          notas: [{ estudianteId: e.estudiantes[estudiante].id, valor }],
        })
        .expect(201);
    }
  };

  it('debe enviar al profesor el correo de la alerta en 5 minutos o menos (US-08, criterio 1)', async () => {
    respuestas.push(503); // el primer intento falla: se reintenta
    await registrar(0, 40); // Ana: nota 40
    let [correo] = await enviados();
    expect(correo).toMatchObject({ estado: EstadoCorreo.PENDIENTE, intentos: 1 });
    expect(correo.ultimoError).toBe('El proveedor respondió 503');
    // El reintento toca al minuto; se adelanta el reloj de ese correo.
    await ds.getRepository(Correo).update(correo.id, { siguienteIntento: new Date() });
    [correo] = await enviados();
    expect(correo).toMatchObject({ estado: EstadoCorreo.ENVIADO, intentos: 2 });

    const alerta = await ds.getRepository(AlertaPromedio).findOneOrFail({
      where: { estudiante: { id: e.estudiantes[0].id } },
      relations: { correo: true },
    });
    expect(alerta.correo?.id).toBe(correo.id);
    expect(correo.enviadoEn!.getTime() - alerta.creadaEn.getTime()).toBeLessThanOrEqual(5 * 60_000);
    expect(recibidos).toHaveLength(1);
    expect(recibidos[0].to).toEqual([{ email: 'profe@ue.test' }]);
    expect(recibidos[0].subject).toBe('Alerta de promedio bajo: Quispe, Ana (Matemática)');
    expect(recibidos[0].textContent).toContain('https://web.calisfacu.test/profesor/alertas');

    const r = await http()
      .get('/api/notificaciones/alertas')
      .set('Authorization', `Bearer ${tk.profesor}`)
      .expect(200);
    expect((r.body as { correoEnviado: boolean; estadoCorreo: string }[])[0]).toMatchObject({
      correoEnviado: true,
      estadoCorreo: 'ENVIADO',
    });
  });

  it('debe dejar la alerta dentro del sistema aunque no haya proveedor de correo', async () => {
    process.env.CORREO_API_KEY = '';
    try {
      await registrar(1, 30); // Luis: nota 30
      const correo = (await enviados()).at(-1);
      expect(correo).toMatchObject({
        estado: EstadoCorreo.SIN_PROVEEDOR,
        ultimoError: 'Proveedor de correo sin configurar (CORREO_API_KEY)',
      });
      const r = await http()
        .get('/api/notificaciones/alertas')
        .set('Authorization', `Bearer ${tk.profesor}`)
        .expect(200);
      expect(r.body).toContainEqual(
        expect.objectContaining({
          estudianteNombre: 'Mamani, Luis',
          promedioNuevo: 30,
          correoEnviado: false,
          estadoCorreo: 'SIN_PROVEEDOR',
        }),
      );
    } finally {
      process.env.CORREO_API_KEY = 'clave-de-prueba';
    }
  });

  it('debe avisar al padre vinculado al publicar el boletín, con correo en 15 minutos o menos (US-12, criterio 1)', async () => {
    recibidos.length = 0;
    await ds.getRepository(EntregaNotas).save([
      { materia: e.matematica, trimestre: e.t1, profesor: e.profesor },
      { materia: e.lenguaje, trimestre: e.t1, profesor: e.otroProfesor },
    ]);
    await http()
      .post('/api/boletines/publicaciones')
      .set('Authorization', `Bearer ${tk.secretaria}`)
      .send({ cursoId: e.matematica.curso.id, trimestreId: e.t1.id })
      .expect(201);
    await enviados();

    const r = await http()
      .get('/api/notificaciones/padre')
      .set('Authorization', `Bearer ${tk.padre}`)
      .expect(200);
    const avisos = r.body as {
      id: number;
      estudianteNombre: string;
      trimestreNumero: number;
      estadoEnvio: string;
      canalEnvio: string;
      tiempoEntregaMinutos: number;
      leido: boolean;
    }[];
    // El padre del escenario solo está vinculado a Ana (US-20): un aviso, no uno por estudiante del curso.
    expect(avisos).toHaveLength(1);
    expect(avisos[0]).toMatchObject({
      estudianteNombre: 'Quispe, Ana',
      trimestreNumero: 1,
      estadoEnvio: 'ENVIADO',
      canalEnvio: 'EMAIL',
      leido: false,
    });
    expect(avisos[0].tiempoEntregaMinutos).toBeLessThanOrEqual(15);
    expect(recibidos).toHaveLength(1);
    expect(recibidos[0].to).toEqual([{ email: 'padre@ue.test' }]);
    expect(recibidos[0].subject).toBe('Boletín disponible: Ana Quispe, trimestre 1 de 2026');

    // Despublicar y volver a publicar no repite el aviso ni el correo.
    await http()
      .delete(`/api/boletines/publicaciones/${e.matematica.curso.id}/${e.t1.id}`)
      .set('Authorization', `Bearer ${tk.secretaria}`)
      .expect(204);
    await http()
      .post('/api/boletines/publicaciones')
      .set('Authorization', `Bearer ${tk.secretaria}`)
      .send({ cursoId: e.matematica.curso.id, trimestreId: e.t1.id })
      .expect(201);
    await enviados();
    expect(recibidos).toHaveLength(1);

    await http()
      .patch(`/api/notificaciones/padre/${avisos[0].id}/leer`)
      .set('Authorization', `Bearer ${tk.padre}`)
      .expect(204);
    const despues = await http()
      .get('/api/notificaciones/padre')
      .set('Authorization', `Bearer ${tk.padre}`)
      .expect(200);
    expect((despues.body as { leido: boolean }[])[0].leido).toBe(true);
    await http()
      .patch('/api/notificaciones/padre/99999/leer')
      .set('Authorization', `Bearer ${tk.padre}`)
      .expect(404);
  });
});
