import { accionAlerta } from './reglas-alertas';

/** US-08 (T-060): la alerta de promedio bajo no se repite (decisión D22). */
describe('accionAlerta (US-08)', () => {
  it('debe crear la alerta cuando la nota cae por debajo de 51 (criterio 1)', () => {
    expect(accionAlerta(50, false)).toBe('CREAR');
  });

  it('debe no repetir la alerta mientras la nota sigue por debajo de 51 (criterio 2)', () => {
    expect(accionAlerta(30, true)).toBe('NINGUNA');
  });

  it('debe superar la alerta vigente cuando la nota vuelve al mínimo', () => {
    expect(accionAlerta(51, true)).toBe('SUPERAR');
  });

  it('debe no hacer nada con nota aprobatoria sin alerta o sin nota trimestral', () => {
    expect(accionAlerta(51, false)).toBe('NINGUNA');
    expect(accionAlerta(null, false)).toBe('NINGUNA');
    expect(accionAlerta(null, true)).toBe('NINGUNA');
  });
});
