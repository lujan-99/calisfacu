import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import * as api from '../lib/api';
import { Planilla } from './Planilla';

const planilla: api.Planilla = {
  actividad: { id: 1, nombre: 'Examen 1', dimension: 'Saber', materia: 'Matemática' },
  filas: [
    { estudianteId: 10, estudiante: 'Quispe, Ana', valor: null },
    { estudianteId: 11, estudiante: 'Mamani, Luis', valor: 80 },
  ],
};

describe('Planilla', () => {
  afterEach(() => vi.restoreAllMocks());

  it('debe guardar solo las notas nuevas y mostrar cuántas se guardaron', async () => {
    vi.spyOn(api, 'obtenerPlanilla').mockResolvedValue(planilla);
    const guardar = vi.spyOn(api, 'guardarPlanilla').mockResolvedValue({ guardadas: 1 });
    render(<Planilla token="t" actividadId={1} />);

    const campo = await screen.findByLabelText('Nota de Quispe, Ana');
    expect(screen.getByLabelText('Nota de Mamani, Luis')).toBeDisabled();
    fireEvent.change(campo, { target: { value: '75' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar planilla' }));

    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent('Se guardaron 1 notas'),
    );
    expect(guardar).toHaveBeenCalledWith(1, [{ estudianteId: 10, valor: 75 }], 't');
  });

  it('debe mostrar el error junto al campo y no enviar si una nota es inválida', async () => {
    vi.spyOn(api, 'obtenerPlanilla').mockResolvedValue(planilla);
    const guardar = vi.spyOn(api, 'guardarPlanilla');
    render(<Planilla token="t" actividadId={1} />);

    fireEvent.change(await screen.findByLabelText('Nota de Quispe, Ana'), {
      target: { value: '120' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar planilla' }));

    expect(await screen.findByText('La nota debe estar entre 1 y 100')).toBeInTheDocument();
    expect(guardar).not.toHaveBeenCalled();
  });

  it('debe mostrar el mensaje del servidor si falla al guardar', async () => {
    vi.spyOn(api, 'obtenerPlanilla').mockResolvedValue(planilla);
    vi.spyOn(api, 'guardarPlanilla').mockRejectedValue(new api.ErrorApi(403, 'Sin permiso'));
    render(<Planilla token="t" actividadId={1} />);

    fireEvent.change(await screen.findByLabelText('Nota de Quispe, Ana'), {
      target: { value: '60' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar planilla' }));

    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Sin permiso'));
  });

  it('debe mostrar el error si no puede cargar la planilla', async () => {
    vi.spyOn(api, 'obtenerPlanilla').mockRejectedValue(new Error('No encontrada'));
    render(<Planilla token="t" actividadId={99} />);
    expect(await screen.findByText('No encontrada')).toBeInTheDocument();
  });
});
