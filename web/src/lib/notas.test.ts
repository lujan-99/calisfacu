import { describe, expect, it } from 'vitest';
import { estadoAprobacion, validarNota } from './notas';

describe('validarNota', () => {
  it('debe aceptar una nota dentro de la escala de 1 a 100', () => {
    expect(validarNota('75')).toEqual({ valida: true, valor: 75 });
  });

  it('debe aceptar coma decimal', () => {
    expect(validarNota('50,5')).toEqual({ valida: true, valor: 50.5 });
  });

  it.each(['0', '101', '-3'])('debe rechazar %s por estar fuera de la escala', (entrada) => {
    expect(validarNota(entrada).valida).toBe(false);
  });

  it('debe rechazar texto vacío o no numérico', () => {
    expect(validarNota('  ')).toEqual({ valida: false, error: 'Ingrese una nota' });
    expect(validarNota('abc').valida).toBe(false);
  });

  it('debe rechazar más de dos decimales', () => {
    expect(validarNota('70.123').valida).toBe(false);
  });
});

describe('estadoAprobacion', () => {
  it('debe aprobar con 51 y reprobar con 50', () => {
    expect(estadoAprobacion(51)).toBe('Aprueba');
    expect(estadoAprobacion(50)).toBe('Reprueba');
  });
});
