export type EstadoSolicitud = 'PENDIENTE' | 'APROBADA' | 'RECHAZADA';

export interface EstudianteEnSolicitud {
  estudianteId: number;
  estudianteNombre: string;
  notaActual: number;
}

export interface SolicitudEdicion {
  id: string;
  profesorId: number;
  profesorNombre: string;
  actividadId: number;
  actividadNombre: string;
  materiaId?: number;
  materiaNombre: string;
  cursoNombre: string;
  dimension: string;
  estudiantes: EstudianteEnSolicitud[];
  motivo: string;
  fechaSolicitud: string;
  estado: EstadoSolicitud;
  fechaResolucion?: string;
  observacionAdmin?: string;
}

const CLAVE_STORAGE = 'calisfacu_tickets_edicion_v1';
const EVENTO_CAMBIO = 'calisfacu_ticket_actualizado';

function cargarSolicitudes(): SolicitudEdicion[] {
  try {
    const raw = localStorage.getItem(CLAVE_STORAGE);
    if (!raw) return [];
    return JSON.parse(raw) as SolicitudEdicion[];
  } catch {
    return [];
  }
}

function guardarSolicitudes(solicitudes: SolicitudEdicion[]) {
  try {
    localStorage.setItem(CLAVE_STORAGE, JSON.stringify(solicitudes));
    window.dispatchEvent(new CustomEvent(EVENTO_CAMBIO));
  } catch {
    // Si localStorage está deshabilitado o lleno, no bloqueamos
  }
}

export function obtenerSolicitudes(): SolicitudEdicion[] {
  return cargarSolicitudes();
}

export function obtenerSolicitudPorId(id: string): SolicitudEdicion | undefined {
  return cargarSolicitudes().find((s) => s.id === id);
}

export function crearSolicitud(
  datos: Omit<SolicitudEdicion, 'id' | 'fechaSolicitud' | 'estado'>,
): SolicitudEdicion {
  const solicitudes = cargarSolicitudes();
  const anio = new Date().getFullYear();
  const correlativo = String(solicitudes.length + 1).padStart(3, '0');
  const nueva: SolicitudEdicion = {
    ...datos,
    id: `TCK-${anio}-${correlativo}`,
    fechaSolicitud: new Date().toISOString(),
    estado: 'PENDIENTE',
  };
  guardarSolicitudes([nueva, ...solicitudes]);
  return nueva;
}

export function aprobarSolicitud(id: string, observacion?: string): void {
  const solicitudes = cargarSolicitudes();
  const actualizadas = solicitudes.map((s) => {
    if (s.id === id) {
      return {
        ...s,
        estado: 'APROBADA',
        fechaResolucion: new Date().toISOString(),
        observacionAdmin: observacion || 'Habilitación autorizada por Dirección Académica',
      };
    }
    return s;
  });
  guardarSolicitudes(actualizadas);
}

export function rechazarSolicitud(id: string, motivo: string): void {
  const solicitudes = cargarSolicitudes();
  const actualizadas = solicitudes.map((s) => {
    if (s.id === id) {
      return {
        ...s,
        estado: 'RECHAZADA',
        fechaResolucion: new Date().toISOString(),
        observacionAdmin: motivo,
      };
    }
    return s;
  });
  guardarSolicitudes(actualizadas);
}

export function obtenerEstadoEdicionEstudiante(
  actividadId: number,
  estudianteId: number,
): { habilitada: boolean; ticket?: SolicitudEdicion } {
  const solicitudes = cargarSolicitudes();
  // Buscamos solicitudes donde participe este estudiante en esta actividad
  const ticketEstudiante = solicitudes.find(
    (s) =>
      s.actividadId === actividadId && s.estudiantes.some((e) => e.estudianteId === estudianteId),
  );

  if (!ticketEstudiante) {
    return { habilitada: false };
  }

  return {
    habilitada: ticketEstudiante.estado === 'APROBADA',
    ticket: ticketEstudiante,
  };
}

export function marcarEdicionConsumida(actividadId: number, estudianteId: number): void {
  const solicitudes = cargarSolicitudes();
  const actualizadas = solicitudes.map((s) => {
    if (
      s.actividadId === actividadId &&
      s.estado === 'APROBADA' &&
      s.estudiantes.some((e) => e.estudianteId === estudianteId)
    ) {
      return {
        ...s,
        observacionAdmin: `${s.observacionAdmin ?? ''} (Edición completada y guardada)`,
      };
    }
    return s;
  });
  guardarSolicitudes(actualizadas);
}

export function escucharCambiosSolicitudes(cb: () => void): () => void {
  const listener = () => cb();
  window.addEventListener(EVENTO_CAMBIO, listener);
  window.addEventListener('storage', listener);
  return () => {
    window.removeEventListener(EVENTO_CAMBIO, listener);
    window.removeEventListener('storage', listener);
  };
}
