import { Controller, Get, type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';
import { configurarApp } from './app.setup';

@Controller('prueba')
class PruebaController {
  @Get()
  responder() {
    return { ok: true };
  }
}

/** Revisión OWASP del Sprint 3, hallazgo H1 (A05, mala configuración de seguridad). */
describe('configurarApp: cabeceras de seguridad', () => {
  let app: INestApplication<App>;
  const entorno = process.env.NODE_ENV;

  async function crear(nodeEnv: string) {
    process.env.NODE_ENV = nodeEnv;
    const modulo = await Test.createTestingModule({ controllers: [PruebaController] }).compile();
    app = configurarApp(modulo.createNestApplication());
    await app.init();
    return request(app.getHttpServer()).get('/api/prueba');
  }

  afterEach(async () => {
    process.env.NODE_ENV = entorno;
    await app.close();
  });

  it('debe ocultar que la API usa Express (sin x-powered-by)', async () => {
    const res = await crear('production');
    expect(res.headers['x-powered-by']).toBeUndefined();
  });

  it('debe enviar nosniff, HSTS y prohibir que la API se muestre en un iframe', async () => {
    const res = await crear('production');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['strict-transport-security']).toContain('max-age=');
    expect(res.headers['x-frame-options']).toBe('DENY');
  });

  it('debe aplicar en producción una CSP que no permite cargar nada ni ser incrustada', async () => {
    const res = await crear('production');
    expect(res.headers['content-security-policy']).toBe(
      "default-src 'none';frame-ancestors 'none'",
    );
  });

  it('debe omitir la CSP fuera de producción para que funcione Swagger en /api/docs', async () => {
    const res = await crear('development');
    expect(res.headers['content-security-policy']).toBeUndefined();
    expect(res.headers['x-content-type-options']).toBe('nosniff');
  });
});
