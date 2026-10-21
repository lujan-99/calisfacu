import type { SolicitudEdicion } from './api';

export type EstadoEdicion =
  | { tipo: 'BLOQUEADA' }
  | { tipo: 'PENDIENTE'; solicitudId: number }
  | { tipo: 'HABILITADA'; solicitudId: number }
  | { tipo: 'RECHAZADA'; solicitudId: number; observacion: string };

/**
 * Estado de edición de la nota de un estudiante según las solicitudes de la actividad (decisión D16): la más
 * reciente que lo incluye manda. Una aprobación ya usada vuelve a bloquear la nota.
 */
export function estadoEdicion(
  solicitudes: readonly SolicitudEdicion[],
  estudianteId: number,
): EstadoEdicion {
  const ultima = [...solicitudes]
    .sort((a, b) => b.id - a.id)
    .find((s) => s.estudiantes.some((e) => e.estudianteId === estudianteId));
  if (!ultima) return { tipo: 'BLOQUEADA' };
  const item = ultima.estudiantes.find((e) => e.estudianteId === estudianteId)!;
  if (ultima.estado === 'PENDIENTE') return { tipo: 'PENDIENTE', solicitudId: ultima.id };
  if (ultima.estado === 'RECHAZADA') {
    return {
      tipo: 'RECHAZADA',
      solicitudId: ultima.id,
      observacion: ultima.observacionAdmin ?? '',
    };
  }
  return item.usada ? { tipo: 'BLOQUEADA' } : { tipo: 'HABILITADA', solicitudId: ultima.id };
}

/** Se puede pedir una solicitud nueva si no hay una pendiente ni una aprobación sin usar. */
export const puedePedirEdicion = (estado: EstadoEdicion) =>
  estado.tipo === 'BLOQUEADA' || estado.tipo === 'RECHAZADA';
