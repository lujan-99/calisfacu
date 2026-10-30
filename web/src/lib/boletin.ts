import {
  consultarEstadoTrabajoBoletinesApi,
  descargarArchivoApi,
  descargarBoletinPdfApi,
  iniciarGeneracionBoletinesColaApi,
  listarBoletinesCursoApi,
  obtenerMateria,
} from './api';

/** Umbral de estudiantes para activar el procesamiento asíncrono en cola (US-07, CA 3, R05 / CAL-001). */
export const UMBRAL_CURSO_NUMEROSO_COLA = 50;

export type FiltroBoletin = 'TODOS' | 'LISTOS' | 'PENDIENTES';
export type EstadoBoletinItem = 'LISTO' | 'PENDIENTE_NOTAS' | 'EN_COLA';

export interface NotaTrimestreResumen {
  numero: number;
  nota: number | null;
}

export interface BoletinEstudiante {
  estudianteId: number;
  codigoRude: string;
  ci: string | null;
  estudiante: string;
  promedioAnual: number | null;
  porcentajeAsistencia: number | null;
  clasesDictadas: number;
  asistencias: number;
  estadoBoletin: EstadoBoletinItem;
  trimestres: NotaTrimestreResumen[];
}

export interface ResumenBoletinesCurso {
  cursoId: number;
  cursoNombre: string;
  materiaId?: number;
  materiaNombre?: string;
  totalEstudiantes: number;
  requiereCola: boolean;
  boletinesListos: number;
  estudiantes: BoletinEstudiante[];
}

export interface EstadoTrabajoCola {
  jobId: string;
  estado: 'ENCOLADO' | 'PROCESANDO' | 'COMPLETADO' | 'FALLIDO';
  progreso: number;
  total: number;
  urlDescarga?: string;
  mensaje?: string;
}

/**
 * Determina si el curso supera el umbral de 50 estudiantes para generación masiva en cola (US-07, CA 3).
 */
export function esCursoNumeroso(
  totalEstudiantes: number,
  umbral = UMBRAL_CURSO_NUMEROSO_COLA,
): boolean {
  return totalEstudiantes > umbral;
}

/**
 * Filtra el listado de boletines por estado de emisión y búsqueda de texto.
 */
export function filtrarBoletinesEstudiantes(
  estudiantes: BoletinEstudiante[],
  filtro: FiltroBoletin,
  busqueda: string,
): BoletinEstudiante[] {
  const termino = busqueda.trim().toLowerCase();

  return estudiantes.filter((e) => {
    if (filtro === 'LISTOS' && e.estadoBoletin !== 'LISTO') return false;
    if (filtro === 'PENDIENTES' && e.estadoBoletin === 'LISTO') return false;

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
 * Dispara la descarga en el navegador de un archivo Blob.
 */
export function descargarBlob(blob: Blob, nombreArchivo: string): void {
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = nombreArchivo;
  document.body.appendChild(enlace);
  enlace.click();
  document.body.removeChild(enlace);
  URL.revokeObjectURL(url);
}

/**
 * Descarga el boletín oficial en PDF de un estudiante (T-045).
 */
export async function descargarBoletinEstudiante(
  estudianteId: number,
  nombreSugerido = `Boletin_Estudiante_${estudianteId}.pdf`,
): Promise<void> {
  const blob = await descargarBoletinPdfApi(estudianteId);
  descargarBlob(blob, nombreSugerido);
}

/**
 * Inicia la generación masiva de boletines para un curso en cola asíncrona BullMQ (T-046).
 */
export async function iniciarGeneracionMasivaBoletines(
  cursoId: number,
): Promise<{ jobId: string; totalEstudiantes: number; estado: string }> {
  return await iniciarGeneracionBoletinesColaApi(cursoId);
}

/**
 * Consulta el estado actual de un trabajo encolado de boletines en BullMQ (T-046).
 */
export async function consultarEstadoBoletinesCola(jobId: string): Promise<EstadoTrabajoCola> {
  const res = await consultarEstadoTrabajoBoletinesApi(jobId);
  return {
    jobId: res.jobId,
    estado: res.estado,
    progreso: res.progreso,
    total: res.total,
    urlDescarga: res.urlDescarga,
    mensaje: res.mensaje,
  };
}

/** Descarga el PDF con los boletines del curso cuando la cola terminó (US-07, criterio 3). */
export async function descargarBoletinesCurso(urlDescarga: string, nombreArchivo: string) {
  descargarBlob(await descargarArchivoApi(urlDescarga), nombreArchivo);
}

/**
 * Carga los estudiantes del curso de la materia con sus promedios y asistencia, calculados por la API.
 */
export async function obtenerResumenBoletinesCurso(
  materiaId: number,
): Promise<ResumenBoletinesCurso> {
  const materia = await obtenerMateria(materiaId);
  const cursoId = materia.curso.id;
  const estudiantes: BoletinEstudiante[] = await listarBoletinesCursoApi(cursoId);
  const totalEstudiantes = estudiantes.length;

  return {
    cursoId,
    cursoNombre: materia.curso.nombre,
    materiaId: materia.id,
    materiaNombre: materia.nombre,
    totalEstudiantes,
    requiereCola: esCursoNumeroso(totalEstudiantes),
    boletinesListos: estudiantes.filter((e) => e.estadoBoletin === 'LISTO').length,
    estudiantes,
  };
}
