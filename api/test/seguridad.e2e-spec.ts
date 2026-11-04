import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { DataSource } from 'typeorm';
import { CONTRASENA, crearApp, escenario, limpiar } from './utils';

/** Hallazgos H3 y H4 de la revisión OWASP del Sprint 3 (CAL-003 y CAL-004), contra la API real. */
describe('Seguridad del inicio de sesión (CAL-003, CAL-004)', () => {
  let app: INestApplication;
  let ds: DataSource;
  const original = process.env.LIMITE_LOGIN_POR_MINUTO;
  const login = (cuerpo: object) =>
    request(app.getHttpServer()).post('/api/auth/login').send(cuerpo);

  beforeAll(async () => {
    ({ app, ds } = await crearApp());
    await limpiar(ds);
    await escenario(ds);
  });

  afterAll(async () => {
    process.env.LIMITE_LOGIN_POR_MINUTO = original;
    await app.close();
  });

  it('debe responder los errores de validación en español (CAL-004)', async () => {
    const r = await login({ email: 123 }).expect(400);
    expect((r.body as { message: string[] }).message).toEqual([
      'El campo «email» debe ser un correo electrónico válido',
      'El campo «contrasena» debe tener al menos 1 caracteres',
      'El campo «contrasena» debe ser un texto',
    ]);
  });

  it('debe responder 429 al superar los intentos por minuto desde la misma IP (CAL-003)', async () => {
    process.env.LIMITE_LOGIN_POR_MINUTO = '3';
    // Correos distintos: el bloqueo por cuenta no alcanza a frenar este ataque.
    for (const n of [1, 2, 3]) {
      await login({ email: `nadie${n}@ue.test`, contrasena: 'x' }).expect(401);
    }
    const r = await login({ email: 'profe@ue.test', contrasena: CONTRASENA }).expect(429);
    expect(r.headers['retry-after']).toBeDefined();
    expect((r.body as { message: string }).message).toMatch(/Demasiados intentos/);
  });
});
