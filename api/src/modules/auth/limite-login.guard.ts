import {
  HttpException,
  HttpStatus,
  Injectable,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';
import type { Request, Response } from 'express';

const VENTANA_MS = 60_000;
const LIMITE_POR_DEFECTO = 10;

/** Intentos permitidos por minuto y por IP; 0 lo desactiva (las suites e2e inician sesión muchas veces). */
export function limiteLoginPorMinuto(valor: string | undefined): number {
  const n = Number(valor);
  return valor === undefined || valor === '' || !Number.isInteger(n) || n < 0
    ? LIMITE_POR_DEFECTO
    : n;
}

/**
 * Límite de intentos de inicio de sesión por IP (CAL-003; revisión OWASP del Sprint 3, hallazgo H3, A07 y A04).
 * Complementa el bloqueo por cuenta (5 intentos, 15 minutos): sin él, un atacante podía probar una contraseña común
 * contra muchas cuentas. Ventana deslizante de 60 s en memoria: la API corre en una sola instancia (ADR-0009).
 * Detrás del proxy de Render la IP real llega en X-Forwarded-For (`TRUST_PROXY`, app.setup.ts).
 */
@Injectable()
export class LimiteLoginGuard implements CanActivate {
  private readonly intentos = new Map<string, number[]>();

  canActivate(ctx: ExecutionContext): boolean {
    const limite = limiteLoginPorMinuto(process.env.LIMITE_LOGIN_POR_MINUTO);
    if (limite === 0) return true;
    const http = ctx.switchToHttp();
    const ip = http.getRequest<Request>().ip ?? 'desconocida';
    const ahora = Date.now();
    const recientes = (this.intentos.get(ip) ?? []).filter((t) => ahora - t < VENTANA_MS);
    if (recientes.length >= limite) {
      const espera = Math.ceil((VENTANA_MS - (ahora - recientes[0])) / 1000);
      http.getResponse<Response>().setHeader('Retry-After', String(espera));
      this.intentos.set(ip, recientes);
      throw new HttpException(
        'Demasiados intentos de inicio de sesión. Espere un minuto y vuelva a intentarlo.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    recientes.push(ahora);
    this.intentos.set(ip, recientes);
    this.limpiar(ahora);
    return true;
  }

  /** Quita las IP sin intentos recientes para que el mapa no crezca sin límite. */
  private limpiar(ahora: number) {
    if (this.intentos.size < 1000) return;
    for (const [ip, tiempos] of this.intentos) {
      if (tiempos.every((t) => ahora - t >= VENTANA_MS)) this.intentos.delete(ip);
    }
  }
}
