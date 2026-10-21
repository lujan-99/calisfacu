import { fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as api from '../../lib/api';
import { abrir, DIMENSIONES, GESTION } from '../../prueba-utils';
import { textoSuma } from './Dimensiones';

afterEach(() => vi.restoreAllMocks());

describe('Dimensiones de evaluación (US-18, criterios 6 y 7)', () => {
  beforeEach(() => {
    vi.spyOn(api, 'listarGestiones').mockResolvedValue([GESTION]);
    vi.spyOn(api, 'listarDimensiones').mockResolvedValue(DIMENSIONES);
  });

  it('debe decir cuántos puntos faltan o sobran', () => {
    expect(textoSuma(100)).toBe('Suman 100 puntos');
    expect(textoSuma(95)).toBe('Suman 95; faltan 5 puntos');
    expect(textoSuma(110)).toBe('Suman 110; sobran 10 puntos');
  });

  it('debe permitir guardar solo cuando las dimensiones suman 100', async () => {
    const configurar = vi.spyOn(api, 'configurarDimensiones').mockResolvedValue(DIMENSIONES);
    abrir('/admin/dimensiones', 'ADMINISTRADOR');
    const hacer = await screen.findByLabelText('Puntaje máximo de Hacer');
    expect(screen.getByText('Suman 100 puntos')).toBeInTheDocument();
    fireEvent.change(hacer, { target: { value: '35' } });
    expect(screen.getByText('Suman 95; faltan 5 puntos')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Guardar' })).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Puntaje máximo de Ser'), { target: { value: '15' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));
    await waitFor(() => expect(configurar).toHaveBeenCalled());
    expect(configurar.mock.calls[0][1].map((d) => d.puntajeMaximo)).toEqual([15, 45, 35, 5]);
    expect(
      await screen.findByText('Se guardaron las dimensiones de la gestión 2026'),
    ).toBeInTheDocument();
  });

  it('debe bloquear la tabla si la gestión ya tiene notas', async () => {
    vi.spyOn(api, 'configurarDimensiones').mockRejectedValue(
      new api.ErrorApi(
        422,
        'La gestión ya tiene notas registradas: no se pueden cambiar sus dimensiones',
      ),
    );
    abrir('/admin/dimensiones', 'ADMINISTRADOR');
    fireEvent.click(await screen.findByRole('button', { name: 'Quitar Autoevaluación' }));
    fireEvent.click(screen.getByRole('button', { name: 'Agregar dimensión' }));
    const filas = screen.getAllByRole('row');
    expect(filas).toHaveLength(5);
    fireEvent.change(screen.getByLabelText('Código de la dimensión 4'), {
      target: { value: 'auto' },
    });
    fireEvent.change(screen.getByLabelText('Nombre de la dimensión 4'), {
      target: { value: 'Autoevaluación' },
    });
    fireEvent.change(screen.getByLabelText('Puntaje máximo de Autoevaluación'), {
      target: { value: '5' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));
    expect(
      await screen.findByText(
        'La gestión ya tiene notas registradas: no se pueden cambiar sus dimensiones',
      ),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Puntaje máximo de Ser')).toBeDisabled();
  });
});

describe('Boletín del padre (US-11, Sprint 3)', () => {
  it('debe avisar que el boletín todavía no está disponible', async () => {
    abrir('/padre/boletin', 'PADRE');
    expect(await screen.findByText('El boletín todavía no está disponible')).toBeInTheDocument();
  });
});
