import PDFDocument from 'pdfkit';
import { contenidoBoletin, type DatosBoletin } from './contenido';

const MARGEN = 50;
const GRIS = '#555555';

/** Fecha y hora en Bolivia, como la ve el profesor (decisión D8). */
function ahoraEnBolivia() {
  return new Intl.DateTimeFormat('es-BO', {
    timeZone: 'America/La_Paz',
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date());
}

/** PDF con un boletín por página (US-07): uno para un estudiante y todo el curso para la cola. */
export function generarPdfBoletines(boletines: readonly DatosBoletin[]): Promise<Buffer> {
  const doc = new PDFDocument({
    size: 'A4',
    margin: MARGEN,
    autoFirstPage: false,
    info: { Title: 'Boletín de calificaciones', Creator: 'CalisFacu' },
  });
  const partes: Buffer[] = [];
  const listo = new Promise<Buffer>((resolve, reject) => {
    doc.on('data', (p: Buffer) => partes.push(p));
    doc.on('end', () => resolve(Buffer.concat(partes)));
    doc.on('error', reject);
  });
  const generadoEl = ahoraEnBolivia();
  for (const datos of boletines) dibujar(doc, contenidoBoletin(datos, generadoEl));
  doc.end();
  return listo;
}

function dibujar(doc: PDFKit.PDFDocument, c: ReturnType<typeof contenidoBoletin>) {
  doc.addPage();
  const ancho = doc.page.width - MARGEN * 2;

  doc.font('Helvetica-Bold').fontSize(14).text(c.encabezado[0], { align: 'center' });
  doc
    .font('Helvetica')
    .fontSize(10)
    .fillColor(GRIS)
    .text(c.encabezado.slice(1).join('   ·   '), { align: 'center' });
  doc.moveDown(1);
  doc.fillColor('black').font('Helvetica-Bold').fontSize(13).text(c.titulo, { align: 'center' });
  doc.moveDown(1);

  doc.fontSize(10);
  for (const [etiqueta, valor] of c.datosEstudiante) {
    doc.font('Helvetica-Bold').text(`${etiqueta}: `, { continued: true });
    doc.font('Helvetica').text(valor);
  }
  doc.moveDown(1);

  // Tabla: la materia ocupa el doble que cada columna de notas.
  const unidad = ancho / (c.columnas.length + 1);
  const anchos = c.columnas.map((_, i) => (i === 0 ? unidad * 2 : unidad));
  const fila = (celdas: string[], negrita: boolean) => {
    doc.font(negrita ? 'Helvetica-Bold' : 'Helvetica');
    // El alto lo da la celda más larga (un nombre de materia puede ocupar dos líneas).
    const alto =
      Math.max(...celdas.map((celda, i) => doc.heightOfString(celda, { width: anchos[i] - 8 }))) +
      8;
    if (doc.y + alto > doc.page.height - MARGEN) doc.addPage();
    const y = doc.y;
    let x = MARGEN;
    celdas.forEach((celda, i) => {
      doc.text(celda, x + 4, y + 4, { width: anchos[i] - 8, align: i === 0 ? 'left' : 'center' });
      x += anchos[i];
    });
    doc.rect(MARGEN, y, ancho, alto).strokeColor('#bbbbbb').stroke();
    doc.x = MARGEN;
    doc.y = y + alto;
  };
  fila(c.columnas, true);
  for (const f of c.filas) fila(f, false);
  doc.moveDown(1.5);

  doc.font('Helvetica').fontSize(10);
  for (const linea of c.pie.slice(0, -1)) doc.text(linea, MARGEN);
  doc.moveDown(1);
  doc
    .fontSize(8)
    .fillColor(GRIS)
    .text(c.pie[c.pie.length - 1], MARGEN);
  doc.fillColor('black');
}
