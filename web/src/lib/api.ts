// Cliente HTTP mínimo hacia la API. El token JWT vive solo en memoria de la sesión del navegador.
const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api';

export type Rol = 'ADMINISTRADOR' | 'SECRETARIA' | 'PROFESOR' | 'PADRE';
export interface Sesion {
  token: string;
  usuario: { id: number; nombre: string; rol: Rol };
}

export class ErrorApi extends Error {
  constructor(
    public readonly estado: number,
    mensaje: string,
  ) {
    super(mensaje);
  }
}

async function solicitar<T>(ruta: string, opciones: RequestInit = {}, token?: string): Promise<T> {
  const respuesta = await fetch(`${BASE}${ruta}`, {
    ...opciones,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...opciones.headers,
    },
  });
  if (!respuesta.ok) {
    const cuerpo = (await respuesta.json().catch(() => ({}))) as { message?: string | string[] };
    const mensaje = Array.isArray(cuerpo.message) ? cuerpo.message.join('. ') : cuerpo.message;
    throw new ErrorApi(respuesta.status, mensaje ?? 'Error de comunicación con el servidor');
  }
  return (await respuesta.json()) as T;
}

export function iniciarSesion(email: string, contrasena: string): Promise<Sesion> {
  return solicitar<Sesion>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, contrasena }),
  });
}

export interface FilaPlanilla {
  estudianteId: number;
  estudiante: string;
  valor: number | null;
}
export interface Planilla {
  actividad: { id: number; nombre: string; dimension: string; materia: string };
  filas: FilaPlanilla[];
}

export function obtenerPlanilla(actividadId: number, token: string): Promise<Planilla> {
  return solicitar<Planilla>(`/notas/actividades/${actividadId}`, {}, token);
}

export function guardarPlanilla(
  actividadId: number,
  notas: { estudianteId: number; valor: number }[],
  token: string,
): Promise<{ guardadas: number }> {
  return solicitar(
    '/notas/planilla',
    { method: 'POST', body: JSON.stringify({ actividadId, notas }) },
    token,
  );
}
