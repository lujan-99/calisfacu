import Decimal from 'decimal.js';
import { NOTA_MINIMA_APROBACION } from '../calculo/reglas';
import { requisitosEntrega } from '../entregas/reglas-entregas';

export type Observacion = 'APROBADO' | 'REPROBADO' | 'PENDIENTE';

export interface MateriaCurso {
  id: number;
  nombre: string;
  profesor: string | null;
  entregada: boolean;
  totalActividades: number;
  totalNotasRegistradas: number;
}

export interface MateriaPendiente {
  materiaId: number;
  materia: string;
  profesor: string;
  notasFaltantes: number;
}

/**
 * US-09, criterio 3: las materias del curso que todavía no entregaron sus notas del trimestre (US-10, D13), con las
 * notas que les faltan. Con alguna pendiente no se centraliza ni se cierra el trimestre.
 */
export function materiasPendientes(
  materias: readonly MateriaCurso[],
  totalEstudiantes: number,
): MateriaPendiente[] {
  return materias
    .filter((m) => !m.entregada)
    .map((m) => ({
      materiaId: m.id,
      materia: m.nombre,
      profesor: m.profesor ?? 'Sin asignar',
      notasFaltantes: requisitosEntrega({
        totalActividades: m.totalActividades,
        totalEstudiantes,
        totalNotasRegistradas: m.totalNotasRegistradas,
      }).notasFaltantes,
    }));
}

/** Observación de la planilla: aprobado con la nota mínima (51), pendiente sin nota. */
export function observacion(nota: number | null): Observacion {
  if (nota === null) return 'PENDIENTE';
  return nota >= NOTA_MINIMA_APROBACION ? 'APROBADO' : 'REPROBADO';
}

/**
 * Observación del estudiante en la planilla consolidada (D21): las notas oficiales son las de cada materia (D2), así
 * que aprueba el trimestre si aprueba todas sus materias; reprueba si reprueba alguna, y queda pendiente si a alguna
 * le falta la nota. El promedio de la fila es solo un indicador (D12).
 */
export function observacionEstudiante(notas: readonly (number | null)[]): Observacion {
  if (notas.length === 0 || notas.some((n) => n === null)) return 'PENDIENTE';
  return notas.every((n) => observacion(n) === 'APROBADO') ? 'APROBADO' : 'REPROBADO';
}

/** Lista para el mensaje de error: "Lenguaje (Luis Profesor), Física (Sin asignar)". */
export function textoPendientes(pendientes: readonly MateriaPendiente[]): string {
  return pendientes.map((p) => `${p.materia} (${p.profesor})`).join(', ');
}

export interface FilaResumen {
  promedioTrimestral: number | null;
  observacion: Observacion;
}

/** Totales de la planilla. El promedio general y la tasa son indicadores con un decimal, no notas oficiales. */
export function resumenPlanilla(filas: readonly FilaResumen[]) {
  const contar = (o: Observacion) => filas.filter((f) => f.observacion === o).length;
  const aprobados = contar('APROBADO');
  const reprobados = contar('REPROBADO');
  const conPromedio = filas.map((f) => f.promedioTrimestral).filter((p): p is number => p !== null);
  const unDecimal = (d: Decimal) => d.toDecimalPlaces(1, Decimal.ROUND_HALF_UP).toNumber();
  const evaluados = aprobados + reprobados;
  return {
    totalEstudiantes: filas.length,
    promedioGeneral:
      conPromedio.length > 0
        ? unDecimal(Decimal.sum(...conPromedio).dividedBy(conPromedio.length))
        : null,
    aprobados,
    reprobados,
    pendientes: contar('PENDIENTE'),
    tasaAprobacion:
      evaluados > 0 ? unDecimal(new Decimal(aprobados).times(100).dividedBy(evaluados)) : null,
  };
}
