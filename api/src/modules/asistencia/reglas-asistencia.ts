import Decimal from 'decimal.js';

/** Zona horaria de las unidades educativas: "hoy" es el día en Bolivia, no el del servidor (Render usa UTC). */
export const ZONA_HORARIA = 'America/La_Paz';

export interface ConteoAsistencia {
  presentes: number;
  licencias: number;
  ausentes: number;
}

/**
 * US-19, criterio 2 (decisión D5): (presentes + licencias) / clases dictadas × 100, con un decimal (0,05 hacia arriba).
 * null si todavía no hay clases registradas.
 */
export function porcentajeAsistencia({ presentes, licencias, ausentes }: ConteoAsistencia) {
  const clases = presentes + licencias + ausentes;
  if (clases === 0) return null;
  return new Decimal(presentes + licencias)
    .times(100)
    .dividedBy(clases)
    .toDecimalPlaces(1, Decimal.ROUND_HALF_UP)
    .toNumber();
}

/** Fecha de hoy en Bolivia, en formato AAAA-MM-DD. */
export function hoyEnBolivia(ahora: Date): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: ZONA_HORARIA }).format(ahora);
}

/** US-19, criterio 3: no se registra asistencia de una fecha posterior a hoy en Bolivia. */
export function esFechaFutura(fecha: string, ahora: Date): boolean {
  return fecha > hoyEnBolivia(ahora);
}

/** AAAA-MM-DD y una fecha real del calendario (rechaza 2026-02-30). */
export function esFechaValida(fecha: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return false;
  const d = new Date(`${fecha}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === fecha;
}
