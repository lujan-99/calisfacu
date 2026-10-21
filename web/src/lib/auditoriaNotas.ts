import {
  corregirNota,
  historialNota,
  type RegistroAuditoriaNota,
  type ResultadoCorreccion,
} from './api';

const CLAVE_AUDITORIA_LOCAL = 'calisfacu_auditoria_notas_v1';
const EVENTO_AUDITORIA = 'calisfacu_auditoria_actualizada';

export interface RegistroAuditoriaDetallado {
  id: string;
  actividadId: number;
  estudianteId: number;
  estudianteNombre: string;
  notaId?: number | null;
  fecha: string;
  usuario: string;
  valorAnterior: number | null;
  valorNuevo: number;
  motivo: string;
  origen: 'REGISTRO' | 'CORRECCION';
}

export interface DatosCorreccion {
  actividadId: number;
  estudianteId: number;
  estudianteNombre: string;
  notaId?: number | null;
  valorActual: number;
  valorNuevo: number;
  motivo: string;
  usuarioNombre: string;
}

/** Obtiene todos los registros locales de auditoría (solo lectura). */
export function obtenerAuditoriaLocal(): RegistroAuditoriaDetallado[] {
  try {
    const raw = localStorage.getItem(CLAVE_AUDITORIA_LOCAL);
    if (!raw) return [];
    return JSON.parse(raw) as RegistroAuditoriaDetallado[];
  } catch {
    return [];
  }
}

/**
 * Guarda un registro de auditoría de forma inmutable (append-only, US-04 criterio 2).
 * No existen funciones para modificar ni eliminar registros de auditoría.
 */
function agregarRegistroAuditoriaLocal(
  registro: Omit<RegistroAuditoriaDetallado, 'id'>,
): RegistroAuditoriaDetallado {
  const lista = obtenerAuditoriaLocal();
  const id = `AUD-${new Date().getFullYear()}-${String(lista.length + 1).padStart(3, '0')}`;
  const nuevoRegistro: RegistroAuditoriaDetallado = { id, ...registro };
  lista.push(nuevoRegistro);
  localStorage.setItem(CLAVE_AUDITORIA_LOCAL, JSON.stringify(lista));

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(EVENTO_AUDITORIA, { detail: nuevoRegistro }));
  }
  return nuevoRegistro;
}

/** Suscribe a cambios en la auditoría para actualización en tiempo real en la interfaz. */
export function escucharCambiosAuditoria(callback: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  const handler = () => callback();
  window.addEventListener(EVENTO_AUDITORIA, handler);
  window.addEventListener('storage', handler);
  return () => {
    window.removeEventListener(EVENTO_AUDITORIA, handler);
    window.removeEventListener('storage', handler);
  };
}

/**
 * Valida y ejecuta una corrección auditable de nota (US-04, criterio 1).
 * Exige motivo obligatorio, escala de 1 a 100 y valor diferente al actual.
 */
export async function ejecutarCorreccionNota(
  datos: DatosCorreccion,
): Promise<{ resultadoApi?: ResultadoCorreccion; registro: RegistroAuditoriaDetallado }> {
  const motivoLimpio = datos.motivo.trim();
  if (!motivoLimpio) {
    throw new Error('El motivo de la corrección es obligatorio');
  }

  if (datos.valorNuevo < 1 || datos.valorNuevo > 100 || Number.isNaN(datos.valorNuevo)) {
    throw new Error('La nota debe estar entre 1 y 100');
  }

  if (datos.valorNuevo === datos.valorActual) {
    throw new Error('La nota nueva debe ser diferente a la nota actual');
  }

  let resultadoApi: ResultadoCorreccion | undefined;
  if (datos.notaId) {
    resultadoApi = await corregirNota(datos.notaId, {
      valor: datos.valorNuevo,
      motivo: motivoLimpio,
    });
  }

  const registro = agregarRegistroAuditoriaLocal({
    actividadId: datos.actividadId,
    estudianteId: datos.estudianteId,
    estudianteNombre: datos.estudianteNombre,
    notaId: datos.notaId ?? null,
    fecha: new Date().toISOString(),
    usuario: datos.usuarioNombre,
    valorAnterior: datos.valorActual,
    valorNuevo: datos.valorNuevo,
    motivo: motivoLimpio,
    origen: 'CORRECCION',
  });

  return { resultadoApi, registro };
}

/**
 * Obtiene el historial completo de auditoría para un estudiante en una actividad específica.
 * Combina registros del backend (si existe notaId) con la bitácora local.
 */
export async function obtenerHistorialNotaEstudiante(
  actividadId: number,
  estudianteId: number,
  notaId?: number | null,
): Promise<RegistroAuditoriaNota[]> {
  const registrosLocales = obtenerAuditoriaLocal().filter(
    (r) => r.actividadId === actividadId && r.estudianteId === estudianteId,
  );

  let registrosApi: RegistroAuditoriaNota[] = [];
  if (notaId) {
    try {
      registrosApi = await historialNota(notaId);
    } catch {
      registrosApi = [];
    }
  }

  // Si la API devolvió registros oficiales, los usamos
  if (registrosApi.length > 0) {
    return registrosApi;
  }

  // Si no hay de la API, formateamos los registros locales
  return registrosLocales.map((r) => ({
    fecha: r.fecha,
    usuario: r.usuario,
    valorAnterior: r.valorAnterior,
    valorNuevo: r.valorNuevo,
    motivo: r.motivo,
    origen: r.origen,
  }));
}

/** Obtiene todas las correcciones auditadas registradas en una actividad (para vista consolidada). */
export function obtenerCorreccionesActividad(actividadId: number): RegistroAuditoriaDetallado[] {
  return obtenerAuditoriaLocal().filter((r) => r.actividadId === actividadId);
}
