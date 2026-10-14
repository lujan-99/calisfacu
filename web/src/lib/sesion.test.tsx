import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as api from './api';
import { DURACION_TOKEN_MS, RENOVAR_DESPUES_MS, SesionProvider, useSesion } from './sesion';

function Estado() {
  const { usuario, motivoSalida } = useSesion();
  return (
    <span>{usuario ? `con sesión de ${usuario.nombre}` : `sin sesión (${motivoSalida})`}</span>
  );
}

/** US-17, criterio 4 (D11): la sesión vence a los 30 minutos sin actividad. */
describe('Sesión (US-17, criterio 4)', () => {
  let reloj = 0;
  const ahora = () => reloj;
  const inicial = { token: 'primero', usuario: { id: 1, nombre: 'Ana', rol: 'PROFESOR' as const } };

  beforeEach(() => {
    vi.useFakeTimers();
    reloj = 1_000_000;
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  /** Avanza el reloj minuto a minuto, dejando que se resuelvan las promesas entre revisiones. */
  async function avanzar(ms: number) {
    for (let paso = 0; paso < ms; paso += 60_000) {
      await act(async () => {
        reloj += 60_000;
        await vi.advanceTimersByTimeAsync(60_000);
      });
    }
  }

  it('debe renovar el token si el usuario trabajó y pasaron 10 minutos', async () => {
    const renovar = vi
      .spyOn(api, 'renovarSesion')
      .mockResolvedValue({ ...inicial, token: 'segundo' });
    render(
      <SesionProvider ahora={ahora} inicial={inicial}>
        <Estado />
      </SesionProvider>,
    );
    await avanzar(5 * 60_000);
    act(() => void window.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' })));
    await avanzar(RENOVAR_DESPUES_MS);
    expect(renovar).toHaveBeenCalledOnce();
    expect(screen.getByText('con sesión de Ana')).toBeInTheDocument();
  });

  it('no debe renovar si no hubo actividad, y debe cerrar la sesión a los 30 minutos', async () => {
    const renovar = vi.spyOn(api, 'renovarSesion');
    render(
      <SesionProvider ahora={ahora} inicial={inicial}>
        <Estado />
      </SesionProvider>,
    );
    await avanzar(DURACION_TOKEN_MS + 60_000);
    expect(renovar).not.toHaveBeenCalled();
    expect(screen.getByText('sin sesión (expirada)')).toBeInTheDocument();
  });

  it('debe cerrar la sesión si la renovación falla', async () => {
    vi.spyOn(api, 'renovarSesion').mockRejectedValue(new api.ErrorApi(401, 'Su sesión expiró'));
    render(
      <SesionProvider ahora={ahora} inicial={inicial}>
        <Estado />
      </SesionProvider>,
    );
    await avanzar(60_000);
    act(() => void window.dispatchEvent(new Event('pointerdown')));
    await avanzar(RENOVAR_DESPUES_MS);
    expect(screen.getByText('sin sesión (expirada)')).toBeInTheDocument();
  });

  it('debe exigir el proveedor', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    expect(() => render(<Estado />)).toThrow('useSesion debe usarse dentro de SesionProvider');
  });
});
