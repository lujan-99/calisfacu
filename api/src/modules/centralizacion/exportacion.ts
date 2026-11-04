import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import type { Observacion } from './planilla';

/** Lo que necesita la planilla oficial (US-09, criterio 2; decisión D21). */
export interface DatosExportacion {
  unidadEducativa: { nombre: string; codigoSie: string };
  gestion: number;
  curso: {
    nombre: string;
    nivelNombre: string;
    anioEscolaridad: number;
    paralelo: string;
  };
  /** Número del trimestre centralizado. */
  trimestre: number;
  totalTrimestres: number;
  fechaCentralizacion: string | null;
  consolidada: {
    materias: string[];
    filas: {
      numero: number;
      estudiante: string;
      notas: (number | null)[];
      promedio: number | null;
      observacion: Observacion;
    }[];
    resumen: { aprobados: number; reprobados: number; pendientes: number };
  };
  materias: {
    nombre: string;
    profesor: string;
    filas: {
      numero: number;
      estudiante: string;
      /** Nota de cada trimestre hasta el centralizado, en orden. */
      notas: (number | null)[];
      notaAnual: number | null;
      observacion: Observacion;
    }[];
  }[];
}

export interface HojaPlanilla {
  /** Nombre corto para la pestaña del Excel (máximo 31 caracteres). */
  nombre: string;
  titulo: string;
  encabezado: [string, string][];
  columnas: string[];
  /** Ancho relativo de cada columna. */
  anchos: number[];
  filas: string[][];
  pie: string[];
  firmas: string[];
}

const SIN_DATO = '—';
const ORDINALES = ['1.er', '2.º', '3.er', '4.º'];
const OBSERVACIONES: Record<Observacion, string> = {
  APROBADO: 'Aprobado',
  REPROBADO: 'Reprobado',
  PENDIENTE: 'Pendiente',
};
const texto = (v: number | null | undefined) =>
  v === null || v === undefined ? SIN_DATO : String(v);

/** Las pestañas de Excel no admiten : \ / ? * [ ] y tienen hasta 31 caracteres; no se pueden repetir. */
function nombreHoja(nombre: string, usados: Set<string>) {
  const base =
    nombre
      .replace(/[:\\/?*[\]]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 28)
      .trim() || 'Materia';
  let candidato = base;
  for (let i = 2; usados.has(candidato.toLowerCase()); i++) candidato = `${base} ${i}`;
  usados.add(candidato.toLowerCase());
  return candidato;
}

/**
 * Las hojas de la planilla oficial, separadas del dibujo para probarlas sin leer el PDF ni el Excel: primero la
 * consolidada del trimestre (una columna por materia) y después una por materia con la nota de cada trimestre, las
 * observaciones y el espacio para la firma del director(a) y del maestro(a).
 */
export function hojasPlanilla(d: DatosExportacion): HojaPlanilla[] {
  const encabezado: [string, string][] = [
    ['Unidad educativa', d.unidadEducativa.nombre],
    ['Código SIE', d.unidadEducativa.codigoSie],
    ['Nivel', d.curso.nivelNombre],
    ['Año de escolaridad', `${d.curso.anioEscolaridad}.º`],
    ['Paralelo', d.curso.paralelo],
    ['Gestión', String(d.gestion)],
  ];
  const trimestre = `${ORDINALES[d.trimestre - 1]} trimestre`;
  const usados = new Set<string>(['centralizador']);
  const r = d.consolidada.resumen;

  const consolidada: HojaPlanilla = {
    nombre: 'Centralizador',
    titulo: `CENTRALIZADOR DE CALIFICACIONES · ${ORDINALES[d.trimestre - 1]} TRIMESTRE`,
    encabezado,
    columnas: [
      'N.º',
      'Apellidos y nombres',
      ...d.consolidada.materias,
      'Promedio',
      'Observaciones',
    ],
    anchos: [0.6, 4, ...d.consolidada.materias.map(() => 1.2), 1.3, 1.8],
    filas: d.consolidada.filas.map((f) => [
      String(f.numero),
      f.estudiante,
      ...f.notas.map(texto),
      texto(f.promedio),
      OBSERVACIONES[f.observacion],
    ]),
    pie: [
      `Aprobados: ${r.aprobados} · Reprobados: ${r.reprobados} · Pendientes: ${r.pendientes}`,
      'Aprueba el trimestre quien aprueba todas sus materias (nota mínima 51). El promedio es un indicador.',
    ],
    firmas: ['Director(a)', 'Maestro(a) asesor(a)'],
  };

  const columnasTrimestre = Array.from(
    { length: d.totalTrimestres },
    (_, i) => `${ORDINALES[i]} trim.`,
  );
  const porMateria = d.materias.map((m): HojaPlanilla => ({
    nombre: nombreHoja(m.nombre, usados),
    titulo: `PLANILLA DE CALIFICACIONES · ${m.nombre.toUpperCase()}`,
    encabezado: [...encabezado, ['Maestro(a)', m.profesor]],
    columnas: ['N.º', 'Apellidos y nombres', ...columnasTrimestre, 'Nota anual', 'Observaciones'],
    anchos: [0.6, 4, ...columnasTrimestre.map(() => 1), 1.1, 1.8],
    filas: m.filas.map((f) => [
      String(f.numero),
      f.estudiante,
      // Los trimestres posteriores al centralizado todavía no tienen nota.
      ...columnasTrimestre.map((_, i) => texto(f.notas[i])),
      texto(f.notaAnual),
      OBSERVACIONES[f.observacion],
    ]),
    pie: [
      d.trimestre === d.totalTrimestres
        ? 'Observación según la nota anual (promedio de los trimestres, nota mínima 51).'
        : `Observación según la nota del ${trimestre} (nota mínima 51).`,
    ],
    firmas: ['Director(a)', `Maestro(a): ${m.profesor}`],
  }));
  return [consolidada, ...porMateria];
}

const MARGEN = 36;
const GRIS = '#555555';

/** PDF de la planilla oficial: una hoja por página (o más si el curso es largo), A4 horizontal. */
export function generarPdfPlanilla(d: DatosExportacion): Promise<Buffer> {
  const doc = new PDFDocument({
    size: 'A4',
    layout: 'landscape',
    margin: MARGEN,
    autoFirstPage: false,
    info: { Title: 'Centralizador de calificaciones', Creator: 'CalisFacu' },
  });
  const partes: Buffer[] = [];
  const listo = new Promise<Buffer>((resolve, reject) => {
    doc.on('data', (p: Buffer) => partes.push(p));
    doc.on('end', () => resolve(Buffer.concat(partes)));
    doc.on('error', reject);
  });
  for (const hoja of hojasPlanilla(d)) dibujarHoja(doc, hoja);
  doc.end();
  return listo;
}

function dibujarHoja(doc: PDFKit.PDFDocument, h: HojaPlanilla) {
  doc.addPage();
  const ancho = doc.page.width - MARGEN * 2;
  doc.fillColor('black').font('Helvetica-Bold').fontSize(13).text(h.titulo, { align: 'center' });
  doc.moveDown(0.6);
  doc.fontSize(9);
  const mitad = Math.ceil(h.encabezado.length / 2);
  const yInicio = doc.y;
  h.encabezado.forEach(([etiqueta, valor], i) => {
    const x = i < mitad ? MARGEN : MARGEN + ancho / 2;
    const y = yInicio + (i % mitad) * 13;
    doc.font('Helvetica-Bold').text(`${etiqueta}: `, x, y, { continued: true });
    doc.font('Helvetica').text(valor);
  });
  doc.x = MARGEN;
  doc.y = yInicio + mitad * 13 + 8;

  const total = h.anchos.reduce((s, a) => s + a, 0);
  const anchos = h.anchos.map((a) => (a / total) * ancho);
  const fila = (celdas: string[], negrita: boolean) => {
    doc.font(negrita ? 'Helvetica-Bold' : 'Helvetica').fontSize(8);
    const alto =
      Math.max(...celdas.map((c, i) => doc.heightOfString(c, { width: anchos[i] - 6 }))) + 6;
    if (doc.y + alto > doc.page.height - MARGEN) {
      doc.addPage();
      doc.y = MARGEN;
    }
    const y = doc.y;
    let x = MARGEN;
    celdas.forEach((c, i) => {
      doc.text(c, x + 3, y + 3, { width: anchos[i] - 6, align: i === 1 ? 'left' : 'center' });
      doc.rect(x, y, anchos[i], alto).strokeColor('#999999').stroke();
      x += anchos[i];
    });
    doc.x = MARGEN;
    doc.y = y + alto;
  };
  fila(h.columnas, true);
  for (const f of h.filas) fila(f, false);

  doc.moveDown(0.8).font('Helvetica').fontSize(8).fillColor(GRIS);
  for (const linea of h.pie) doc.text(linea, MARGEN);
  doc.fillColor('black');

  // Firmas: dos líneas al pie, separadas.
  const yFirma = Math.max(doc.y + 45, doc.page.height - MARGEN - 40);
  if (yFirma + 30 > doc.page.height - MARGEN) doc.addPage();
  const y = Math.min(yFirma, doc.page.height - MARGEN - 30);
  const anchoFirma = ancho / 3;
  h.firmas.forEach((firma, i) => {
    const x = MARGEN + (i === 0 ? anchoFirma / 4 : ancho - anchoFirma - anchoFirma / 4);
    doc
      .moveTo(x, y)
      .lineTo(x + anchoFirma, y)
      .strokeColor('black')
      .stroke();
    doc.fontSize(9).text(firma, x, y + 4, { width: anchoFirma, align: 'center' });
  });
  doc.x = MARGEN;
}

/** Excel de la planilla oficial: la consolidada y una pestaña por materia, con el mismo contenido que el PDF. */
export async function generarExcelPlanilla(d: DatosExportacion): Promise<Buffer> {
  const libro = new ExcelJS.Workbook();
  libro.creator = 'CalisFacu';
  for (const h of hojasPlanilla(d)) {
    const hoja = libro.addWorksheet(h.nombre, {
      pageSetup: { orientation: 'landscape', paperSize: 9, fitToPage: true, fitToWidth: 1 },
    });
    hoja.columns = h.anchos.map((a) => ({ width: Math.round(a * 9) }));
    const titulo = hoja.addRow([h.titulo]);
    titulo.font = { bold: true, size: 13 };
    hoja.mergeCells(titulo.number, 1, titulo.number, h.columnas.length);
    titulo.alignment = { horizontal: 'center' };
    for (const [etiqueta, valor] of h.encabezado) {
      const r = hoja.addRow([etiqueta, valor]);
      r.getCell(1).font = { bold: true };
    }
    hoja.addRow([]);
    const cabecera = hoja.addRow(h.columnas);
    cabecera.font = { bold: true };
    const borde = { style: 'thin' as const };
    const conBorde = (r: ExcelJS.Row) =>
      r.eachCell((c, n) => {
        c.border = { top: borde, left: borde, bottom: borde, right: borde };
        c.alignment = { horizontal: n === 2 ? 'left' : 'center', wrapText: true };
      });
    conBorde(cabecera);
    for (const f of h.filas) {
      // Las notas van como número para que la secretaria pueda ordenarlas o sumarlas en Excel.
      conBorde(hoja.addRow(f.map((c, i) => (i !== 1 && /^\d+(\.\d+)?$/.test(c) ? Number(c) : c))));
    }
    hoja.addRow([]);
    for (const linea of h.pie) hoja.addRow([linea]).font = { italic: true, size: 9 };
    hoja.addRow([]);
    hoja.addRow([]);
    const firmas = hoja.addRow([]);
    h.firmas.forEach((firma, i) => {
      const celda = firmas.getCell(i === 0 ? 2 : h.columnas.length - 1);
      celda.value = firma;
      celda.border = { top: borde };
      celda.alignment = { horizontal: 'center' };
    });
  }
  return Buffer.from(await libro.xlsx.writeBuffer());
}
