import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import * as api from './lib/api';
import { App } from './App';

function ingresar() {
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
    ingresar();
    expect(await screen.findByText('Ana · PROFESOR')).toBeInTheDocument();
    expect(screen.getByText('Cargando…')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Actividad'), { target: { value: '2' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salir' }));
    expect(screen.getByRole('button', { name: 'Ingresar' })).toBeInTheDocument();
  });

  it('debe avisar que las pantallas de otros roles vienen después', async () => {
    vi.spyOn(api, 'iniciarSesion').mockResolvedValue({
      token: 't',
      usuario: { id: 2, nombre: 'Rosa', rol: 'SECRETARIA' },
    });
    render(<App />);
    ingresar();
    expect(await screen.findByText(/se construyen en los sprints siguientes/)).toBeInTheDocument();
  });

  it('debe mostrar el error si el inicio de sesión falla', async () => {
    vi.spyOn(api, 'iniciarSesion').mockRejectedValue(
      new api.ErrorApi(401, 'Credenciales inválidas'),
    );
    render(<App />);
    ingresar();
    expect(await screen.findByRole('alert')).toHaveTextContent('Credenciales inválidas');
  });
});
