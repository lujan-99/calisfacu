import { describe, expect, it } from 'vitest';
import {
  exportarCentralizadorCsv,
  filtrarFilasCentralizador,
  type CentralizadorCursoData,
} from './centralizador';

describe('Lógica de Centralización de Notas (US-09, RM 001/2026)', () => {
  describe('filtrarFilasCentralizador', () => {
    const filasBase = [
      {
        numero: 1,
        estudianteId: 1,
        codigoRude: '80980001',
        ci: '10203040',
        apellidos: 'Mamani Ramos',
        nombres: 'Alejandro',
        estudiante: 'Mamani Ramos, Alejandro',
        notas: {},
        promedioTrimestral: 80,
        observacion: 'APROBADO' as const,
      },
      {
        numero: 2,
        estudianteId: 2,
        codigoRude: '80980002',
        ci: null,
        apellidos: 'Condori Rojas',
        nombres: 'Beatriz',
        estudiante: 'Condori Rojas, Beatriz',
        notas: {},
        promedioTrimestral: 45,
        observacion: 'REPROBADO' as const,
      },
    ];

    it('debe filtrar por coincidencia de nombre o apellido', () => {
      const filtrados = filtrarFilasCentralizador(filasBase, 'mamani', 'TODOS');
      expect(filtrados).toHaveLength(1);
      expect(filtrados[0].estudiante).toContain('Mamani');
    });

    it('debe filtrar por coincidencia de RUDE o CI', () => {
      const filtradosRude = filtrarFilasCentralizador(filasBase, '80980002', 'TODOS');
      expect(filtradosRude).toHaveLength(1);
      expect(filtradosRude[0].codigoRude).toBe('80980002');

      const filtradosCi = filtrarFilasCentralizador(filasBase, '10203040', 'TODOS');
      expect(filtradosCi).toHaveLength(1);
      expect(filtradosCi[0].ci).toBe('10203040');
    });

    it('debe filtrar por estado (APROBADO / REPROBADO)', () => {
      const aprobados = filtrarFilasCentralizador(filasBase, '', 'APROBADO');
      expect(aprobados).toHaveLength(1);
      expect(aprobados[0].observacion).toBe('APROBADO');

      const reprobados = filtrarFilasCentralizador(filasBase, '', 'REPROBADO');
      expect(reprobados).toHaveLength(1);
      expect(reprobados[0].observacion).toBe('REPROBADO');
    });
  });

  describe('exportarCentralizadorCsv (US-09 CA 2 formato oficial)', () => {
    it('debe incluir encabezado oficial, materias, filas de estudiantes y espacios para firmas reglamentarias', () => {
      const mockData: CentralizadorCursoData = {
        curso: {
          id: 1,
          nombre: 'Secundaria 4.º «A»',
          nivel: 'SECUNDARIA',
          anioEscolaridad: 4,
          paralelo: 'A',
        },
        gestion: { id: 1, anio: 2026 },
        trimestre: { id: 1, numero: 1, cerrado: false },
        centralizado: true,
        fechaCentralizacion: '2026-11-03T15:00:00.000Z',
        unidadEducativa: {
          nombre: 'Colegio Simón Bolívar',
          codigoSie: '80980123',
        },
        todasEntregadas: true,
        materiasPendientes: [],
        materias: [
          { id: 101, nombre: 'Matemática', profesor: 'Carlos Quispe' },
          { id: 102, nombre: 'Lenguaje y Comunicación', profesor: 'Ana Flores' },
          { id: 103, nombre: 'Ciencias Naturales: Física', profesor: 'Roberto Gómez' },
        ],
        filas: [
          {
            numero: 1,
            estudianteId: 1,
            codigoRude: '80980001',
            ci: '10203040',
            apellidos: 'Mamani Ramos',
            nombres: 'Alejandro',
            estudiante: 'Mamani Ramos, Alejandro',
            notas: { 101: 85, 102: 90, 103: 88 },
            promedioTrimestral: 88,
            observacion: 'APROBADO',
          },
        ],
        resumen: {
          totalEstudiantes: 1,
          promedioGeneral: 88,
          aprobados: 1,
          reprobados: 0,
          pendientes: 0,
          tasaAprobacion: 100,
        },
      };

      const csv = exportarCentralizadorCsv(mockData);

      // Verificación de encabezados oficiales (CA 2)
      expect(csv).toContain('CENTRALIZADOR OFICIAL DE CALIFICACIONES');
      expect(csv).toContain('Colegio Simón Bolívar');
      expect(csv).toContain('80980123');
      expect(csv).toContain('Secundaria 4.º «A»');
      expect(csv).toContain('1.º Trimestre');
      expect(csv).toContain('2026');

      // Verificación de columnas de materias
      expect(csv).toContain('Matemática');
      expect(csv).toContain('Lenguaje y Comunicación');
      expect(csv).toContain('Ciencias Naturales: Física');

      // Verificación de datos del estudiante y notas
      expect(csv).toContain('Mamani Ramos, Alejandro');
      expect(csv).toContain('80980001');
      expect(csv).toContain('10203040');
      expect(csv).toContain('85,90,88,88,"APROBADO"');

      // Verificación de firmas reglamentarias (Director y Maestro)
      expect(csv).toContain('Firma del Director(a)');
      expect(csv).toContain('Firma del Maestro(a)');
      expect(csv).toContain('Sello Institucional');
    });
  });
});
