import { evaluarRiesgo, resumenRiesgo } from './riesgo';

// US-06, criterio 2 (decisión D6): en riesgo si el promedio es menor que 51 o la asistencia menor que el umbral.
describe('evaluarRiesgo (US-06, criterio 2)', () => {
  it('debe marcar en riesgo por promedio a quien tiene menos de 51', () => {
    expect(evaluarRiesgo(50, 95, 80)).toEqual({
      enRiesgo: true,
      motivoRiesgo: 'PROMEDIO',
      estado: 'EN_RIESGO',
    });
  });

  it('debe dejar como regular a quien tiene exactamente 51 y asistencia exactamente en el umbral', () => {
    expect(evaluarRiesgo(51, 80, 80)).toEqual({
      enRiesgo: false,
      motivoRiesgo: null,
      estado: 'REGULAR',
    });
  });

  it('debe marcar en riesgo por asistencia a quien tiene 79,9 % con el umbral de 80 %', () => {
    expect(evaluarRiesgo(90, 79.9, 80).motivoRiesgo).toBe('ASISTENCIA');
  });

  it('debe indicar los dos motivos cuando fallan el promedio y la asistencia', () => {
    expect(evaluarRiesgo(40, 50, 80).motivoRiesgo).toBe('AMBOS');
  });

  it('debe usar el umbral configurado en la gestión y no uno fijo', () => {
    expect(evaluarRiesgo(90, 85, 90).motivoRiesgo).toBe('ASISTENCIA');
    expect(evaluarRiesgo(90, 75, 70).enRiesgo).toBe(false);
  });

  it('debe evaluar solo la asistencia mientras la nota del trimestre está pendiente', () => {
    expect(evaluarRiesgo(null, 60, 80).motivoRiesgo).toBe('ASISTENCIA');
    expect(evaluarRiesgo(null, 95, 80).estado).toBe('REGULAR');
  });

  it('debe evaluar solo el promedio si aún no se tomó asistencia', () => {
    expect(evaluarRiesgo(30, null, 80).motivoRiesgo).toBe('PROMEDIO');
  });

  it('debe dejar pendiente a quien no tiene nota ni asistencia', () => {
    expect(evaluarRiesgo(null, null, 80)).toEqual({
      enRiesgo: false,
      motivoRiesgo: null,
      estado: 'PENDIENTE',
    });
  });
});

describe('resumenRiesgo (US-06)', () => {
  const fila = (promedio: number | null, porcentajeAsistencia: number | null) => ({
    promedio,
    porcentajeAsistencia,
    ...evaluarRiesgo(promedio, porcentajeAsistencia, 80),
  });

  it('debe contar a los estudiantes por motivo de riesgo y promediar con un decimal', () => {
    expect(
      resumenRiesgo([fila(40, 95), fila(90, 50), fila(30, 40), fila(70, 90), fila(null, null)]),
    ).toEqual({
      totalEstudiantes: 5,
      enRiesgoTotal: 3,
      enRiesgoPromedio: 1,
      enRiesgoAsistencia: 1,
      enRiesgoAmbos: 1,
      regulares: 1,
      pendientes: 1,
      promedioGeneral: 57.5,
      asistenciaGeneral: 68.8,
    });
  });

  it('debe dejar los promedios generales en null sin datos', () => {
    expect(resumenRiesgo([])).toMatchObject({
      totalEstudiantes: 0,
      promedioGeneral: null,
      asistenciaGeneral: null,
    });
  });
});
