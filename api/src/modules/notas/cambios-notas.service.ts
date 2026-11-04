import { Injectable, Logger } from '@nestjs/common';

/** Notas que cambiaron en una actividad: registro, importación (US-01, US-05) o corrección (US-04). */
export interface CambioNotas {
  actividadId: number;
  estudianteIds: number[];
}

export type OyenteNotas = (cambio: CambioNotas) => void | Promise<void>;

/**
 * Aviso de que cambiaron notas (US-08, T-060). Lo llaman NotasService y AuditoriaService después de confirmar la
 * transacción, así otros módulos reaccionan al recálculo (las alertas de promedio bajo) sin que el módulo crítico de
 * notas dependa de ellos. Espera a los oyentes para que la alerta exista cuando responde la API (RNF-01); si un oyente
 * falla, se registra y la nota sigue guardada.
 */
@Injectable()
export class CambiosNotasService {
  private readonly logger = new Logger(CambiosNotasService.name);
  private readonly oyentes: OyenteNotas[] = [];

  suscribir(oyente: OyenteNotas): void {
    this.oyentes.push(oyente);
  }

  async notificar(cambio: CambioNotas): Promise<void> {
    if (cambio.estudianteIds.length === 0) return;
    for (const oyente of this.oyentes) {
      try {
        await oyente(cambio);
      } catch (error) {
        this.logger.error(
          `Falló un oyente del cambio de notas de la actividad ${cambio.actividadId}`,
          error instanceof Error ? error.stack : undefined,
        );
      }
    }
  }
}
