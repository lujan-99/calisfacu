import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  borrarCurso,
  configurarSesion,
  ErrorApi,
  guardarPlanilla,
  iniciarSesion,
  listarEstudiantes,
  obtenerPlanilla,
} from './api';

function respuesta(estado: number, cuerpo?: unknown) {
  return Promise.resolve(
    new Response(cuerpo === undefined ? null : JSON.stringify(cuerpo), { status: estado }),
  );
}
const cabeceras = (f: ReturnType<typeof vi.spyOn>) =>
  (f.mock.calls[0] as [string, RequestInit])[1].headers as Record<string, string>;

describe('Cliente de la API', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    configurarSesion(null);
  });

  it('debe iniciar sesión con POST /auth/login sin enviar token', async () => {
    const fetch = vi
      .spyOn(globalThis, 'fetch')
      .mockReturnValue(
        respuesta(200, { token: 't', usuario: { id: 1, nombre: 'Ana', rol: 'PROFESOR' } }),
      );
    const sesion = await iniciarSesion('ana@ue.bo', 'secreta');
    expect(sesion.token).toBe('t');
    const [url, opciones] = fetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/auth/login');
    expect(opciones.method).toBe('POST');
    expect(cabeceras(fetch).Authorization).toBeUndefined();
  });

  it('debe enviar el token de la sesión en las peticiones autenticadas', async () => {
    configurarSesion('abc');
    const fetch = vi
      .spyOn(globalThis, 'fetch')
      .mockReturnValue(respuesta(200, { actividad: {}, filas: [] }));
    await obtenerPlanilla(7);
    expect(cabeceras(fetch).Authorization).toBe('Bearer abc');
  });

  it('debe avisar que la sesión expiró cuando la API responde 401 con una sesión abierta', async () => {
    const expirada = vi.fn();
    configurarSesion('abc', expirada);
    vi.spyOn(globalThis, 'fetch').mockReturnValue(respuesta(401, { message: 'Unauthorized' }));
    await expect(obtenerPlanilla(7)).rejects.toBeInstanceOf(ErrorApi);
    expect(expirada).toHaveBeenCalledOnce();
  });

  it('no debe avisar expiración por un 401 del inicio de sesión', async () => {
    const expirada = vi.fn();
    configurarSesion(null, expirada);
    vi.spyOn(globalThis, 'fetch').mockReturnValue(
      respuesta(401, { message: 'Credenciales inválidas' }),
    );
    await expect(iniciarSesion('a@b.bo', 'x')).rejects.toThrow('Credenciales inválidas');
    expect(expirada).not.toHaveBeenCalled();
  });

  it('debe unir los mensajes de validación de la API', async () => {
    vi.spyOn(globalThis, 'fetch').mockReturnValue(respuesta(400, { message: ['Uno', 'Dos'] }));
    await expect(guardarPlanilla(1, [])).rejects.toThrow('Uno. Dos');
  });

  it('debe usar un mensaje genérico si la respuesta no trae mensaje', async () => {
    vi.spyOn(globalThis, 'fetch').mockReturnValue(
      Promise.resolve(new Response('<html>', { status: 502 })),
    );
    await expect(obtenerPlanilla(1)).rejects.toThrow('Error de comunicación con el servidor');
  });

  it('debe aceptar respuestas 204 sin cuerpo', async () => {
    vi.spyOn(globalThis, 'fetch').mockReturnValue(respuesta(204));
    await expect(borrarCurso(3)).resolves.toBeUndefined();
  });

  it('debe armar la consulta solo con los filtros indicados', async () => {
    const fetch = vi.spyOn(globalThis, 'fetch').mockReturnValue(respuesta(200, []));
    await listarEstudiantes({ cursoId: 4, apellido: '', gestionId: undefined });
    expect((fetch.mock.calls[0] as [string])[0]).toMatch(/\/estudiantes\?cursoId=4$/);
  });
});
