import { NOTA_MINIMA_APROBACION } from '../calculo/reglas';

export type AccionAlerta = 'CREAR' | 'SUPERAR' | 'NINGUNA';

/**
 * US-08 (decisión D22): qué hacer con la alerta de promedio bajo de un estudiante en una materia y trimestre después
 * de recalcular su nota trimestral.
 *
 * - Criterio 1: la nota queda por debajo de 51 y no hay una alerta vigente → se crea.
 * - Criterio 2: la nota sigue por debajo de 51 con una alerta vigente → no se repite.
 * - La nota vuelve a 51 o más → la alerta vigente se supera; si vuelve a caer, se crea otra.
 * - Sin nota trimestral (falta alguna dimensión, D4) no se decide nada.
 */
export function accionAlerta(nota: number | null, hayVigente: boolean): AccionAlerta {
  if (nota === null) return 'NINGUNA';
  if (nota < NOTA_MINIMA_APROBACION) return hayVigente ? 'NINGUNA' : 'CREAR';
  return hayVigente ? 'SUPERAR' : 'NINGUNA';
}
