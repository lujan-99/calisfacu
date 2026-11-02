import { describe, expect, it } from 'vitest';
import type { EntregaMateria, Estudiante, Materia } from './api';
import {
  construirFilasCentralizador,
  evaluarEntregasCurso,
  exportarCentralizadorCsv,
  filtrarFilasCentralizador,
  redondearNotaMinisterial,
  type CentralizadorCursoData,
  type MateriaCentralizador,
} from './centralizador';

describe('Lógica de Centralización de Notas (US-09, RM 001/2026)', () => {
  const materiasMock: Materia[] = [
    {
      id: 101,
      nombre: 'Matemática',
      curso: { id: 1, nombre: 'Secundaria 4.º «A»' },
      gestion: { id: 1, anio: 2026 },
      profesor: { id: 10, nombre: 'Carlos Quispe' },
    },
    {
      id: 102,
      nombre: 'Lenguaje y Comunicación',
      curso: { id: 1, nombre: 'Secundaria 4.º «A»' },
      gestion: { id: 1, anio: 2026 },
      profesor: { id: 11, nombre: 'Ana Flores' },
    },
    {
      id: 103,
      nombre: 'Ciencias Naturales: Física',
      curso: { id: 1, nombre: 'Secundaria 4.º «A»' },
      gestion: { id: 1, anio: 2026 },
      profesor: { id: 12, nombre: 'Roberto Gómez' },
    },
  ];

  const estudiantesMock: Estudiante[] = [
    {
      id: 1,
      codigoRude: '80980001',
      ci: '10203040',
      apellidos: 'Mamani Ramos',
      nombres: 'Alejandro',
      curso: { id: 1, nombre: 'Secundaria 4.º «A»' },
      gestion: { id: 1, anio: 2026 },
    },
    {
      id: 2,
      codigoRude: '80980002',
      ci: null,
      apellidos: 'Condori Rojas',
      nombres: 'Beatriz',
      curso: { id: 1, nombre: 'Secundaria 4.º «A»' },
      gestion: { id: 1, anio: 2026 },
    },
    {
      id: 3,
      codigoRude: '80980003',
      ci: '77889900',
      apellidos: 'Zeballos Quispe',
      nombres: 'Carlos',
      curso: { id: 1, nombre: 'Secundaria 4.º «A»' },
      gestion: { id: 1, anio: 2026 },
    },
  ];

  const materiasCentralizador: MateriaCentralizador[] = materiasMock.map((m) => ({
    id: m.id,
    nombre: m.nombre,
    profesor: m.profesor?.nombre,
  }));

  const crearEntrega = (
    materiaId: number,
    materia: string,
    profesor: string,
    estado: 'ENTREGADO' | 'PENDIENTE',
    notasFaltantes = 0,
  ): EntregaMateria => ({
    materiaId,
    materia,
    cursoId: 1,
    curso: 'Secundaria 4.º «A»',
    profesorId: 10,
    profesor,
    trimestreId: 1,
    trimestreNumero: 1,
    estado,
    totalActividades: 4,
    totalEstudiantes: 30,
    totalNotasRegistradas: estado === 'ENTREGADO' ? 30 : 25,
    totalNotasRequeridas: 30,
    notasFaltantes,
  });

  describe('evaluarEntregasCurso (US-09 CA 1 y CA 3)', () => {
    it('debe indicar que todas están entregadas cuando todas las materias del curso tienen estado ENTREGADO (CA 1)', () => {
      const entregas: EntregaMateria[] = [
        crearEntrega(101, 'Matemática', 'Carlos Quispe', 'ENTREGADO'),
        crearEntrega(102, 'Lenguaje y Comunicación', 'Ana Flores', 'ENTREGADO'),
        crearEntrega(103, 'Ciencias Naturales: Física', 'Roberto Gómez', 'ENTREGADO'),
      ];

      const resultado = evaluarEntregasCurso(materiasMock, entregas);
      expect(resultado.todasEntregadas).toBe(true);
      expect(resultado.materiasPendientes).toHaveLength(0);
      expect(resultado.materiasEntregadas).toBe(3);
      expect(resultado.totalMaterias).toBe(3);
    });

    it('debe listar materias pendientes y no permitir cerrar cuando falta una o más entregas (CA 3)', () => {
      const entregas: EntregaMateria[] = [
        crearEntrega(101, 'Matemática', 'Carlos Quispe', 'ENTREGADO'),
        crearEntrega(102, 'Lenguaje y Comunicación', 'Ana Flores', 'PENDIENTE', 5),
      ];

      const resultado = evaluarEntregasCurso(materiasMock, entregas);
      expect(resultado.todasEntregadas).toBe(false);
      expect(resultado.materiasPendientes).toHaveLength(2); // Lenguaje (pendiente) + Física (sin entrega registrada)
      expect(resultado.materiasPendientes[0]).toMatchObject({
        materiaId: 102,
        materia: 'Lenguaje y Comunicación',
        notasFaltantes: 5,
      });
      expect(resultado.materiasPendientes[1]).toMatchObject({
        materiaId: 103,
        materia: 'Ciencias Naturales: Física',
      });
    });

    it('debe retornar false si el curso no tiene materias asignadas', () => {
      const resultado = evaluarEntregasCurso([], []);
      expect(resultado.todasEntregadas).toBe(false);
      expect(resultado.totalMaterias).toBe(0);
    });
  });

  describe('redondearNotaMinisterial (Regla D2: ROUND_HALF_UP)', () => {
    it('debe redondear al entero superior cuando el decimal es >= 0.5', () => {
      expect(redondearNotaMinisterial(50.5)).toBe(51);
      expect(redondearNotaMinisterial(75.5)).toBe(76);
      expect(redondearNotaMinisterial(50.8)).toBe(51);
    });

    it('debe redondear al entero inferior cuando el decimal es < 0.5', () => {
      expect(redondearNotaMinisterial(50.49)).toBe(50);
      expect(redondearNotaMinisterial(75.4)).toBe(75);
    });
  });

  describe('construirFilasCentralizador (CA 1 y consolidación)', () => {
    it('debe consolidar notas, calcular promedio y clasificar APROBADO / REPROBADO correctamente', () => {
      const notas: Record<number, Record<number, number | null>> = {
        1: { 101: 70, 102: 80, 103: 90 }, // Promedio = 80 -> APROBADO
        2: { 101: 45, 102: 50, 103: 52 }, // Promedio = 49 (49) -> REPROBADO
        3: { 101: 51, 102: 51, 103: 51 }, // Promedio = 51 -> APROBADO
      };

      const { filas, resumen } = construirFilasCentralizador(
        estudiantesMock,
        materiasCentralizador,
        notas,
      );

      expect(filas).toHaveLength(3);

      // Estudiante 1
      expect(filas[0].estudiante).toBe('Mamani Ramos, Alejandro');
      expect(filas[0].notas[101]).toBe(70);
      expect(filas[0].notas[102]).toBe(80);
      expect(filas[0].notas[103]).toBe(90);
      expect(filas[0].promedioTrimestral).toBe(80);
      expect(filas[0].observacion).toBe('APROBADO');

      // Estudiante 2
      expect(filas[1].promedioTrimestral).toBe(49);
      expect(filas[1].observacion).toBe('REPROBADO');

      // Estudiante 3
      expect(filas[2].promedioTrimestral).toBe(51);
      expect(filas[2].observacion).toBe('APROBADO');

      // Resumen general
      expect(resumen.totalEstudiantes).toBe(3);
      expect(resumen.aprobados).toBe(2);
      expect(resumen.reprobados).toBe(1);
      expect(resumen.pendientes).toBe(0);
      expect(resumen.promedioGeneral).toBe(60); // (80 + 49 + 51) / 3 = 60.0
      expect(resumen.tasaAprobacion).toBe(66.7); // 2 / 3 * 100
    });

    it('debe marcar PENDIENTE cuando faltan notas de alguna materia', () => {
      const notasIncompletas: Record<number, Record<number, number | null>> = {
        1: { 101: 70, 102: null, 103: null },
      };

      const { filas, resumen } = construirFilasCentralizador(
        [estudiantesMock[0]],
        materiasCentralizador,
        notasIncompletas,
      );

      expect(filas[0].notas[102]).toBeNull();
      expect(resumen.pendientes).toBe(1);
    });
  });

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
        unidadEducativa: {
          nombre: 'Colegio Simón Bolívar',
          codigoSie: '80980123',
        },
        todasEntregadas: true,
        materiasPendientes: [],
        materias: materiasCentralizador,
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
