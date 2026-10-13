import casos from '../../../test/fixtures/casos-calculo.json';
import { CalculoService } from './calculo.service';
import { DIMENSIONES_RM_001_2026 } from './reglas';

/**
 * M01: el 100 % de los casos de la tabla firmada por el cliente da el resultado esperado.
 * La tabla vive en test/fixtures/casos-calculo.json (semilla: docs/backlog/reglas-ministerio.md).
 * Al firmarla el cliente, se agregan sus casos aquí sin tocar el código de la prueba.
 */
describe('Tabla de casos de cálculo firmada por el cliente (M01, R02)', () => {
  const calculo = new CalculoService();

  it.each(casos)('$caso', ({ promedios, sinRedondear, nota, resultado }) => {
    const r = calculo.notaTrimestral(DIMENSIONES_RM_001_2026, {
      SER: [promedios.SER],
      SABER: [promedios.SABER],
      HACER: [promedios.HACER],
      AUTOEVALUACION: [promedios.AUTOEVALUACION],
    });
    expect(r.sinRedondear).toBeCloseTo(sinRedondear, 4);
    expect(r.nota).toBe(nota);
    expect(r.aprobado ? 'Aprueba' : 'Reprueba').toBe(resultado);
  });
});
