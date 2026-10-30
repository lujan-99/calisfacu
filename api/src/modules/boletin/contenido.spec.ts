import { contenidoBoletin, type DatosBoletin } from './contenido';

const datos: DatosBoletin = {
  unidadEducativa: { nombre: 'U. E. de prueba', codigoSie: '80000001' },
  gestion: { id: 1, anio: 2026 },
  estudiante: { id: 7, codigoRude: 'RUDE000001', ci: null, nombres: 'Ana', apellidos: 'Quispe' },
  curso: {
    id: 3,
    nombre: 'Secundaria 3.º «A»',
    nivel: 'SECUNDARIA',
    nivelNombre: 'Secundaria',
    anioEscolaridad: 3,
    paralelo: 'A',
  },
  trimestres: [
    { id: 1, numero: 1 },
    { id: 2, numero: 2 },
    { id: 3, numero: 3 },
  ],
  materias: [
    {
      materiaId: 1,
      nombre: 'Matemática',
      profesor: 'Ana Profesora',
      notas: [90, 80, 70],
      notaAnual: 80,
      aprobado: true,
      porcentajeAsistencia: 95.5,
    },
    {
      materiaId: 2,
      nombre: 'Lenguaje',
      profesor: null,
      notas: [60, null, null],
      notaAnual: null,
      aprobado: null,
      porcentajeAsistencia: null,
    },
  ],
  promediosTrimestrales: [75, null, null],
  promedioAnual: 75,
  estadoAnual: 'PROMOVIDO',
  porcentajeAsistencia: 95.5,
  clasesDictadas: 20,
  asistencias: 19,
};

describe('contenidoBoletin (US-07, criterio 1)', () => {
  const c = contenidoBoletin(datos, '29/10/2026');

  it('debe mostrar la unidad educativa, el código SIE y la gestión', () => {
    expect(c.encabezado).toEqual(['U. E. de prueba', 'Código SIE: 80000001', 'Gestión 2026']);
  });

  it('debe mostrar el nivel, el año de escolaridad y el paralelo del estudiante', () => {
    expect(c.datosEstudiante).toEqual(
      expect.arrayContaining([
        ['Estudiante', 'Quispe, Ana'],
        ['Nivel', 'Secundaria'],
        ['Año de escolaridad', '3.º'],
        ['Paralelo', 'A'],
      ]),
    );
  });

  it('debe mostrar por materia la nota de cada trimestre, la nota anual y la asistencia', () => {
    expect(c.columnas).toEqual([
      'Materia',
      '1.er trim.',
      '2.º trim.',
      '3.er trim.',
      'Nota anual',
      'Asistencia',
    ]);
    expect(c.filas[0]).toEqual(['Matemática', '90', '80', '70', '80', '95.5 %']);
  });

  it('debe mostrar con una raya lo que todavía está pendiente', () => {
    expect(c.filas[1]).toEqual(['Lenguaje', '60', '—', '—', '—', '—']);
    expect(c.datosEstudiante).toContainEqual(['CI', '—']);
  });

  it('debe resumir los promedios y la asistencia general al pie', () => {
    expect(c.pie.slice(0, 3)).toEqual([
      'Promedio por trimestre: 75 · — · —',
      'Promedio anual: 75',
      'Asistencia general: 95.5 %',
    ]);
  });
});
