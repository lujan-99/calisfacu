/** Datos de un boletín (US-07, criterio 1): los mismos que muestra el sistema en el historial (US-03). */
export interface DatosBoletin {
  unidadEducativa: { nombre: string; codigoSie: string };
  gestion: { id: number; anio: number };
  estudiante: {
    id: number;
    codigoRude: string;
    ci: string | null;
    nombres: string;
    apellidos: string;
  };
  curso: {
    id: number;
    nombre: string;
    nivel: string;
    nivelNombre: string;
    anioEscolaridad: number;
    paralelo: string;
  };
  trimestres: { id: number; numero: number }[];
  materias: {
    materiaId: number;
    nombre: string;
    profesor: string | null;
    /** Nota de cada trimestre, en el orden de `trimestres`; null si está pendiente. */
    notas: (number | null)[];
    notaAnual: number | null;
    aprobado: boolean | null;
    porcentajeAsistencia: number | null;
  }[];
  promediosTrimestrales: (number | null)[];
  promedioAnual: number | null;
  estadoAnual: string;
  porcentajeAsistencia: number | null;
  /** Clases registradas en todas las materias y a cuántas asistió (presente o con licencia, D5). */
  clasesDictadas: number;
  asistencias: number;
}

const ORDINALES = ['1.er', '2.º', '3.er'];
const SIN_DATO = '—';
const texto = (v: number | null) => (v === null ? SIN_DATO : String(v));
const porcentaje = (v: number | null) => (v === null ? SIN_DATO : `${v} %`);

/** Lo que escribe el PDF, separado del dibujo para poder probarlo sin leer el PDF. */
export function contenidoBoletin(d: DatosBoletin, generadoEl: string) {
  return {
    titulo: 'BOLETÍN DE CALIFICACIONES',
    encabezado: [
      d.unidadEducativa.nombre,
      `Código SIE: ${d.unidadEducativa.codigoSie}`,
      `Gestión ${d.gestion.anio}`,
    ],
    datosEstudiante: [
      ['Estudiante', `${d.estudiante.apellidos}, ${d.estudiante.nombres}`],
      ['Código RUDE', d.estudiante.codigoRude],
      ['CI', d.estudiante.ci ?? SIN_DATO],
      ['Nivel', d.curso.nivelNombre],
      ['Año de escolaridad', `${d.curso.anioEscolaridad}.º`],
      ['Paralelo', d.curso.paralelo],
    ],
    columnas: [
      'Materia',
      ...d.trimestres.map((t) => `${ORDINALES[t.numero - 1]} trim.`),
      'Nota anual',
      'Asistencia',
    ],
    filas: d.materias.map((m) => [
      m.nombre,
      ...m.notas.map(texto),
      texto(m.notaAnual),
      porcentaje(m.porcentajeAsistencia),
    ]),
    pie: [
      `Promedio por trimestre: ${d.promediosTrimestrales.map(texto).join(' · ')}`,
      `Promedio anual: ${texto(d.promedioAnual)}`,
      `Asistencia general: ${porcentaje(d.porcentajeAsistencia)}`,
      `Generado el ${generadoEl}. Las notas pendientes se muestran con «${SIN_DATO}».`,
    ],
  };
}
