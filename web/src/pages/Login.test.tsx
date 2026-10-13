import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Login } from './Login';

describe('Login', () => {
  it('debe mostrar los campos de correo y contraseña', () => {
    render(<Login alIniciar={vi.fn()} />);
    expect(screen.getByLabelText('Correo')).toBeInTheDocument();
    expect(screen.getByLabelText('Contraseña')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ingresar' })).toBeEnabled();
  });
});
