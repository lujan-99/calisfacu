import { render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import * as api from './api';
import { aplicarColores, iniciales, InstitucionProvider, useInstitucion } from './institucion';

function Muestra() {
  const i = useInstitucion();
  return (
    <span>
      {i.nombre ?? 'sin nombre'} · {i.iniciales} · {i.logoUrl ?? 'sin logo'}
    </span>
  );
}

/** ADR-0010: los colores y el logo vienen de la API, no del código. */
describe('Institución (ADR-0010)', () => {
  afterEach(() => vi.restoreAllMocks());

  it.each([
    ['Unidad Educativa Juana Azurduy', 'JA'],
    ['U. E. San Simón', 'SS'],
    ['Colegio Nacional de La Plata', 'CN'],
    ['Unidad Educativa de Prueba', 'UE'],
    [null, 'UE'],
    ['', 'UE'],
  ])('debe sacar las iniciales de %s', (nombre, esperado) => {
    expect(iniciales(nombre)).toBe(esperado);
  });

  it('debe aplicar los colores como variables CSS', () => {
    aplicarColores({ marca: '#2B1D0E', primario: '#7A2E0E', acento: '#E9C46A' });
    const estilo = document.documentElement.style;
    expect(estilo.getPropertyValue('--color-marca')).toBe('#2B1D0E');
    expect(estilo.getPropertyValue('--color-primario')).toBe('#7A2E0E');
    expect(estilo.getPropertyValue('--color-acento')).toBe('#E9C46A');
  });

  it('debe cargar la institución de la API, con su logo versionado', async () => {
    vi.spyOn(api, 'obtenerInstitucion').mockResolvedValue({
      nombre: 'Unidad Educativa Juana Azurduy',
      codigoSie: '80980123',
      colores: { marca: '#13283F', primario: '#1D4E89', acento: '#F2B33D' },
      logoVersion: 123,
    });
    render(
      <InstitucionProvider>
        <Muestra />
      </InstitucionProvider>,
    );
    expect(
      await screen.findByText(/Unidad Educativa Juana Azurduy · JA · .*\/institucion\/logo\?v=123/),
    ).toBeInTheDocument();
  });

  it('debe seguir con la apariencia predeterminada si la API no responde', async () => {
    const llamada = vi.spyOn(api, 'obtenerInstitucion').mockRejectedValue(new Error('sin red'));
    render(
      <InstitucionProvider>
        <Muestra />
      </InstitucionProvider>,
    );
    await waitFor(() => expect(llamada).toHaveBeenCalled());
    expect(screen.getByText('sin nombre · UE · sin logo')).toBeInTheDocument();
  });
});
