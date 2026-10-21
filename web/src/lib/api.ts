// Cliente HTTP hacia la API. El token JWT vive solo en memoria (no en localStorage): al recargar la página hay que
// volver a ingresar, y un script inyectado no puede leerlo del almacenamiento del navegador.
const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api';

export type Rol = 'ADMINISTRADOR' | 'SECRETARIA' | 'PROFESOR' | 'PADRE';
export interface Usuario {
  id: number;
  nombre: string;
  rol: Rol;
}
export interface Sesion {
  token: string;
  usuario: Usuario;
}

export class ErrorApi extends Error {
  constructor(
    public readonly estado: number,
    mensaje: string,
  ) {
    super(mensaje);
  }
}

let tokenActual: string | null = null;
let alExpirar: (() => void) | null = null;

/** Lo llama SesionProvider: el token de la sesión y qué hacer si la API responde 401 (sesión vencida). */
export function configurarSesion(token: string | null, expirada: (() => void) | null = null) {
  tokenActual = token;
  alExpirar = expirada;
}

async function pedir(ruta: string, opciones: RequestInit = {}): Promise<Response> {
  const esFormulario = opciones.body instanceof FormData;
  const respuesta = await fetch(`${BASE}${ruta}`, {
    ...opciones,
    headers: {
      ...(esFormulario ? {} : { 'Content-Type': 'application/json' }),
      ...(tokenActual ? { Authorization: `Bearer ${tokenActual}` } : {}),
      ...opciones.headers,
    },
  });
  if (!respuesta.ok) {
    if (respuesta.status === 401 && tokenActual) alExpirar?.();
    const cuerpo = (await respuesta.json().catch(() => ({}))) as { message?: string | string[] };
    const mensaje = Array.isArray(cuerpo.message) ? cuerpo.message.join('. ') : cuerpo.message;
    throw new ErrorApi(respuesta.status, mensaje ?? 'Error de comunicación con el servidor');
  }
  return respuesta;
}

async function solicitar<T>(ruta: string, opciones: RequestInit = {}): Promise<T> {
  const respuesta = await pedir(ruta, opciones);
  if (respuesta.status === 204) return undefined as T;
  return (await respuesta.json()) as T;
}

/** Descarga un archivo de la API (por ejemplo, la plantilla de importación) con el token de la sesión. */
async function solicitarArchivo(ruta: string): Promise<Blob> {
  return (await pedir(ruta)).blob();
}

const enviar = (metodo: string, cuerpo?: unknown): RequestInit => ({
  method: metodo,
  body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
});

// ---------- Sesión (US-17) ----------

export function iniciarSesion(email: string, contrasena: string): Promise<Sesion> {
  return solicitar<Sesion>('/auth/login', enviar('POST', { email, contrasena }));
}

export function renovarSesion(): Promise<Sesion> {
  return solicitar<Sesion>('/auth/renovar', enviar('POST'));
}

// ---------- Institución (ADR-0010) ----------

export interface Colores {
  marca: string;
  primario: string;
  acento: string;
}
export interface Institucion {
  nombre: string | null;
  codigoSie: string | null;
  colores: Colores;
  logoVersion: number | null;
}

export const obtenerInstitucion = () => solicitar<Institucion>('/institucion');
export const urlLogo = (version: number) => `${BASE}/institucion/logo?v=${version}`;

export interface UnidadEducativa extends Institucion {
  id: number;
  nombre: string;
  codigoSie: string;
}
export const obtenerUnidadEducativa = () => solicitar<UnidadEducativa>('/unidad-educativa');
export const guardarUnidadEducativa = (datos: { nombre: string; codigoSie: string }) =>
  solicitar<UnidadEducativa>('/unidad-educativa', enviar('PUT', datos));

// ---------- Gestión académica (US-18) ----------

export type Nivel = 'INICIAL' | 'PRIMARIA' | 'SECUNDARIA';
export interface Resumen {
  id: number;
  nombre: string;
}
export interface Gestion {
  id: number;
  anio: number;
}
export interface Trimestre {
  id: number;
  numero: number;
  cerrado: boolean;
}
export interface Curso {
  id: number;
  gestion: Gestion;
  nivel: Nivel;
  anioEscolaridad: number;
  paralelo: string;
  nombre: string;
  estudiantes: number;
  materias: number;
}
export interface DatosCurso {
  nivel: Nivel;
  anioEscolaridad: number;
  paralelo: string;
}
export interface Estudiante {
  id: number;
  codigoRude: string;
  nombres: string;
  apellidos: string;
  curso: Resumen;
  gestion: Gestion;
}
export interface DatosEstudiante {
  cursoId: number;
  codigoRude: string;
  nombres: string;
  apellidos: string;
}
export interface Materia {
  id: number;
  nombre: string;
  curso: Resumen;
  gestion: Gestion;
  profesor: Resumen;
}

function consulta(filtros: Record<string, string | number | undefined>) {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(filtros))
    if (v !== undefined && v !== '') p.set(k, String(v));
  const texto = p.toString();
  return texto ? `?${texto}` : '';
}

export const listarGestiones = () => solicitar<Gestion[]>('/gestiones');
export const listarTrimestres = (gestionId: number) =>
  solicitar<Trimestre[]>(`/gestiones/${gestionId}/trimestres`);

export const listarCursos = (f: { gestionId?: number; nivel?: Nivel }) =>
  solicitar<Curso[]>(`/cursos${consulta(f)}`);
export const crearCurso = (d: DatosCurso & { gestionId: number }) =>
  solicitar<Curso>('/cursos', enviar('POST', d));
export const actualizarCurso = (id: number, d: DatosCurso) =>
  solicitar<Curso>(`/cursos/${id}`, enviar('PUT', d));
export const borrarCurso = (id: number) => solicitar<void>(`/cursos/${id}`, enviar('DELETE'));

export const listarEstudiantes = (f: { gestionId?: number; cursoId?: number; apellido?: string }) =>
  solicitar<Estudiante[]>(`/estudiantes${consulta(f)}`);
export const crearEstudiante = (d: DatosEstudiante) =>
  solicitar<Estudiante>('/estudiantes', enviar('POST', d));
export const actualizarEstudiante = (id: number, d: DatosEstudiante) =>
  solicitar<Estudiante>(`/estudiantes/${id}`, enviar('PUT', d));
export const borrarEstudiante = (id: number) =>
  solicitar<void>(`/estudiantes/${id}`, enviar('DELETE'));

export const listarMaterias = (f: { gestionId?: number; cursoId?: number }) =>
  solicitar<Materia[]>(`/materias${consulta(f)}`);
export const misMaterias = () => solicitar<Materia[]>('/materias/mias');
export const obtenerMateria = (id: number) => solicitar<Materia>(`/materias/${id}`);
export const crearMateria = (d: { cursoId: number; nombre: string; profesorId: number }) =>
  solicitar<Materia>('/materias', enviar('POST', d));
export const actualizarMateria = (id: number, d: { nombre: string; profesorId: number }) =>
  solicitar<Materia>(`/materias/${id}`, enviar('PUT', d));
export const borrarMateria = (id: number) => solicitar<void>(`/materias/${id}`, enviar('DELETE'));
export const listarProfesores = () => solicitar<Resumen[]>('/profesores');

// ---------- Dimensiones (US-18, criterios 6 y 7) ----------

export interface Dimension {
  id: number;
  codigo: string;
  nombre: string;
  puntajeMaximo: number;
  orden: number;
}
export type DatosDimension = Omit<Dimension, 'id'>;
export const listarDimensiones = (gestionId: number) =>
  solicitar<Dimension[]>(`/gestiones/${gestionId}/dimensiones`);
export const configurarDimensiones = (gestionId: number, dimensiones: DatosDimension[]) =>
  solicitar<Dimension[]>(`/gestiones/${gestionId}/dimensiones`, enviar('PUT', { dimensiones }));

// ---------- Notas (US-01) y cálculo (US-02) ----------

export interface ActividadResumen {
  id: number;
  nombre: string;
  dimension: { id: number; codigo: string; nombre: string };
  notasRegistradas: number;
}
export interface Actividades {
  estudiantes: number;
  actividades: ActividadResumen[];
}
export const listarActividades = (materiaId: number, trimestreId: number) =>
  solicitar<Actividades>(`/notas/actividades${consulta({ materiaId, trimestreId })}`);
export const crearActividad = (d: {
  materiaId: number;
  trimestreId: number;
  dimensionId: number;
  nombre: string;
}) => solicitar<{ id: number; nombre: string }>('/notas/actividades', enviar('POST', d));

export interface FilaPlanilla {
  estudianteId: number;
  estudiante: string;
  valor: number | null;
  notaId?: number | null;
}
export interface Planilla {
  actividad: {
    id: number;
    nombre: string;
    dimension: string;
    materia: string;
    materiaId: number;
    curso: string;
    trimestre: Trimestre;
  };
  filas: FilaPlanilla[];
}
export const obtenerPlanilla = (actividadId: number) =>
  solicitar<Planilla>(`/notas/actividades/${actividadId}`);
export const guardarPlanilla = (
  actividadId: number,
  notas: { estudianteId: number; valor: number }[],
) => solicitar<{ guardadas: number }>('/notas/planilla', enviar('POST', { actividadId, notas }));

export interface NotaTrimestral {
  estudianteId: number;
  estudiante: string;
  dimensiones: { codigo: string; puntos: number | null }[];
  nota: number | null;
  aprobado: boolean | null;
  pendientes: string[];
}
export const notasTrimestrales = (materiaId: number, trimestreId: number) =>
  solicitar<NotaTrimestral[]>(`/calculo/materias/${materiaId}/trimestres/${trimestreId}`);

// ---------- Auditoría y corrección de notas (US-04, RNF-04, M15) ----------

export interface RegistroAuditoriaNota {
  fecha: string;
  usuario: string;
  valorAnterior: number | null;
  valorNuevo: number;
  motivo: string | null;
  origen: 'REGISTRO' | 'CORRECCION' | 'IMPORTACION';
}

export interface ResultadoCorreccion {
  notaId: number;
  valorAnterior: number;
  valorNuevo: number;
}

export const corregirNota = (notaId: number, datos: { valor: number; motivo: string }) =>
  solicitar<ResultadoCorreccion>(`/notas/${notaId}/correccion`, enviar('PATCH', datos));

export const historialNota = (notaId: number) =>
  solicitar<RegistroAuditoriaNota[]>(`/notas/${notaId}/historial`);

// ---------- Historial Académico Anual del Estudiante (US-03) ----------

export interface NotaMateriaHistorial {
  materiaId: number;
  materia: string;
  profesor?: string;
  dimensiones: { codigo: string; nombre: string; puntos: number | null; puntajeMaximo: number }[];
  nota: number | null;
  aprobado: boolean | null;
  pendientes?: string[];
}

export interface TrimestreHistorial {
  trimestreId: number;
  numero: number;
  cerrado: boolean;
  promedioTrimestral: number | null;
  materias: NotaMateriaHistorial[];
}

export interface HistorialAcademicoEstudiante {
  estudiante: {
    id: number;
    codigoRude: string;
    ci?: string | null;
    nombres: string;
    apellidos: string;
    curso: Resumen;
    gestion: Gestion;
  };
  trimestres: TrimestreHistorial[];
  promedioAnual: number | null;
  tendencia: 'ASCENDENTE' | 'DESCENDENTE' | 'ESTABLE' | 'PENDIENTE';
  estadoAnual: 'PROMOVIDO' | 'EN_RIESGO' | 'PENDIENTE';
}

export const obtenerHistorialAcademicoEstudiante = (estudianteId: number) =>
  solicitar<HistorialAcademicoEstudiante>(`/estudiantes/${estudianteId}/historial`);

// ---------- Asistencia por clase (US-19, T-036, T-037) ----------

export type EstadoAsistencia = 'PRESENTE' | 'AUSENTE' | 'LICENCIA';

export interface FilaAsistenciaClase {
  estudianteId: number;
  estudiante: string;
  estado: EstadoAsistencia | null;
}

export interface AsistenciaClase {
  materia: string;
  fecha: string;
  filas: FilaAsistenciaClase[];
}

export interface RegistrarAsistenciaPayload {
  registros: {
    estudianteId: number;
    estado: EstadoAsistencia;
  }[];
}

export interface PorcentajeAsistenciaEstudiante {
  estudianteId: number;
  estudiante: string;
  presentes: number;
  licencias: number;
  ausentes: number;
  clases: number;
  porcentaje: number | null;
}

export const obtenerAsistenciaClase = (materiaId: number, fecha: string) =>
  solicitar<AsistenciaClase>(`/asistencias/materias/${materiaId}/fechas/${fecha}`);

export const guardarAsistenciaClase = (
  materiaId: number,
  fecha: string,
  datos: RegistrarAsistenciaPayload,
) =>
  solicitar<{ fecha: string; guardados: number }>(
    `/asistencias/materias/${materiaId}/fechas/${fecha}`,
    enviar('PUT', datos),
  );

export const obtenerPorcentajesAsistencia = (materiaId: number, desde?: string, hasta?: string) => {
  const params = new URLSearchParams();
  if (desde) params.set('desde', desde);
  if (hasta) params.set('hasta', hasta);
  const qs = params.toString();
  return solicitar<PorcentajeAsistenciaEstudiante[]>(
    `/asistencias/materias/${materiaId}/porcentajes${qs ? `?${qs}` : ''}`,
  );
};

// --- Control de Entrega de Notas (US-10, T-040) ---

export type EstadoEntrega = 'ENTREGADO' | 'PENDIENTE';

export interface EntregaMateria {
  materiaId: number;
  materia: string;
  cursoId: number;
  curso: string;
  profesorId: number | null;
  profesor: string;
  trimestreId: number;
  trimestreNumero: number;
  estado: EstadoEntrega;
  fechaEntrega?: string | null;
  totalActividades: number;
  totalEstudiantes: number;
  totalNotasRegistradas: number;
  totalNotasRequeridas: number;
  notasFaltantes: number;
}

export const obtenerControlEntregas = (gestionId?: number, trimestreId?: number) => {
  const params = new URLSearchParams();
  if (gestionId) params.set('gestionId', String(gestionId));
  if (trimestreId) params.set('trimestreId', String(trimestreId));
  const qs = params.toString();
  return solicitar<EntregaMateria[]>(`/entregas${qs ? `?${qs}` : ''}`);
};

export const obtenerEstadoEntregaMateria = (materiaId: number, trimestreId: number) =>
  solicitar<EntregaMateria>(`/entregas/materias/${materiaId}?trimestreId=${trimestreId}`);

export const marcarEntregaMateria = (materiaId: number, trimestreId: number) =>
  solicitar<{ exito: boolean; mensaje: string; entrega: EntregaMateria }>(
    `/entregas/materias/${materiaId}/entregar`,
    enviar('POST', { trimestreId }),
  );

// ---------- Importación desde Excel (US-05, T-038, T-039) ----------

export interface FilaImportacionValida {
  estudianteId: number;
  codigoRude: string;
  estudiante: string;
  valor: number;
  valida: true;
}

export interface FilaImportacionObservada {
  linea: number;
  identificador: string;
  valorIngresado: string;
  motivo: string;
  valida: false;
}

export interface VistaPreviaImportacion {
  totalFilas: number;
  filasValidas: FilaImportacionValida[];
  filasObservadas: FilaImportacionObservada[];
  resumen: { total: number; validas: number; errores: number };
}

const conArchivo = (archivo: File): RequestInit => {
  const datos = new FormData();
  datos.append('archivo', archivo);
  return { method: 'POST', body: datos };
};

export const descargarPlantillaImportacion = (actividadId: number) =>
  solicitarArchivo(`/importaciones/actividades/${actividadId}/plantilla`);

/** Criterio 1: la API lee el .xlsx y dice qué filas se guardarían; no guarda nada. */
export const vistaPreviaImportacion = (actividadId: number, archivo: File) =>
  solicitar<VistaPreviaImportacion>(
    `/importaciones/actividades/${actividadId}/vista-previa`,
    conArchivo(archivo),
  );

/** Criterios 2 y 3: la API vuelve a validar el archivo y guarda las filas válidas con auditoría "importación". */
export const confirmarImportacion = (actividadId: number, archivo: File) =>
  solicitar<{ guardadas: number; rechazadas: number }>(
    `/importaciones/actividades/${actividadId}/confirmar`,
    conArchivo(archivo),
  );
