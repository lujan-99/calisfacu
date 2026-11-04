import ExcelJS from 'exceljs';
import {
  generarExcelPlanilla,
  generarPdfPlanilla,
  hojasPlanilla,
  type DatosExportacion,
} from './exportacion';

const datos = (trimestre = 1): DatosExportacion => ({
  unidadEducativa: { nombre: 'U. E. de prueba', codigoSie: '80000001' },
  gestion: 2026,
  curso: {
    nombre: 'Secundaria 3.º «A»',
    nivelNombre: 'Secundaria',
    anioEscolaridad: 3,
    paralelo: 'A',
  },
  trimestre,
  totalTrimestres: 3,
  fechaCentralizacion: '2026-11-03T15:00:00.000Z',
  consolidada: {
    materias: ['Lenguaje', 'Matemática'],
    filas: [
      {
        numero: 1,
        estudiante: 'Condori, Eva',
        notas: [70, 45],
        promedio: 57.5,
        observacion: 'REPROBADO',
      },
      {
        numero: 2,
        estudiante: 'Quispe, Ana',
        notas: [80, 90],
        promedio: 85,
        observacion: 'APROBADO',
      },
    ],
    resumen: { aprobados: 1, reprobados: 1, pendientes: 0 },
  },
  materias: [
    {
      nombre: 'Matemática',
      profesor: 'Ana Profesora',
      filas: [
        {
          numero: 1,
          estudiante: 'Condori, Eva',
          notas: [45],
          notaAnual: null,
          observacion: 'REPROBADO',
        },
        {
          numero: 2,
          estudiante: 'Quispe, Ana',
          notas: [90],
          notaAnual: null,
          observacion: 'APROBADO',
        },
      ],
    },
    {
      nombre: 'Ciencias Sociales: Historia/Geografía [2]',
      profesor: 'Luis Profesor',
      filas: [],
    },
  ],
});

/** US-09, criterio 2 (T-058): la planilla oficial sigue el formato del Ministerio (decisión D21). */
describe('Exportación del centralizador (US-09)', () => {
  it('debe llevar el encabezado oficial en todas las hojas', () => {
    const hojas = hojasPlanilla(datos());
    expect(hojas.map((h) => h.nombre)).toEqual([
      'Centralizador',
      'Matemática',
      'Ciencias Sociales Historia G',
    ]);
    for (const h of hojas) {
      expect(h.encabezado.map(([etiqueta]) => etiqueta)).toEqual(
        expect.arrayContaining([
          'Unidad educativa',
          'Código SIE',
          'Nivel',
          'Año de escolaridad',
          'Paralelo',
          'Gestión',
        ]),
      );
      expect(h.firmas[0]).toBe('Director(a)');
      expect(h.firmas[1]).toMatch(/^Maestro\(a\)/);
    }
  });

  it('debe tener una fila por estudiante con N.º, nombre, notas y observaciones', () => {
    const [consolidada, matematica] = hojasPlanilla(datos());
    expect(consolidada.columnas).toEqual([
      'N.º',
      'Apellidos y nombres',
      'Lenguaje',
      'Matemática',
      'Promedio',
      'Observaciones',
    ]);
    expect(consolidada.filas[0]).toEqual(['1', 'Condori, Eva', '70', '45', '57.5', 'Reprobado']);
    expect(matematica.columnas).toEqual([
      'N.º',
      'Apellidos y nombres',
      '1.er trim.',
      '2.º trim.',
      '3.er trim.',
      'Nota anual',
      'Observaciones',
    ]);
    // Los trimestres que todavía no se centralizan salen con raya.
    expect(matematica.filas[1]).toEqual(['2', 'Quispe, Ana', '90', '—', '—', '—', 'Aprobado']);
    expect(matematica.encabezado).toContainEqual(['Maestro(a)', 'Ana Profesora']);
    expect(matematica.firmas).toEqual(['Director(a)', 'Maestro(a): Ana Profesora']);
  });

  it('debe explicar la observación según el trimestre', () => {
    expect(hojasPlanilla(datos(1))[1].pie[0]).toMatch(/1\.er trimestre/);
    expect(hojasPlanilla(datos(3))[1].pie[0]).toMatch(/nota anual/);
  });

  it('debe generar un PDF', async () => {
    const pdf = await generarPdfPlanilla(datos());
    expect(pdf.subarray(0, 5).toString()).toBe('%PDF-');
  });

  it('debe generar un Excel con una pestaña por hoja y las notas como números', async () => {
    const libro = new ExcelJS.Workbook();
    await libro.xlsx.load((await generarExcelPlanilla(datos())) as unknown as ExcelJS.Buffer);
    expect(libro.worksheets.map((w) => w.name)).toEqual([
      'Centralizador',
      'Matemática',
      'Ciencias Sociales Historia G',
    ]);
    const hoja = libro.getWorksheet('Centralizador');
    const valores: unknown[][] = [];
    hoja?.eachRow((r) => valores.push((r.values as unknown[]).slice(1)));
    expect(valores).toContainEqual(['Código SIE', '80000001']);
    expect(valores).toContainEqual([1, 'Condori, Eva', 70, 45, 57.5, 'Reprobado']);
    expect(valores.flat()).toEqual(expect.arrayContaining(['Director(a)', 'Maestro(a) asesor(a)']));
  });
});
