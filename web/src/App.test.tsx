import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import * as api from './lib/api';
import { App } from './App';

/** Helper reutilizable: rellena y envía el formulario de login. */
function ingresarComoMock() {
  fireEvent.change(screen.getByLabelText('Correo'), { target: { value: 'x@ue.bo' } });
  fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: 'secreta' } });
  fireEvent.click(screen.getByRole('button', { name: 'Ingresar' }));
}

describe('App', () => {
  afterEach(() => vi.restoreAllMocks());

  it('debe mostrar la planilla al profesor después de iniciar sesión', async () => {
    vi.spyOn(api, 'iniciarSesion').mockResolvedValue({
      token: 't',
      usuario: { id: 1, nombre: 'Ana', rol: 'PROFESOR' },
    });
    vi.spyOn(api, 'obtenerPlanilla').mockReturnValue(new Promise(() => {}));

    render(<App />);
    ingresarComoMock();

    expect(await screen.findByText('Ana · PROFESOR')).toBeInTheDocument();
    expect(screen.getByText('Cargando…')).toBeInTheDocument();

    // Cambia la actividad usando el aria-label del selector
    fireEvent.change(screen.getByLabelText('Actividad'), { target: { value: '2' } });

    fireEvent.click(screen.getByRole('button', { name: 'Salir' }));
    expect(screen.getByRole('button', { name: 'Ingresar' })).toBeInTheDocument();
  });

  it('debe mostrar la pantalla de rol para SECRETARIA después de iniciar sesión', async () => {
    vi.spyOn(api, 'iniciarSesion').mockResolvedValue({
      token: 't',
      usuario: { id: 2, nombre: 'Rosa', rol: 'SECRETARIA' },
    });
    render(<App />);
    ingresarComoMock();

    expect(await screen.findByText('Rosa · SECRETARIA')).toBeInTheDocument();
    expect(screen.getByText('Panel de Secretaría')).toBeInTheDocument();
    expect(screen.getByText('Centralizador de calificaciones')).toBeInTheDocument();
  });

  it('debe mostrar la pantalla de rol para ADMINISTRADOR después de iniciar sesión', async () => {
    vi.spyOn(api, 'iniciarSesion').mockResolvedValue({
      token: 't',
      usuario: { id: 3, nombre: 'Carlos', rol: 'ADMINISTRADOR' },
    });
    render(<App />);
    ingresarComoMock();

    expect(await screen.findByText('Carlos · ADMINISTRADOR')).toBeInTheDocument();
    expect(screen.getByText('Panel de Administración')).toBeInTheDocument();
    expect(screen.getByText('Gestión de usuarios y roles')).toBeInTheDocument();
  });

  it('debe mostrar la pantalla de rol para PADRE después de iniciar sesión', async () => {
    vi.spyOn(api, 'iniciarSesion').mockResolvedValue({
      token: 't',
      usuario: { id: 4, nombre: 'Mario', rol: 'PADRE' },
    });
    render(<App />);
    ingresarComoMock();

    expect(await screen.findByText('Mario · PADRE')).toBeInTheDocument();
    expect(screen.getByText('Portal de Familia')).toBeInTheDocument();
    expect(screen.getByText('Boletín de calificaciones')).toBeInTheDocument();
  });

  it('debe mostrar el error si el inicio de sesión falla', async () => {
    vi.spyOn(api, 'iniciarSesion').mockRejectedValue(
      new api.ErrorApi(401, 'Credenciales inválidas'),
    );
    render(<App />);
    ingresarComoMock();

    expect(await screen.findByRole('alert')).toHaveTextContent('Credenciales inválidas');
  });

  it('debe volver al login al cerrar sesión', async () => {
    vi.spyOn(api, 'iniciarSesion').mockResolvedValue({
      token: 't',
      usuario: { id: 1, nombre: 'Ana', rol: 'PROFESOR' },
    });
    vi.spyOn(api, 'obtenerPlanilla').mockReturnValue(new Promise(() => {}));

    render(<App />);
    ingresarComoMock();
    await screen.findByText('Ana · PROFESOR');

    fireEvent.click(screen.getByRole('button', { name: 'Salir' }));
    expect(screen.getByRole('button', { name: 'Ingresar' })).toBeInTheDocument();
  });
});
