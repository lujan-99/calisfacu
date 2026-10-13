// Reglas fijas de la escala oficial (RNF-01). Los puntajes de las dimensiones NO están aquí:
// se configuran por gestión en la tabla dimensiones_evaluacion (US-18), porque el Ministerio los cambia.
export const ESCALA_MIN = 1; // sin 0: decisión D1 (docs/backlog/reglas-ministerio.md)
export const ESCALA_MAX = 100;
export const NOTA_MINIMA_APROBACION = 51;
export const SUMA_DIMENSIONES = 100;

/** Puntajes de la RM 001/2026, usados por el seed para la gestión 2026. */
export const DIMENSIONES_RM_001_2026 = [
  { codigo: 'SER', nombre: 'Ser', puntajeMaximo: 10, orden: 1 },
  { codigo: 'SABER', nombre: 'Saber', puntajeMaximo: 45, orden: 2 },
  { codigo: 'HACER', nombre: 'Hacer', puntajeMaximo: 40, orden: 3 },
  { codigo: 'AUTOEVALUACION', nombre: 'Autoevaluación', puntajeMaximo: 5, orden: 4 },
] as const;
