import { descargarArchivoApi, ejecutarCentralizacionApi, obtenerCentralizadorApi } from './api';
import { descargarBlob } from './boletin';

/**
 * Tipos y modelos de dominio para la Centralización de Notas (US-09).
 * Normativa: RM 001/2026 del Ministerio de Educación de Bolivia.
 */

export interface MateriaCentralizador {
  id: number;
  nombre: string;
  profesor?: string;
  orden?: number;
}

export interface FilaCentralizador {
  numero: number;
  estudianteId: number;
  codigoRude: string;
  ci: string | null;
  apellidos: string;
  nombres: string;
  estudiante: string;
  /** Notas por ID de materia (escala 1 a 100, D1) */
  notas: Record<number, number | null>;
  /** Promedio de las notas de las materias: indicador con dos decimales (D12), no nota oficial */
  promedioTrimestral: number | null;
  materiasReprobadas?: number;
  /** Aprueba si aprueba todas sus materias (>= 51); pendiente si a alguna le falta nota (D21) */
  observacion: 'APROBADO' | 'REPROBADO' | 'PENDIENTE';
}

export interface MateriaPendienteCentralizacion {
  materiaId: number;
  materia: string;
  profesor: string;
  notasFaltantes?: number;
}

export interface ResumenCentralizador {
  totalEstudiantes: number;
  promedioGeneral: number | null;
  aprobados: number;
  reprobados: number;
  pendientes: number;
  tasaAprobacion: number | null;
}

export interface CentralizadorCursoData {
  curso: {
    id: number;
    nombre: string;
    nivel?: string;
    anioEscolaridad?: number;
    paralelo?: string;
  };
  gestion: {
    id: number;
    anio: number;
  };
  trimestre: {
    id: number;
    numero: number;
    cerrado: boolean;
  };
  unidadEducativa?: {
    nombre: string;
    codigoSie: string;
  };
  todasEntregadas: boolean;
  materiasPendientes: MateriaPendienteCentralizacion[];
  materias: MateriaCentralizador[];
  filas: FilaCentralizador[];
  resumen: ResumenCentralizador;
  /** Ya se centralizó el curso en el trimestre: desde entonces se exporta la planilla oficial (D21). */
  centralizado: boolean;
  fechaCentralizacion: string | null;
}

/**
 * Filtra las filas del centralizador por término de búsqueda y estado de aprobación.
 */
export function filtrarFilasCentralizador(
  filas: FilaCentralizador[],
  busqueda: string,
  filtroEstado: 'TODOS' | 'APROBADO' | 'REPROBADO' | 'PENDIENTE',
): FilaCentralizador[] {
  const termino = busqueda.trim().toLowerCase();

  return filas.filter((fila) => {
    if (filtroEstado !== 'TODOS' && fila.observacion !== filtroEstado) {
      return false;
    }

    if (termino !== '') {
      const coincideNombre = fila.estudiante.toLowerCase().includes(termino);
      const coincideRude = fila.codigoRude.toLowerCase().includes(termino);
      const coincideCi = fila.ci ? fila.ci.toLowerCase().includes(termino) : false;
      return coincideNombre || coincideRude || coincideCi;
    }

    return true;
  });
}

/**
 * Genera un archivo CSV con formato oficial de centralizador para exportación inmediata (US-09 CA 2).
 */
export function exportarCentralizadorCsv(datos: CentralizadorCursoData): string {
  const encabezadoInfo = [
    `CENTRALIZADOR OFICIAL DE CALIFICACIONES`,
    `Unidad Educativa: "${datos.unidadEducativa?.nombre ?? 'Unidad Educativa'}"`,
    `Codigo SIE: "${datos.unidadEducativa?.codigoSie ?? ''}"`,
    `Curso: "${datos.curso.nombre}"`,
    `Gestion: "${datos.gestion.anio}"`,
    `Trimestre: "${datos.trimestre.numero}.º Trimestre"`,
    ``,
  ].join('\r\n');

  const columnasMaterias = datos.materias.map((m) => `"${m.nombre}"`).join(',');
  const cabeceraTabla = `Nro,Codigo RUDE,CI,Estudiante,${columnasMaterias},Promedio Trimestral,Observaciones`;

  const lineasFilas = datos.filas.map((f) => {
    const notasCols = datos.materias.map((m) => f.notas[m.id] ?? '—').join(',');
    return `${f.numero},"${f.codigoRude}","${f.ci ?? ''}","${f.estudiante}",${notasCols},${f.promedioTrimestral ?? '—'},"${f.observacion}"`;
  });

  const pieFirmas = [
    ``,
    `Resumen: Total Estudiantes: ${datos.resumen.totalEstudiantes} | Aprobados: ${datos.resumen.aprobados} | Reprobados: ${datos.resumen.reprobados} | Promedio General: ${datos.resumen.promedioGeneral ?? '—'}`,
    ``,
    `_______________________________          _______________________________`,
    `     Firma del Director(a)                    Firma del Maestro(a)`,
    `      Sello Institucional`,
  ].join('\r\n');

  return `${encabezadoInfo}${cabeceraTabla}\r\n${lineasFilas.join('\r\n')}\r\n${pieFirmas}`;
}

/**
 * Descarga el centralizador en formato CSV/Excel en el navegador.
 */
export function descargarCentralizadorCsv(
  datos: CentralizadorCursoData,
  nombreArchivo?: string,
): void {
  const csvContent = exportarCentralizadorCsv(datos);
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const nombre =
    nombreArchivo ??
    `Centralizador_${datos.curso.nombre.replace(/\s+/g, '_')}_T${datos.trimestre.numero}_${datos.gestion.anio}.csv`;
  descargarBlob(blob, nombre);
}

/**
 * Planilla consolidada de un curso y trimestre (US-09 CA 1 y CA 3), calculada por la API (T-057, decisión D21).
 * Sin datos armados en el navegador: si la API falla, la pantalla muestra el error.
 */
export function obtenerCentralizadorCurso(
  cursoId: number,
  trimestreId: number,
): Promise<CentralizadorCursoData> {
  return obtenerCentralizadorApi<CentralizadorCursoData>(cursoId, trimestreId);
}

/**
 * Ejecuta la centralización oficial del trimestre para un curso (US-09 CA 1). La API la rechaza (422) y lista las
 * materias pendientes si falta alguna entrega (CA 3).
 */
export function ejecutarCentralizacionCurso(
  cursoId: number,
  trimestreId: number,
  cerrarTrimestre = false,
): Promise<{ exito: boolean; mensaje: string; centralizador?: CentralizadorCursoData }> {
  return ejecutarCentralizacionApi<{
    exito: boolean;
    mensaje: string;
    centralizador?: CentralizadorCursoData;
  }>(cursoId, trimestreId, cerrarTrimestre);
}

/** Descarga la planilla oficial en PDF generada por la API (US-09 CA 2, T-058). */
export async function descargarCentralizadorPdf(
  cursoId: number,
  trimestreId: number,
  nombreArchivo?: string,
): Promise<void> {
  const blob = await descargarArchivoApi(
    `/centralizador/cursos/${cursoId}/pdf?trimestreId=${trimestreId}`,
  );
  descargarBlob(blob, nombreArchivo ?? `Centralizador_Curso_${cursoId}_T${trimestreId}.pdf`);
}

/** Descarga la planilla oficial en Excel (.xlsx) generada por la API (US-09 CA 2, T-058). */
export async function descargarCentralizadorExcel(
  cursoId: number,
  trimestreId: number,
  nombreArchivo?: string,
): Promise<void> {
  const blob = await descargarArchivoApi(
    `/centralizador/cursos/${cursoId}/excel?trimestreId=${trimestreId}`,
  );
  descargarBlob(blob, nombreArchivo ?? `Centralizador_Curso_${cursoId}_T${trimestreId}.xlsx`);
}
