import { Injectable, Logger, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { type DataSource, type EntityManager, LessThanOrEqual } from 'typeorm';
import { Correo, EstadoCorreo } from '../../../database/entities';
import {
  configuracionCorreo,
  enviarPorApi,
  ErrorProveedorCorreo,
  type MensajeCorreo,
} from './proveedor';
import { esperaReintentoMinutos, MAX_INTENTOS_CORREO } from './reglas-correo';

/** Dirección de la web para los enlaces de los correos. */
export function urlWeb(env: NodeJS.ProcessEnv = process.env): string {
  return (env.WEB_URL ?? env.CORS_ORIGINS?.split(',')[0] ?? 'http://localhost:5173').replace(
    /\/$/,
    '',
  );
}

/**
 * Bandeja de salida de correos (T-061, ADR-0011). `registrar` guarda el correo con la misma conexión que el aviso que lo
 * origina; `enviarPendientes` lo manda por la API del proveedor enseguida y, si falla, reintenta con espera creciente
 * (cada 30 s se revisan los pendientes). Sin proveedor configurado el correo queda SIN_PROVEEDOR y el aviso sigue
 * dentro del sistema.
 */
@Injectable()
export class CorreosService implements OnModuleInit, OnModuleDestroy {
  private readonly log = new Logger(CorreosService.name);
  private temporizador?: NodeJS.Timeout;
  private enCurso?: Promise<void>;

  constructor(@InjectDataSource() private readonly db: DataSource) {}

  onModuleInit() {
    const ms = Number(process.env.CORREO_INTERVALO_MS ?? 30_000);
    if (ms > 0) {
      this.temporizador = setInterval(() => void this.enviarPendientes(), ms);
      this.temporizador.unref();
    }
  }

  async onModuleDestroy() {
    if (this.temporizador) clearInterval(this.temporizador);
    await this.enCurso;
  }

  /** Guarda el correo (pendiente, o SIN_PROVEEDOR si no hay clave) y lo devuelve para enlazarlo con su aviso. */
  registrar(m: MensajeCorreo, manager: EntityManager = this.db.manager): Promise<Correo> {
    const sinProveedor = !configuracionCorreo().apiKey;
    return manager.getRepository(Correo).save({
      ...m,
      estado: sinProveedor ? EstadoCorreo.SIN_PROVEEDOR : EstadoCorreo.PENDIENTE,
      ultimoError: sinProveedor ? 'Proveedor de correo sin configurar (CORREO_API_KEY)' : null,
    });
  }

  /** Dispara el envío sin esperar (quien registra el aviso no espera al proveedor). */
  despachar(): void {
    void this.enviarPendientes();
  }

  /** Envía los pendientes cuyo intento ya toca. Un solo envío a la vez dentro del proceso. */
  enviarPendientes(): Promise<void> {
    this.enCurso ??= this.procesar().finally(() => (this.enCurso = undefined));
    return this.enCurso;
  }

  private async procesar() {
    const repo = this.db.getRepository(Correo);
    const config = configuracionCorreo();
    const pendientes = await repo.find({
      where: { estado: EstadoCorreo.PENDIENTE, siguienteIntento: LessThanOrEqual(new Date()) },
      order: { id: 'ASC' },
      take: 20,
    });
    for (const c of pendientes) {
      const intentos = c.intentos + 1;
      try {
        await enviarPorApi(c, config);
        await repo.update(c.id, {
          estado: EstadoCorreo.ENVIADO,
          intentos,
          enviadoEn: new Date(),
          ultimoError: null,
        });
      } catch (e) {
        const error =
          e instanceof ErrorProveedorCorreo ? e : new ErrorProveedorCorreo(String(e), false);
        const agotado = error.definitivo || intentos >= MAX_INTENTOS_CORREO;
        // El destinatario no va al log (dato personal); el id basta para buscarlo.
        this.log.warn(`Correo ${c.id}, intento ${intentos}: ${error.message}`);
        await repo.update(c.id, {
          estado: agotado ? EstadoCorreo.FALLIDO : EstadoCorreo.PENDIENTE,
          intentos,
          ultimoError: error.message.slice(0, 500),
          siguienteIntento: new Date(Date.now() + esperaReintentoMinutos(intentos) * 60_000),
        });
      }
    }
  }
}
