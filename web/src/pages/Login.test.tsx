import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import * as api from '../lib/api';
import { Login } from './Login';

describe('Login', () => {
  afterEach(() => vi.restoreAllMocks());

  it('debe mostrar los campos de correo y contraseña', () => {
    render(<Login alIniciar={vi.fn()} />);
    expect(screen.getByLabelText('Correo')).toBeInTheDocument();
    expect(screen.getByLabelText('Contraseña')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ingresar' })).toBeEnabled();
  });

  it('debe llamar a alIniciar con los datos de sesión tras inicio exitoso', async () => {
    const alIniciar = vi.fn();
    const sesionMock: api.Sesion = {
      token: 'token-sintetico',
      usuario: { id: 1, nombre: 'Ana', rol: 'PROFESOR' },
    };
    vi.spyOn(api, 'iniciarSesion').mockResolvedValue(sesionMock);

    render(<Login alIniciar={alIniciar} />);
    fireEvent.change(screen.getByLabelText('Correo'), { target: { value: 'ana@colegio.bo' } });
    fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: 'clave123' } });
    fireEvent.click(screen.getByRole('button', { name: 'Ingresar' }));

    await vi.waitFor(() => {
      expect(alIniciar).toHaveBeenCalledWith(sesionMock);
    });
  });

  it('debe mostrar mensaje de error en un alert si las credenciales fallan', async () => {
    vi.spyOn(api, 'iniciarSesion').mockRejectedValue(
      new api.ErrorApi(401, 'Credenciales inválidas'),
    );

    render(<Login alIniciar={vi.fn()} />);
    fireEvent.change(screen.getByLabelText('Correo'), { target: { value: 'error@colegio.bo' } });
    fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: 'clave' } });
    fireEvent.click(screen.getByRole('button', { name: 'Ingresar' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Credenciales inválidas');
  });

  it('debe deshabilitar el botón y mostrar estado de envío durante la petición', () => {
    let resolver: (s: api.Sesion) => void = () => undefined;
    vi.spyOn(api, 'iniciarSesion').mockReturnValue(new Promise((r) => (resolver = r)));

    render(<Login alIniciar={vi.fn()} />);
    fireEvent.change(screen.getByLabelText('Correo'), { target: { value: 'espera@colegio.bo' } });
    fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: 'clave' } });
    fireEvent.click(screen.getByRole('button', { name: 'Ingresar' }));

    expect(screen.getByRole('button', { name: /Ingresando/ })).toBeDisabled();
    resolver({ token: 't', usuario: { id: 1, nombre: 'A', rol: 'PROFESOR' } });
  });
});
