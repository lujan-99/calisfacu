import Decimal from 'decimal.js';
import { NOTA_MINIMA_APROBACION } from '../calculo/reglas';

export type MotivoRiesgo = 'PROMEDIO' | 'ASISTENCIA' | 'AMBOS' | null;
export type EstadoRiesgo = 'EN_RIESGO' | 'REGULAR' | 'PENDIENTE';

export interface EvaluacionRiesgo {
  enRiesgo: boolean;
  motivoRiesgo: MotivoRiesgo;
  estado: EstadoRiesgo;
}

/**
 * US-06, criterio 2 (decisión D6): en riesgo si el promedio es menor que la nota mínima de aprobación (51) o si la
 * asistencia es menor que el umbral de la gestión. Lo que aún no tiene dato no cuenta; sin ninguno, queda pendiente.
 */
export function evaluarRiesgo(
  promedio: number | null,
  porcentajeAsistencia: number | null,
  umbralAsistencia: number,
): EvaluacionRiesgo {
  if (promedio === null && porcentajeAsistencia === null) {
    return { enRiesgo: false, motivoRiesgo: null, estado: 'PENDIENTE' };
  }
  const porPromedio = promedio !== null && promedio < NOTA_MINIMA_APROBACION;
  const porAsistencia =
    porcentajeAsistencia !== null && new Decimal(porcentajeAsistencia).lessThan(umbralAsistencia);
  const motivoRiesgo: MotivoRiesgo =
    porPromedio && porAsistencia
      ? 'AMBOS'
      : porPromedio
        ? 'PROMEDIO'
        : porAsistencia
          ? 'ASISTENCIA'
          : null;
  return motivoRiesgo
    ? { enRiesgo: true, motivoRiesgo, estado: 'EN_RIESGO' }
    : { enRiesgo: false, motivoRiesgo: null, estado: 'REGULAR' };
}

type FilaRiesgo = EvaluacionRiesgo & {
  promedio: number | null;
  porcentajeAsistencia: number | null;
};

/** Totales del panel; los promedios generales son indicadores con un decimal, no notas oficiales. */
export function resumenRiesgo(filas: readonly FilaRiesgo[]) {
  const contar = (f: (x: FilaRiesgo) => boolean) => filas.filter(f).length;
  const promedioDe = (valores: (number | null)[]) => {
    const conDato = valores.filter((v): v is number => v !== null);
    if (conDato.length === 0) return null;
    return Decimal.sum(...conDato)
      .dividedBy(conDato.length)
      .toDecimalPlaces(1, Decimal.ROUND_HALF_UP)
      .toNumber();
  };
  return {
    totalEstudiantes: filas.length,
    enRiesgoTotal: contar((x) => x.enRiesgo),
    enRiesgoPromedio: contar((x) => x.motivoRiesgo === 'PROMEDIO'),
    enRiesgoAsistencia: contar((x) => x.motivoRiesgo === 'ASISTENCIA'),
    enRiesgoAmbos: contar((x) => x.motivoRiesgo === 'AMBOS'),
    regulares: contar((x) => x.estado === 'REGULAR'),
    pendientes: contar((x) => x.estado === 'PENDIENTE'),
    promedioGeneral: promedioDe(filas.map((x) => x.promedio)),
    asistenciaGeneral: promedioDe(filas.map((x) => x.porcentajeAsistencia)),
  };
}
