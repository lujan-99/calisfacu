import { describe, expect, it } from 'vitest';
import type { PadreTutor, VinculoFamiliar } from './api';
import { calcularEstadisticasVinculos, filtrarVinculos, validarVinculo } from './vinculos';

const PADRES_PRUEBA: PadreTutor[] = [
  { id: 10, nombre: 'Juan Pérez Ramos', email: 'padre1@calisfacu.test', ci: '4567890' },
  { id: 11, nombre: 'Carmen Morales Soliz', email: 'carmen@correo.test', ci: '1234567' },
  { id: 12, nombre: 'Roberto Gómez Valdez', email: 'roberto@correo.test' },
];

const VINCULOS_PRUEBA: VinculoFamiliar[] = [
  {
    id: 1,
    padreId: 10,
    estudianteId: 101,
    parentesco: 'PADRE',
    padre: PADRES_PRUEBA[0],
    estudiante: {
      id: 101,
      nombres: 'Alejandro',
      apellidos: 'Pérez Condori',
      codigoRude: '90000000015',
      ci: '9988776',
      curso: { id: 1, nombre: 'Secundaria 3.º «A»', nivel: 'SECUNDARIA' },
    },
  },
  {
    id: 2,
    padreId: 11,
    estudianteId: 102,
    parentesco: 'MADRE',
    padre: PADRES_PRUEBA[1],
    estudiante: {
      id: 102,
      nombres: 'Mateo',
      apellidos: 'Morales Soliz',
      codigoRude: '90000000088',
      curso: { id: 2, nombre: 'Primaria 6.º «B»', nivel: 'PRIMARIA' },
    },
  },
];

describe('Lógica de Vinculación Padre-Estudiante (US-20)', () => {
  describe('validarVinculo', () => {
    it('debe validar exitosamente cuando los identificadores son válidos y no están duplicados', () => {
      const res = validarVinculo(12, 103, VINCULOS_PRUEBA);
      expect(res.valido).toBe(true);
      expect(res.error).toBeUndefined();
    });

    it('debe rechazar si falta seleccionar el padre o tutor', () => {
      const res = validarVinculo(0, 103, VINCULOS_PRUEBA);
      expect(res.valido).toBe(false);
      expect(res.error).toContain('padre de familia');
    });

    it('debe rechazar si falta seleccionar el estudiante', () => {
      const res = validarVinculo(10, 0, VINCULOS_PRUEBA);
      expect(res.valido).toBe(false);
      expect(res.error).toContain('estudiante');
    });

    it('debe rechazar si el vínculo ya existe para la misma dupla padre-estudiante', () => {
      const res = validarVinculo(10, 101, VINCULOS_PRUEBA);
      expect(res.valido).toBe(false);
      expect(res.error).toContain('ya se encuentra vinculado');
    });
  });

  describe('filtrarVinculos', () => {
    it('debe devolver todos los vínculos cuando no hay término de búsqueda ni filtro de curso', () => {
      const resultado = filtrarVinculos(VINCULOS_PRUEBA, '');
      expect(resultado).toHaveLength(2);
    });

    it('debe filtrar por curso correctamente', () => {
      const resultado = filtrarVinculos(VINCULOS_PRUEBA, '', 1);
      expect(resultado).toHaveLength(1);
      expect(resultado[0].estudiante?.nombres).toBe('Alejandro');
    });

    it('debe buscar por nombre o email del padre de familia', () => {
      const res1 = filtrarVinculos(VINCULOS_PRUEBA, 'carmen');
      expect(res1).toHaveLength(1);
      expect(res1[0].padre?.nombre).toBe('Carmen Morales Soliz');

      const res2 = filtrarVinculos(VINCULOS_PRUEBA, 'padre1@calisfacu');
      expect(res2).toHaveLength(1);
      expect(res2[0].padre?.email).toBe('padre1@calisfacu.test');
    });

    it('debe buscar por apellido o código RUDE del estudiante', () => {
      const res1 = filtrarVinculos(VINCULOS_PRUEBA, 'Pérez Condori');
      expect(res1).toHaveLength(1);
      expect(res1[0].estudiante?.apellidos).toBe('Pérez Condori');

      const res2 = filtrarVinculos(VINCULOS_PRUEBA, '90000000088');
      expect(res2).toHaveLength(1);
      expect(res2[0].estudiante?.nombres).toBe('Mateo');
    });
  });

  describe('calcularEstadisticasVinculos', () => {
    it('debe calcular las métricas de cobertura y tutores correctamente', () => {
      const estadisticas = calcularEstadisticasVinculos(VINCULOS_PRUEBA, 5, PADRES_PRUEBA);
      expect(estadisticas.totalVinculos).toBe(2);
      expect(estadisticas.totalPadres).toBe(3);
      expect(estadisticas.estudiantesConTutor).toBe(2);
      expect(estadisticas.estudiantesSinTutor).toBe(3);
      expect(estadisticas.porcentajeCobertura).toBe(40.0);
    });

    it('debe manejar adecuadamente cursos o unidades educativas sin estudiantes registrados', () => {
      const estadisticas = calcularEstadisticasVinculos([], 0, []);
      expect(estadisticas.totalVinculos).toBe(0);
      expect(estadisticas.estudiantesConTutor).toBe(0);
      expect(estadisticas.estudiantesSinTutor).toBe(0);
      expect(estadisticas.porcentajeCobertura).toBe(0);
    });
  });
});
