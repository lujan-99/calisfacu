import {
  materiasPendientes,
  observacion,
  observacionEstudiante,
  resumenPlanilla,
  textoPendientes,
  type MateriaCurso,
} from './planilla';

const materia = (m: Partial<MateriaCurso> & { id: number; nombre: string }): MateriaCurso => ({
  profesor: 'Ana Profesora',
  entregada: true,
  totalActividades: 4,
  totalNotasRegistradas: 12,
  ...m,
});

/** US-09 (T-057): reglas de la planilla consolidada (decisión D21). */
describe('Planilla de centralización (US-09)', () => {
  it('debe listar las materias pendientes de entrega con sus notas faltantes (criterio 3)', () => {
    const pendientes = materiasPendientes(
      [
        materia({ id: 1, nombre: 'Matemática' }),
        materia({
          id: 2,
          nombre: 'Lenguaje',
          profesor: 'Luis Profesor',
          entregada: false,
          totalNotasRegistradas: 10,
        }),
        materia({ id: 3, nombre: 'Física', profesor: null, entregada: false, totalActividades: 0 }),
      ],
      3,
    );
    expect(pendientes).toEqual([
      { materiaId: 2, materia: 'Lenguaje', profesor: 'Luis Profesor', notasFaltantes: 2 },
      { materiaId: 3, materia: 'Física', profesor: 'Sin asignar', notasFaltantes: 0 },
    ]);
    expect(textoPendientes(pendientes)).toBe('Lenguaje (Luis Profesor), Física (Sin asignar)');
  });

  it('debe no tener pendientes cuando todas las materias se entregaron', () => {
    expect(materiasPendientes([materia({ id: 1, nombre: 'Matemática' })], 3)).toEqual([]);
  });

  it('debe aprobar con 51 y reprobar con 50', () => {
    expect(observacion(51)).toBe('APROBADO');
    expect(observacion(50)).toBe('REPROBADO');
    expect(observacion(null)).toBe('PENDIENTE');
  });

  it('debe aprobar al estudiante solo si aprueba todas sus materias', () => {
    expect(observacionEstudiante([80, 51])).toBe('APROBADO');
    // El promedio (65) aprobaría, pero las notas oficiales son las de cada materia (D2).
    expect(observacionEstudiante([80, 50])).toBe('REPROBADO');
    expect(observacionEstudiante([80, null])).toBe('PENDIENTE');
    expect(observacionEstudiante([])).toBe('PENDIENTE');
  });

  it('debe resumir la planilla con indicadores de un decimal', () => {
    expect(
      resumenPlanilla([
        { promedioTrimestral: 70.25, observacion: 'APROBADO' },
        { promedioTrimestral: 45.5, observacion: 'REPROBADO' },
        { promedioTrimestral: 60, observacion: 'APROBADO' },
        { promedioTrimestral: null, observacion: 'PENDIENTE' },
      ]),
    ).toEqual({
      totalEstudiantes: 4,
      promedioGeneral: 58.6,
      aprobados: 2,
      reprobados: 1,
      pendientes: 1,
      tasaAprobacion: 66.7,
    });
    expect(resumenPlanilla([])).toMatchObject({ promedioGeneral: null, tasaAprobacion: null });
  });
});
