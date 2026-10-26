import type { BoletinPadreDetalle, MateriaBoletinPadre } from './api';

export type EstadoMateria = 'APROBADO' | 'REPROBADO' | 'EN_CURSO';
export type EstadoAcademicoAnual = 'PROMOVIDO' | 'RETENIDO' | 'EN_CURSO';

/**
 * Determina el estado de una materia según la nota final (RM 001/2026: nota mínima de aprobación = 51 pts).
 */
export function determinarAprobacionMateria(nota: number | null): EstadoMateria {
  if (nota === null || nota === undefined) return 'EN_CURSO';
  return nota >= 51 ? 'APROBADO' : 'REPROBADO';
}

/**
 * Determina el estado académico anual del estudiante según su promedio y asistencia (Decisión D6 y RM 001/2026).
 */
export function determinarEstadoAnual(
  promedioAnual: number | null,
  porcentajeAsistencia: number | null,
): EstadoAcademicoAnual {
  if (promedioAnual === null || promedioAnual === undefined) return 'EN_CURSO';

  // Si tiene reprobación por nota (< 51) o inasistencia crítica (< 80%)
  if (promedioAnual < 51) return 'RETENIDO';
  if (porcentajeAsistencia !== null && porcentajeAsistencia < 80.0) return 'RETENIDO';

  return 'PROMOVIDO';
}

/**
 * Valida si el boletín está oficialmente publicado y puede ser descargado por el padre de familia (US-11, CA 1 y CA 2).
 * Criterio 1: Dado un boletín publicado, cuando el padre lo consulta, puede verlo y descargarlo en PDF.
 * Criterio 2: Dado un boletín que aún no se publicó, el padre no lo ve como disponible para descarga.
 */
export function puedeDescargarBoletin(boletin: BoletinPadreDetalle | null): boolean {
  if (!boletin) return false;
  return boletin.publicado === true && boletin.estadoPeriodo === 'PUBLICADO';
}

/**
 * Calcula un resumen estadístico de las calificaciones del boletín para visualización del padre.
 */
export function calcularResumenBoletin(
  materias: MateriaBoletinPadre[],
  asistencia: number | null = null,
) {
  const totalMaterias = materias.length;
  const materiasConNota = materias.filter(
    (m) => m.promedioFinal !== null && m.promedioFinal !== undefined,
  );
  const aprobadas = materias.filter((m) => (m.promedioFinal ?? 0) >= 51).length;
  const reprobadas = materiasConNota.length - aprobadas;

  const suma = materiasConNota.reduce((acc, m) => acc + (m.promedioFinal ?? 0), 0);
  const promedioGeneral =
    materiasConNota.length > 0 ? Math.round((suma / materiasConNota.length) * 10) / 10 : null;

  const estadoGeneral = determinarEstadoAnual(promedioGeneral, asistencia);

  return {
    totalMaterias,
    materiasConNota: materiasConNota.length,
    aprobadas,
    reprobadas,
    promedioGeneral,
    estadoGeneral,
  };
}
