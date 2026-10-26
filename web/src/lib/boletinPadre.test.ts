import { describe, expect, it } from 'vitest';
import type { BoletinPadreDetalle, MateriaBoletinPadre } from './api';
import {
  calcularResumenBoletin,
  determinarAprobacionMateria,
  determinarEstadoAnual,
  puedeDescargarBoletin,
} from './boletinPadre';

const MATERIAS_PRUEBA: MateriaBoletinPadre[] = [
  {
    materiaId: 1,
    nombre: 'Matemática',
    profesorNombre: 'Rosa Mamani Condori',
    notaT1: 85,
    notaT2: 78,
    notaT3: 90,
    promedioFinal: 84,
    estado: 'APROBADO',
  },
  {
    materiaId: 2,
    nombre: 'Comunicación y Lenguajes',
    profesorNombre: 'Carlos Lujan',
    notaT1: 90,
    notaT2: 88,
    notaT3: 85,
    promedioFinal: 88,
    estado: 'APROBADO',
  },
  {
    materiaId: 3,
    nombre: 'Física',
    profesorNombre: 'Carlos Lujan',
    notaT1: 45,
    notaT2: 50,
    notaT3: 48,
    promedioFinal: 48,
    estado: 'REPROBADO',
  },
  {
    materiaId: 4,
    nombre: 'Educación Física',
    notaT1: 95,
    notaT2: null,
    notaT3: null,
    promedioFinal: null,
    estado: 'EN_CURSO',
  },
];

describe('Lógica del Boletín para el Padre de Familia (US-11)', () => {
  describe('determinarAprobacionMateria', () => {
    it('debe marcar EN_CURSO si la materia no tiene nota final', () => {
      expect(determinarAprobacionMateria(null)).toBe('EN_CURSO');
    });

    it('debe marcar APROBADO si la nota es mayor o igual a 51 (RM 001/2026)', () => {
      expect(determinarAprobacionMateria(51)).toBe('APROBADO');
      expect(determinarAprobacionMateria(85)).toBe('APROBADO');
    });

    it('debe marcar REPROBADO si la nota es menor a 51', () => {
      expect(determinarAprobacionMateria(50)).toBe('REPROBADO');
      expect(determinarAprobacionMateria(30)).toBe('REPROBADO');
    });
  });

  describe('determinarEstadoAnual', () => {
    it('debe devolver EN_CURSO si el promedio anual no está calculado', () => {
      expect(determinarEstadoAnual(null, 95.0)).toBe('EN_CURSO');
    });

    it('debe promover al estudiante si tiene promedio >= 51 y asistencia >= 80%', () => {
      expect(determinarEstadoAnual(75, 92.0)).toBe('PROMOVIDO');
      expect(determinarEstadoAnual(51, 80.0)).toBe('PROMOVIDO');
    });

    it('debe retener al estudiante si su promedio es menor a 51', () => {
      expect(determinarEstadoAnual(49, 95.0)).toBe('RETENIDO');
    });

    it('debe retener al estudiante si su asistencia es inferior al 80% (Decisión D6)', () => {
      expect(determinarEstadoAnual(85, 78.5)).toBe('RETENIDO');
    });
  });

  describe('puedeDescargarBoletin (US-11, Criterios 1 y 2)', () => {
    it('debe permitir la descarga solo cuando el boletín está publicado oficialmente (CA 1)', () => {
      const boletinPublicado: BoletinPadreDetalle = {
        estudiante: {
          id: 15,
          nombres: 'Alejandro',
          apellidos: 'Pérez Condori',
          codigoRude: '90000000015',
          curso: { id: 1, nombre: 'Secundaria 3.º «A»' },
        },
        publicado: true,
        estadoPeriodo: 'PUBLICADO',
        promedioAnual: 82.4,
        porcentajeAsistencia: 96.0,
        estadoAnual: 'PROMOVIDO',
        materias: MATERIAS_PRUEBA,
      };

      expect(puedeDescargarBoletin(boletinPublicado)).toBe(true);
    });

    it('no debe permitir la descarga si el boletín no está publicado o está en elaboración (CA 2)', () => {
      const boletinEnBorrador: BoletinPadreDetalle = {
        estudiante: {
          id: 15,
          nombres: 'Alejandro',
          apellidos: 'Pérez Condori',
          codigoRude: '90000000015',
          curso: { id: 1, nombre: 'Secundaria 3.º «A»' },
        },
        publicado: false,
        estadoPeriodo: 'EN_ELABORACION',
        promedioAnual: null,
        porcentajeAsistencia: 90.0,
        estadoAnual: 'EN_CURSO',
        materias: [],
      };

      expect(puedeDescargarBoletin(boletinEnBorrador)).toBe(false);
      expect(puedeDescargarBoletin(null)).toBe(false);
    });
  });

  describe('calcularResumenBoletin', () => {
    it('debe calcular las estadísticas de materias aprobadas, reprobadas y promedio general', () => {
      const resumen = calcularResumenBoletin(MATERIAS_PRUEBA, 90.0);
      expect(resumen.totalMaterias).toBe(4);
      expect(resumen.materiasConNota).toBe(3);
      expect(resumen.aprobadas).toBe(2);
      expect(resumen.reprobadas).toBe(1);
      // Promedio de 84, 88, 48 = 220 / 3 = 73.3
      expect(resumen.promedioGeneral).toBe(73.3);
      expect(resumen.estadoGeneral).toBe('PROMOVIDO');
    });
  });
});
