import { afterEach, describe, expect, it, vi } from 'vitest';
import { ErrorApi, guardarPlanilla, iniciarSesion, obtenerPlanilla } from './api';

function respuesta(estado: number, cuerpo: unknown) {
  return Promise.resolve(new Response(JSON.stringify(cuerpo), { status: estado }));
}

describe('cliente de la API', () => {
  afterEach(() => vi.restoreAllMocks());

  it('debe iniciar sesión con POST /auth/login', async () => {
    const fetch = vi
      .spyOn(globalThis, 'fetch')
      .mockReturnValue(
        respuesta(200, { token: 't', usuario: { id: 1, nombre: 'Ana', rol: 'PROFESOR' } }),
      );
    const sesion = await iniciarSesion('ana@ue.bo', 'secreta');
    expect(sesion.token).toBe('t');
    const [url, opciones] = fetch.mock.calls[0];
    expect(url).toEqual(expect.stringContaining('/auth/login'));
    expect(opciones?.method).toBe('POST');
  });

  it('debe enviar el token en las peticiones autenticadas', async () => {
    const fetch = vi
      .spyOn(globalThis, 'fetch')
      .mockReturnValue(respuesta(200, { actividad: {}, filas: [] }));
    await obtenerPlanilla(7, 'abc');
    const opciones = fetch.mock.calls[0][1];
    expect((opciones?.headers as Record<string, string>).Authorization).toBe('Bearer abc');
  });

  it('debe lanzar ErrorApi con el mensaje del servidor', async () => {
    vi.spyOn(globalThis, 'fetch').mockReturnValue(respuesta(403, { message: 'Sin permiso' }));
    await expect(guardarPlanilla(1, [], 't')).rejects.toEqual(new ErrorApi(403, 'Sin permiso'));
  });

  it('debe unir los mensajes de validación', async () => {
    vi.spyOn(globalThis, 'fetch').mockReturnValue(respuesta(400, { message: ['a', 'b'] }));
    await expect(guardarPlanilla(1, [], 't')).rejects.toThrow('a. b');
  });

  it('debe usar un mensaje genérico si el servidor no responde JSON', async () => {
    vi.spyOn(globalThis, 'fetch').mockReturnValue(
      Promise.resolve(new Response('x', { status: 500 })),
    );
    await expect(guardarPlanilla(1, [], 't')).rejects.toThrow(
      'Error de comunicación con el servidor',
    );
  });
});
