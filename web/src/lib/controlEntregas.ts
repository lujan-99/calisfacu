/**
 * Módulo de dominio para el Control de Entrega de Notas (US-10, T-040).
 * Criterio 1: Seguimiento por curso de materias entregadas y pendientes antes del cierre de trimestre.
 * Criterio 2: Validación estricta: solo se acepta la entrega si todos los estudiantes tienen nota en todas las actividades.
 */

import type { EntregaMateria, EstadoEntrega } from './api';

export type { EntregaMateria, EstadoEntrega };

export interface ResumenEntregasCurso {
  cursoId: number;
  curso: string;
  totalMaterias: number;
  entregadas: number;
  pendientes: number;
  porcentajeCumplimiento: number;
  materias: EntregaMateria[];
}

export interface VerificacionEntrega {
  puedeEntregar: boolean;
  totalActividades: number;
  totalEstudiantes: number;
  totalNotasRegistradas: number;
  totalNotasRequeridas: number;
  notasFaltantes: number;
  razon?: string;
}

/**
 * Valida si una materia puede marcarse como entregada para el trimestre (US-10, criterio 2).
 * Solo se acepta si todos los estudiantes tienen nota en todas las actividades (totalNotasRegistradas === totalNotasRequeridas).
 */
export function verificarRequisitosEntrega(params: {
  totalActividades: number;
  totalEstudiantes: number;
  totalNotasRegistradas: number;
}): VerificacionEntrega {
  const { totalActividades, totalEstudiantes, totalNotasRegistradas } = params;

  if (totalActividades === 0) {
    return {
      puedeEntregar: false,
      totalActividades: 0,
      totalEstudiantes,
      totalNotasRegistradas: 0,
      totalNotasRequeridas: 0,
      notasFaltantes: 0,
      razon:
        'No se puede marcar como entregada: la materia no tiene actividades creadas en este trimestre.',
    };
  }

  if (totalEstudiantes === 0) {
    return {
      puedeEntregar: false,
      totalActividades,
      totalEstudiantes: 0,
      totalNotasRegistradas: 0,
      totalNotasRequeridas: 0,
      notasFaltantes: 0,
      razon: 'No se puede marcar como entregada: el curso no tiene estudiantes registrados.',
    };
  }

  const totalNotasRequeridas = totalActividades * totalEstudiantes;
  const notasFaltantes = Math.max(0, totalNotasRequeridas - totalNotasRegistradas);

  if (notasFaltantes > 0) {
    return {
      puedeEntregar: false,
      totalActividades,
      totalEstudiantes,
      totalNotasRegistradas,
      totalNotasRequeridas,
      notasFaltantes,
      razon: `No se puede marcar como entregada: faltan ${notasFaltantes} nota(s) por calificar. Todos los estudiantes deben tener nota en todas las actividades.`,
    };
  }

  return {
    puedeEntregar: true,
    totalActividades,
    totalEstudiantes,
    totalNotasRegistradas,
    totalNotasRequeridas,
    notasFaltantes: 0,
  };
}

/**
 * Agrupa una lista plana de entregas por curso y calcula las métricas consolidadas (US-10, criterio 1).
 */
export function agruparEntregasPorCurso(entregas: EntregaMateria[]): ResumenEntregasCurso[] {
  const mapa = new Map<number, { cursoId: number; curso: string; materias: EntregaMateria[] }>();

  for (const item of entregas) {
    const actual = mapa.get(item.cursoId);
    if (!actual) {
      mapa.set(item.cursoId, {
        cursoId: item.cursoId,
        curso: item.curso,
        materias: [item],
      });
    } else {
      actual.materias.push(item);
    }
  }

  return Array.from(mapa.values()).map(({ cursoId, curso, materias }) => {
    const totalMaterias = materias.length;
    const entregadas = materias.filter((m) => m.estado === 'ENTREGADO').length;
    const pendientes = totalMaterias - entregadas;
    const porcentajeCumplimiento =
      totalMaterias > 0 ? Math.round((entregadas / totalMaterias) * 1000) / 10 : 0;

    return {
      cursoId,
      curso,
      totalMaterias,
      entregadas,
      pendientes,
      porcentajeCumplimiento,
      materias,
    };
  });
}

/**
 * Calcula estadísticas globales del colegio para el trimestre seleccionado.
 */
export function calcularEstadisticasGenerales(entregas: EntregaMateria[]) {
  const totalMaterias = entregas.length;
  const entregadas = entregas.filter((e) => e.estado === 'ENTREGADO').length;
  const pendientes = totalMaterias - entregadas;
  const porcentajeGlobal =
    totalMaterias > 0 ? Math.round((entregadas / totalMaterias) * 1000) / 10 : 0;

  return {
    totalMaterias,
    entregadas,
    pendientes,
    porcentajeGlobal,
  };
}
