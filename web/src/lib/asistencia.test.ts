import { describe, expect, it } from 'vitest';
import {
  calcularPorcentajeAsistencia,
  esFechaFutura,
  formatoPorcentaje,
  hoyEnBolivia,
  nivelAsistencia,
} from './asistencia';

describe('Reglas de asistencia (US-19)', () => {
  describe('calcularPorcentajeAsistencia (criterio 2, decisión D5)', () => {
    it('debe contar presentes y licencias sobre el total de clases dictadas', () => {
      // 8 presentes + 1 licencia sobre 10 clases = 90.0 %
      expect(calcularPorcentajeAsistencia({ presentes: 8, licencias: 1, ausentes: 1 })).toBe(90.0);
    });

    it('debe redondear a un solo decimal', () => {
      // 2 presentes sobre 3 clases = 66.666... -> 66.7 %
      expect(calcularPorcentajeAsistencia({ presentes: 2, licencias: 0, ausentes: 1 })).toBe(66.7);
    });

    it('debe devolver 100 si nunca faltó y 0 si faltó a todas', () => {
      expect(calcularPorcentajeAsistencia({ presentes: 15, licencias: 0, ausentes: 0 })).toBe(
        100.0,
      );
      expect(calcularPorcentajeAsistencia({ presentes: 0, licencias: 0, ausentes: 10 })).toBe(0.0);
    });

    it('debe devolver null si todavía no hay clases registradas (clases === 0)', () => {
      expect(calcularPorcentajeAsistencia({ presentes: 0, licencias: 0, ausentes: 0 })).toBeNull();
    });
  });

  describe('Control de fechas (criterio 3)', () => {
    const ahora = new Date('2026-04-15T14:30:00-04:00'); // Hora de Bolivia

    it('debe obtener la fecha de hoy en formato AAAA-MM-DD para la zona de Bolivia', () => {
      expect(hoyEnBolivia(ahora)).toBe('2026-04-15');
    });

    it('debe detectar correctamente si una fecha es futura respecto a hoy en Bolivia', () => {
      expect(esFechaFutura('2026-04-16', ahora)).toBe(true);
      expect(esFechaFutura('2026-04-15', ahora)).toBe(false);
      expect(esFechaFutura('2026-04-14', ahora)).toBe(false);
    });
  });

  describe('Formateo y niveles de riesgo', () => {
    it('debe formatear con coma decimal y símbolo de porcentaje', () => {
      expect(formatoPorcentaje(85.5)).toBe('85,5 %');
      expect(formatoPorcentaje(null)).toBe('—');
    });

    it('debe categorizar el nivel de asistencia según umbral ministerial (80 %)', () => {
      expect(nivelAsistencia(95.0)).toBe('optimo');
      expect(nivelAsistencia(80.0)).toBe('optimo');
      expect(nivelAsistencia(75.0)).toBe('advertencia');
      expect(nivelAsistencia(65.0)).toBe('riesgo');
      expect(nivelAsistencia(null)).toBe('sin-datos');
    });
  });
});
