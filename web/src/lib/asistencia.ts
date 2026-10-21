import type { EstadoAsistencia } from './api';

export const ZONA_HORARIA_BOLIVIA = 'America/La_Paz';

export interface ConteoAsistencia {
  presentes: number;
  licencias: number;
  ausentes: number;
}

/**
 * Fecha de hoy en Bolivia (America/La_Paz) en formato AAAA-MM-DD.
 */
export function hoyEnBolivia(ahora: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: ZONA_HORARIA_BOLIVIA }).format(ahora);
}

/**
 * US-19, criterio 3: impide registrar asistencia de una fecha posterior a hoy en Bolivia.
 */
export function esFechaFutura(fecha: string, ahora: Date = new Date()): boolean {
  return fecha > hoyEnBolivia(ahora);
}

/**
 * US-19, criterio 2 (decisión D5):
 * porcentaje = (presentes + licencias) / clases dictadas × 100, redondeado a un decimal.
 * Devuelve null si aún no se han dictado clases (clases === 0).
 */
export function calcularPorcentajeAsistencia({
  presentes,
  licencias,
  ausentes,
}: ConteoAsistencia): number | null {
  const clases = presentes + licencias + ausentes;
  if (clases === 0) return null;
  const valor = ((presentes + licencias) * 100) / clases;
  return Math.round(valor * 10) / 10;
}

/**
 * Formato de visualización en español de Bolivia para porcentajes (ej. "85,5 %").
 */
export function formatoPorcentaje(valor: number | null): string {
  if (valor === null) return '—';
  return `${valor.toLocaleString('es-BO', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} %`;
}

/**
 * Nivel de riesgo por inasistencias (SRS sección 4 y D6: umbral 80 %).
 */
export function nivelAsistencia(
  porcentaje: number | null,
): 'optimo' | 'advertencia' | 'riesgo' | 'sin-datos' {
  if (porcentaje === null) return 'sin-datos';
  if (porcentaje >= 80) return 'optimo';
  if (porcentaje >= 70) return 'advertencia';
  return 'riesgo';
}

/**
 * Etiqueta del estado de asistencia en español.
 */
export const ETIQUETAS_ESTADO: Record<
  EstadoAsistencia,
  { nombre: string; abreviatura: string; color: string }
> = {
  PRESENTE: { nombre: 'Presente', abreviatura: 'P', color: '#166534' },
  LICENCIA: { nombre: 'Licencia', abreviatura: 'L', color: '#854d0e' },
  AUSENTE: { nombre: 'Ausente', abreviatura: 'A', color: '#991b1b' },
};
