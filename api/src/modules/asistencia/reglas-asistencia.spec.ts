import { esFechaFutura, hoyEnBolivia, porcentajeAsistencia } from './reglas-asistencia';

describe('Reglas de asistencia (US-19)', () => {
  describe('porcentajeAsistencia (criterio 2, decisión D5)', () => {
    it('debe contar presentes y licencias sobre las clases dictadas', () => {
      expect(porcentajeAsistencia({ presentes: 7, licencias: 1, ausentes: 2 })).toBe(80);
    });

    it('debe redondear a un decimal, 0,05 hacia arriba', () => {
      expect(porcentajeAsistencia({ presentes: 2, licencias: 0, ausentes: 1 })).toBe(66.7);
      expect(porcentajeAsistencia({ presentes: 1, licencias: 0, ausentes: 2 })).toBe(33.3);
      // 1/8 = 12,5 % exacto; 81/160 = 50,625 % → 50,6
      expect(porcentajeAsistencia({ presentes: 1, licencias: 0, ausentes: 7 })).toBe(12.5);
      expect(porcentajeAsistencia({ presentes: 81, licencias: 0, ausentes: 79 })).toBe(50.6);
    });

    it('debe devolver 100 si nunca faltó y 0 si faltó a todas', () => {
      expect(porcentajeAsistencia({ presentes: 3, licencias: 2, ausentes: 0 })).toBe(100);
      expect(porcentajeAsistencia({ presentes: 0, licencias: 0, ausentes: 4 })).toBe(0);
    });

    it('debe devolver null si todavía no hay clases registradas', () => {
      expect(porcentajeAsistencia({ presentes: 0, licencias: 0, ausentes: 0 })).toBeNull();
    });
  });

  describe('fechas (criterio 3)', () => {
    it('debe tomar la fecha de hoy en Bolivia (UTC-4), no la del servidor', () => {
      // 13/10 a las 23:30 en Bolivia ya es 14/10 en UTC
      expect(hoyEnBolivia(new Date('2026-10-14T03:30:00Z'))).toBe('2026-10-13');
      expect(hoyEnBolivia(new Date('2026-10-14T04:30:00Z'))).toBe('2026-10-14');
    });

    it('debe considerar futura solo una fecha posterior a hoy en Bolivia', () => {
      const ahora = new Date('2026-10-14T03:30:00Z'); // 13/10 en Bolivia
      expect(esFechaFutura('2026-10-14', ahora)).toBe(true);
      expect(esFechaFutura('2026-10-13', ahora)).toBe(false);
      expect(esFechaFutura('2026-03-02', ahora)).toBe(false);
    });
  });
});
