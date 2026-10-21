import { BadRequestException } from '@nestjs/common';
import Decimal from 'decimal.js';
import { CalculoService } from './calculo.service';
import { DIMENSIONES_RM_001_2026 } from './reglas';

// Pruebas escritas antes del código (TDD obligatorio en módulos críticos, SQAP Sección 9).
describe('CalculoService', () => {
  const calculo = new CalculoService();
  const dims = DIMENSIONES_RM_001_2026;

  describe('validarDimensiones (US-18, criterio 6)', () => {
    it('debe aceptar los puntajes de la RM 001/2026, que suman 100', () => {
      expect(() => calculo.validarDimensiones(dims)).not.toThrow();
    });

    it('debe indicar cuántos puntos faltan si no suman 100', () => {
      expect(() =>
        calculo.validarDimensiones([
          { codigo: 'SER', puntajeMaximo: 10 },
          { codigo: 'SABER', puntajeMaximo: 45 },
        ]),
      ).toThrow('Las dimensiones suman 55; faltan 45 puntos');
    });

    it('debe indicar cuántos puntos sobran', () => {
      expect(() =>
        calculo.validarDimensiones([
          { codigo: 'SER', puntajeMaximo: 60 },
          { codigo: 'SABER', puntajeMaximo: 45 },
        ]),
      ).toThrow('sobran 5 puntos');
    });

    it('debe rechazar una lista vacía, códigos repetidos y puntajes no positivos', () => {
      expect(() => calculo.validarDimensiones([])).toThrow(BadRequestException);
      expect(() =>
        calculo.validarDimensiones([
          { codigo: 'SER', puntajeMaximo: 50 },
          { codigo: 'SER', puntajeMaximo: 50 },
        ]),
      ).toThrow('Hay dimensiones repetidas');
      expect(() =>
        calculo.validarDimensiones([
          { codigo: 'SER', puntajeMaximo: 0 },
          { codigo: 'SABER', puntajeMaximo: 100 },
        ]),
      ).toThrow('puntaje entero mayor que 0');
    });
  });

  describe('puntosDimension (US-02, criterio 1)', () => {
    it('debe calcular Saber con promedio 80 como 36 puntos', () => {
      expect(calculo.puntosDimension(new Decimal(80), 45).toNumber()).toBe(36);
    });
  });

  describe('promedio', () => {
    it('debe promediar sin errores de coma flotante', () => {
      expect(calculo.promedio([0.1, 0.2])?.toString()).toBe('0.15');
    });

    it('debe devolver null si no hay notas', () => {
      expect(calculo.promedio([])).toBeNull();
    });
  });

  describe('redondear y aprobar (US-02, criterio 3)', () => {
    it('debe redondear 50,5 a 51 y aprobar', () => {
      const nota = calculo.redondear(new Decimal('50.5'));
      expect(nota).toBe(51);
      expect(calculo.aprobado(nota)).toBe(true);
    });

    it('debe redondear 50,4 a 50 y reprobar', () => {
      const nota = calculo.redondear(new Decimal('50.4'));
      expect(nota).toBe(50);
      expect(calculo.aprobado(nota)).toBe(false);
    });
  });

  describe('notaTrimestral (US-02, criterio 2)', () => {
    it('debe sumar los puntos de las cuatro dimensiones', () => {
      const r = calculo.notaTrimestral(dims, {
        SER: [80],
        SABER: [70, 90],
        HACER: [80],
        AUTOEVALUACION: [100],
      });
      // 8 + 36 + 32 + 5 = 81
      expect(r.nota).toBe(81);
      expect(r.aprobado).toBe(true);
      expect(r.pendientes).toEqual([]);
      expect(r.dimensiones.map((d) => d.puntos)).toEqual([8, 36, 32, 5]);
    });

    it('debe dejar la nota pendiente si una dimensión no tiene actividades (US-02, criterio 6, regla provisional)', () => {
      const r = calculo.notaTrimestral(dims, { SER: [80], SABER: [70], HACER: [80] });
      expect(r.nota).toBeNull();
      expect(r.aprobado).toBeNull();
      expect(r.pendientes).toEqual(['AUTOEVALUACION']);
    });

    it('debe rechazar dimensiones mal configuradas', () => {
      expect(() => calculo.notaTrimestral([{ codigo: 'SER', puntajeMaximo: 10 }], {})).toThrow(
        BadRequestException,
      );
    });
  });

  describe('notaAnual (US-02, criterio 4, regla provisional)', () => {
    it('debe promediar los tres trimestres y redondear', () => {
      expect(calculo.notaAnual([50, 51, 51])).toBe(51);
      expect(calculo.notaAnual([50, 50, 51])).toBe(50);
    });

    it('debe rechazar si no hay trimestres', () => {
      expect(() => calculo.notaAnual([])).toThrow(BadRequestException);
    });
  });

  describe('promedioDeMaterias (US-03, decisión D12)', () => {
    it('debe promediar las notas de las materias con dos decimales, 0,5 hacia arriba', () => {
      expect(calculo.promedioDeMaterias([80, 71])).toBe(75.5);
      expect(calculo.promedioDeMaterias([70, 70, 71])).toBe(70.33);
      expect(calculo.promedioDeMaterias([1, 2, 2])).toBe(1.67);
    });

    it('debe quedar pendiente si alguna materia no tiene nota o no hay materias', () => {
      expect(calculo.promedioDeMaterias([80, null])).toBeNull();
      expect(calculo.promedioDeMaterias([])).toBeNull();
    });
  });

  describe('resumenAnual (US-03, decisión D12)', () => {
    it('debe promediar los trimestres con nota e ignorar los pendientes', () => {
      expect(calculo.resumenAnual([60, 70, null]).promedioAnual).toBe(65);
      expect(calculo.resumenAnual([null, null, null]).promedioAnual).toBeNull();
    });

    it('debe comparar los dos últimos trimestres con nota para la tendencia', () => {
      expect(calculo.resumenAnual([60, 70, null]).tendencia).toBe('ASCENDENTE');
      expect(calculo.resumenAnual([80, null, 70]).tendencia).toBe('DESCENDENTE');
      expect(calculo.resumenAnual([50, 70, 70]).tendencia).toBe('ESTABLE');
      expect(calculo.resumenAnual([70, null, null]).tendencia).toBe('PENDIENTE');
    });

    it('debe marcar en riesgo un promedio anual menor que la nota mínima de aprobación', () => {
      expect(calculo.resumenAnual([51, null, null]).estadoAnual).toBe('PROMOVIDO');
      expect(calculo.resumenAnual([50.99, null, null]).estadoAnual).toBe('EN_RIESGO');
      expect(calculo.resumenAnual([null, null, null]).estadoAnual).toBe('PENDIENTE');
    });
  });
});
