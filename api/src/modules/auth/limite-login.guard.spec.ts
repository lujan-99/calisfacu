import { HttpException, type ExecutionContext } from '@nestjs/common';
import { LimiteLoginGuard, limiteLoginPorMinuto } from './limite-login.guard';

function contexto(ip: string, cabeceras: Record<string, string>) {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ ip }),
      getResponse: () => ({ setHeader: (k: string, v: string) => (cabeceras[k] = v) }),
    }),
  } as unknown as ExecutionContext;
}

/** CAL-003: límite de inicios de sesión por IP (revisión OWASP del Sprint 3, H3). */
describe('LimiteLoginGuard (CAL-003)', () => {
  const original = process.env.LIMITE_LOGIN_POR_MINUTO;
  afterEach(() => {
    process.env.LIMITE_LOGIN_POR_MINUTO = original;
    jest.useRealTimers();
  });

  it('debe responder 429 con Retry-After al superar el límite de la misma IP', () => {
    process.env.LIMITE_LOGIN_POR_MINUTO = '3';
    const guard = new LimiteLoginGuard();
    const cabeceras: Record<string, string> = {};
    for (let i = 0; i < 3; i++)
      expect(guard.canActivate(contexto('1.1.1.1', cabeceras))).toBe(true);
    try {
      guard.canActivate(contexto('1.1.1.1', cabeceras));
      throw new Error('Debía rechazar');
    } catch (e) {
      expect((e as HttpException).getStatus()).toBe(429);
    }
    expect(Number(cabeceras['Retry-After'])).toBeGreaterThan(0);
    // Otra IP no se ve afectada.
    expect(guard.canActivate(contexto('2.2.2.2', cabeceras))).toBe(true);
  });

  it('debe volver a permitir los intentos pasado un minuto', () => {
    jest.useFakeTimers();
    process.env.LIMITE_LOGIN_POR_MINUTO = '1';
    const guard = new LimiteLoginGuard();
    expect(guard.canActivate(contexto('1.1.1.1', {}))).toBe(true);
    expect(() => guard.canActivate(contexto('1.1.1.1', {}))).toThrow(HttpException);
    jest.advanceTimersByTime(60_001);
    expect(guard.canActivate(contexto('1.1.1.1', {}))).toBe(true);
  });

  it('debe desactivarse con 0 y usar 10 por defecto con un valor inválido', () => {
    process.env.LIMITE_LOGIN_POR_MINUTO = '0';
    const guard = new LimiteLoginGuard();
    for (let i = 0; i < 50; i++) expect(guard.canActivate(contexto('1.1.1.1', {}))).toBe(true);
    expect(limiteLoginPorMinuto(undefined)).toBe(10);
    expect(limiteLoginPorMinuto('abc')).toBe(10);
    expect(limiteLoginPorMinuto('-2')).toBe(10);
    expect(limiteLoginPorMinuto('25')).toBe(25);
  });
});
