import {
  notasTrimestrales,
  obtenerMateria,
  obtenerPanelRiesgoMateriaApi,
  obtenerPorcentajesAsistencia,
  type NotaTrimestral,
  type PorcentajeAsistenciaEstudiante,
} from './api';

/** Umbral mínimo de aprobación según la RM 001/2026 y normativa vigente en Bolivia. */
export const UMBRAL_NOTA_MINIMA = 51;

/** Umbral de asistencia por defecto según la decisión D6 (configurable por gestión). */
export const UMBRAL_ASISTENCIA_DEFECTO = 80.0;

export type MotivoRiesgo = 'PROMEDIO' | 'ASISTENCIA' | 'AMBOS' | null;
export type EstadoRiesgoEstudiante = 'EN_RIESGO' | 'REGULAR' | 'PENDIENTE';
export type FiltroRiesgo = 'TODOS' | 'RIESGO' | 'PROMEDIO' | 'ASISTENCIA' | 'REGULAR';

export interface EstudianteRiesgo {
  estudianteId: number;
  codigoRude: string;
  ci: string | null;
  estudiante: string;
  promedio: number | null;
  porcentajeAsistencia: number | null;
  clasesDictadas: number;
  asistencias: number;
  enRiesgo: boolean;
  motivoRiesgo: MotivoRiesgo;
  estado: EstadoRiesgoEstudiante;
}

export interface ResumenPanelRiesgo {
  totalEstudiantes: number;
  enRiesgoTotal: number;
  enRiesgoPromedio: number;
  enRiesgoAsistencia: number;
  enRiesgoAmbos: number;
  regulares: number;
  pendientes: number;
  promedioGeneral: number | null;
  asistenciaGeneral: number | null;
}

export interface PanelRiesgoData {
  materia: {
    id: number;
    nombre: string;
  };
  curso: {
    id: number;
    nombre: string;
  };
  trimestre: {
    id: number;
    numero: number;
  };
  umbralAsistencia: number;
  umbralNotaMinima: number;
  resumen: ResumenPanelRiesgo;
  estudiantes: EstudianteRiesgo[];
}

/**
 * Evalúa si un estudiante se encuentra en riesgo académico según sus notas y asistencia.
 * Criterio 2 (US-06) y Decisión D6:
 * - Promedio < 51 pts (RM 001/2026)
 * - Asistencia < 80.0 % (Decisión D6, umbral configurable)
 */
export function evaluarRiesgoEstudiante(
  promedio: number | null,
  porcentajeAsistencia: number | null,
  umbralAsistencia: number = UMBRAL_ASISTENCIA_DEFECTO,
  umbralNota: number = UMBRAL_NOTA_MINIMA,
): { enRiesgo: boolean; motivoRiesgo: MotivoRiesgo; estado: EstadoRiesgoEstudiante } {
  const tieneNota = promedio !== null && Number.isFinite(promedio);
  const tieneAsistencia = porcentajeAsistencia !== null && Number.isFinite(porcentajeAsistencia);

  if (!tieneNota && !tieneAsistencia) {
    return { enRiesgo: false, motivoRiesgo: null, estado: 'PENDIENTE' };
  }

  const riesgoNota = tieneNota && promedio < umbralNota;
  const riesgoAsistencia = tieneAsistencia && porcentajeAsistencia < umbralAsistencia;

  if (riesgoNota && riesgoAsistencia) {
    return { enRiesgo: true, motivoRiesgo: 'AMBOS', estado: 'EN_RIESGO' };
  }
  if (riesgoNota) {
    return { enRiesgo: true, motivoRiesgo: 'PROMEDIO', estado: 'EN_RIESGO' };
  }
  if (riesgoAsistencia) {
    return { enRiesgo: true, motivoRiesgo: 'ASISTENCIA', estado: 'EN_RIESGO' };
  }

  return { enRiesgo: false, motivoRiesgo: null, estado: 'REGULAR' };
}

/**
 * Calcula los totales agregados y métricas consolidadas del panel de riesgo.
 */
export function calcularResumenPanelRiesgo(estudiantes: EstudianteRiesgo[]): ResumenPanelRiesgo {
  let enRiesgoTotal = 0;
  let enRiesgoPromedio = 0;
  let enRiesgoAsistencia = 0;
  let enRiesgoAmbos = 0;
  let regulares = 0;
  let pendientes = 0;

  let sumaNotas = 0;
  let conteoNotas = 0;
  let sumaAsistencias = 0;
  let conteoAsistencias = 0;

  for (const e of estudiantes) {
    if (e.estado === 'PENDIENTE') {
      pendientes++;
    } else if (e.enRiesgo) {
      enRiesgoTotal++;
      if (e.motivoRiesgo === 'AMBOS') enRiesgoAmbos++;
      else if (e.motivoRiesgo === 'PROMEDIO') enRiesgoPromedio++;
      else if (e.motivoRiesgo === 'ASISTENCIA') enRiesgoAsistencia++;
    } else {
      regulares++;
    }

    if (e.promedio !== null && Number.isFinite(e.promedio)) {
      sumaNotas += e.promedio;
      conteoNotas++;
    }
    if (e.porcentajeAsistencia !== null && Number.isFinite(e.porcentajeAsistencia)) {
      sumaAsistencias += e.porcentajeAsistencia;
      conteoAsistencias++;
    }
  }

  const promedioGeneral = conteoNotas > 0 ? Math.round((sumaNotas / conteoNotas) * 10) / 10 : null;
  const asistenciaGeneral =
    conteoAsistencias > 0 ? Math.round((sumaAsistencias / conteoAsistencias) * 10) / 10 : null;

  return {
    totalEstudiantes: estudiantes.length,
    enRiesgoTotal,
    enRiesgoPromedio,
    enRiesgoAsistencia,
    enRiesgoAmbos,
    regulares,
    pendientes,
    promedioGeneral,
    asistenciaGeneral,
  };
}

/**
 * Filtra el listado de estudiantes por criterio de riesgo y término de búsqueda.
 */
export function filtrarEstudiantesRiesgo(
  estudiantes: EstudianteRiesgo[],
  filtro: FiltroRiesgo,
  busqueda: string,
): EstudianteRiesgo[] {
  const termino = busqueda.trim().toLowerCase();

  return estudiantes.filter((e) => {
    // 1. Filtro por condición de riesgo
    if (filtro === 'RIESGO' && !e.enRiesgo) return false;
    if (filtro === 'PROMEDIO' && e.motivoRiesgo !== 'PROMEDIO' && e.motivoRiesgo !== 'AMBOS')
      return false;
    if (filtro === 'ASISTENCIA' && e.motivoRiesgo !== 'ASISTENCIA' && e.motivoRiesgo !== 'AMBOS')
      return false;
    if (filtro === 'REGULAR' && (e.enRiesgo || e.estado === 'PENDIENTE')) return false;

    // 2. Filtro por texto de búsqueda (nombre, RUDE o CI)
    if (termino !== '') {
      const coincideNombre = e.estudiante.toLowerCase().includes(termino);
      const coincideRude = e.codigoRude.toLowerCase().includes(termino);
      const coincideCi = e.ci ? e.ci.toLowerCase().includes(termino) : false;
      return coincideNombre || coincideRude || coincideCi;
    }

    return true;
  });
}

/**
 * Consulta el panel de riesgo para la materia indicada.
 * Intenta invocar el endpoint dedicado `/materias/:id/riesgo` de la API de Lujan (T-043).
 * Si la API aún no lo expone en local, compone los datos de los endpoints existentes.
 */
export async function obtenerPanelRiesgoMateria(
  materiaId: number,
  trimestreId?: number,
): Promise<PanelRiesgoData> {
  try {
    return await obtenerPanelRiesgoMateriaApi<PanelRiesgoData>(materiaId, trimestreId);
  } catch {
    // Si no existe la ruta en el backend aún (T-043 en desarrollo), agregamos los datos disponibles
    return await fallbackPanelRiesgo(materiaId, trimestreId);
  }
}

/**
 * Fallback resiliente para componer el panel de riesgo a partir de materia, cálculo y asistencia.
 */
async function fallbackPanelRiesgo(
  materiaId: number,
  trimestreId?: number,
): Promise<PanelRiesgoData> {
  const materia = await obtenerMateria(materiaId);
  const tId = trimestreId ?? 1;

  const [notas, asistencias] = await Promise.all([
    notasTrimestrales(materiaId, tId).catch(() => [] as NotaTrimestral[]),
    obtenerPorcentajesAsistencia(materiaId).catch(() => [] as PorcentajeAsistenciaEstudiante[]),
  ]);

  const mapAsistencia = new Map<
    number,
    { porcentaje: number | null; clases: number; asistencias: number }
  >(
    asistencias.map((a: PorcentajeAsistenciaEstudiante) => [
      a.estudianteId,
      {
        porcentaje: a.porcentaje,
        clases: a.clases,
        asistencias: a.presentes + a.licencias,
      },
    ]),
  );

  const estudiantes: EstudianteRiesgo[] = notas.map((n: NotaTrimestral) => {
    const asist = mapAsistencia.get(n.estudianteId);
    const porcentaje = asist?.porcentaje ?? null;
    const clasesDictadas = asist?.clases ?? 0;
    const totalAsistencias = asist?.asistencias ?? 0;

    const evaluacion = evaluarRiesgoEstudiante(
      n.nota,
      porcentaje,
      UMBRAL_ASISTENCIA_DEFECTO,
      UMBRAL_NOTA_MINIMA,
    );

    return {
      estudianteId: n.estudianteId,
      codigoRude: '',
      ci: null,
      estudiante: n.estudiante,
      promedio: n.nota,
      porcentajeAsistencia: porcentaje,
      clasesDictadas,
      asistencias: totalAsistencias,
      enRiesgo: evaluacion.enRiesgo,
      motivoRiesgo: evaluacion.motivoRiesgo,
      estado: evaluacion.estado,
    };
  });

  const resumen = calcularResumenPanelRiesgo(estudiantes);

  return {
    materia: { id: materia.id, nombre: materia.nombre },
    curso: { id: materia.curso.id, nombre: materia.curso.nombre },
    trimestre: { id: tId, numero: 1 },
    umbralAsistencia: UMBRAL_ASISTENCIA_DEFECTO,
    umbralNotaMinima: UMBRAL_NOTA_MINIMA,
    resumen,
    estudiantes,
  };
}
