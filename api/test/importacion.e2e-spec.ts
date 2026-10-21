import type { INestApplication } from '@nestjs/common';
import ExcelJS from 'exceljs';
import request from 'supertest';
import type { DataSource } from 'typeorm';
import { Nota, OrigenCambio, RegistroAuditoria } from '../src/database/entities';
import { crearApp, escenario, limpiar, token, type Escenario } from './utils';

const TIPO_XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

/** Un .xlsx con la plantilla del sistema: Código RUDE, Estudiante y Nota. */
async function archivo(filas: [string, unknown][]) {
  const libro = new ExcelJS.Workbook();
  const hoja = libro.addWorksheet('Notas');
  hoja.addRow(['Código RUDE', 'Estudiante', 'Nota']);
  for (const [rude, nota] of filas) hoja.addRow([rude, '', nota]);
  return Buffer.from(await libro.xlsx.writeBuffer());
}

/** US-05 (T-038): importación de notas desde una planilla Excel. */
describe('Importación de notas desde Excel (US-05)', () => {
  let app: INestApplication;
  let ds: DataSource;
  let e: Escenario;
  const tk: Record<string, string> = {};
  const http = () => request(app.getHttpServer());
  const url = (paso: string, actividadId = e.actividades.saber1.id) =>
    `/api/importaciones/actividades/${actividadId}/${paso}`;
  const subir = (paso: string, contenido: Buffer, quien = 'profesor', actividadId?: number) =>
    http()
      .post(url(paso, actividadId))
      .set('Authorization', `Bearer ${tk[quien]}`)
      .attach('archivo', contenido, { filename: 'notas.xlsx', contentType: TIPO_XLSX });
  let mixto: Buffer;

  beforeAll(async () => {
    ({ app, ds } = await crearApp());
    await limpiar(ds);
    e = await escenario(ds);
    for (const [k, email] of Object.entries({
      profesor: 'profe@ue.test',
      otro: 'otro@ue.test',
      secretaria: 'secre@ue.test',
    })) {
      tk[k] = await token(app, email);
    }
    // RUDE000004 es de otro curso y 0 está fuera de la escala (D1).
    mixto = await archivo([
      ['RUDE000001', 80],
      ['RUDE000004', 70],
      ['RUDE000002', 0],
      ['RUDE000003', '75,5'],
    ]);
  });

  afterAll(() => app.close());

  it('debe entregar la plantilla con los estudiantes del curso', async () => {
    const r = await http()
      .get(url('plantilla'))
      .set('Authorization', `Bearer ${tk.profesor}`)
      .buffer(true)
      .parse((res, fin) => {
        const partes: Buffer[] = [];
        res.on('data', (c: Buffer) => partes.push(c));
        res.on('end', () => fin(null, Buffer.concat(partes)));
      })
      .expect(200);
    expect(r.headers['content-type']).toContain(TIPO_XLSX);
    expect(r.headers['content-disposition']).toContain('.xlsx');
    const libro = new ExcelJS.Workbook();
    await libro.xlsx.load(r.body as ExcelJS.Buffer);
    const hoja = libro.getWorksheet('Notas')!;
    expect(hoja.getRow(1).values).toEqual([undefined, 'Código RUDE', 'Estudiante', 'Nota']);
    expect([2, 3, 4].map((i) => hoja.getCell(`A${i}`).value)).toEqual([
      'RUDE000003',
      'RUDE000002',
      'RUDE000001',
    ]);
  });

  it('debe mostrar la vista previa con filas válidas y con error sin guardar nada (criterio 1)', async () => {
    const r = await subir('vista-previa', mixto).expect(201);
    const vista = r.body as {
      resumen: unknown;
      filasValidas: { codigoRude: string }[];
      filasObservadas: { linea: number; motivo: string }[];
    };
    expect(vista.resumen).toEqual({ total: 4, validas: 2, errores: 2 });
    expect(vista.filasValidas.map((f) => f.codigoRude)).toEqual(['RUDE000001', 'RUDE000003']);
    expect(vista.filasObservadas.map((f) => [f.linea, f.motivo])).toEqual([
      [3, 'El estudiante no existe en este curso'],
      [4, 'La nota debe ser un número entre 1 y 100, con hasta dos decimales'],
    ]);
    expect(await ds.getRepository(Nota).count()).toBe(0);
  });

  it('debe guardar solo las filas válidas y rechazar las demás con su motivo (criterio 2)', async () => {
    const r = await subir('confirmar', mixto).expect(201);
    expect(r.body).toMatchObject({ guardadas: 2, rechazadas: 2 });
    const notas = await ds.getRepository(Nota).find({ relations: { estudiante: true } });
    expect(notas.map((n) => [n.estudiante.codigoRude, n.valor]).sort()).toEqual([
      ['RUDE000001', 80],
      ['RUDE000003', 75.5],
    ]);
  });

  it('debe dejar cada nota importada en la auditoría con origen importación (criterio 3)', async () => {
    const registros = await ds
      .getRepository(RegistroAuditoria)
      .find({ relations: { usuario: true } });
    expect(registros).toHaveLength(2);
    for (const r of registros) {
      expect(r).toMatchObject({ origen: OrigenCambio.IMPORTACION, valorAnterior: null });
      expect(r.usuario.id).toBe(e.profesor.id);
    }
  });

  it('debe rechazar la confirmación si ninguna fila es válida (las notas ya existen)', async () => {
    const r = await subir('confirmar', await archivo([['RUDE000001', 90]])).expect(422);
    expect(r.body.message).toBe('No hay filas válidas para importar');
    expect(await ds.getRepository(Nota).count()).toBe(2);
  });

  it('debe rechazar un archivo que no es un Excel o que no viene', async () => {
    const r = await subir('vista-previa', Buffer.from('no soy un excel')).expect(400);
    expect(r.body.message).toBe('El archivo no es una planilla Excel (.xlsx) válida');
    await http()
      .post(url('vista-previa'))
      .set('Authorization', `Bearer ${tk.profesor}`)
      .expect(400);
  });

  it('debe exigir las columnas Código RUDE y Nota en la primera fila', async () => {
    const libro = new ExcelJS.Workbook();
    libro.addWorksheet('Notas').addRow(['Estudiante', 'Puntaje']);
    const r = await subir('vista-previa', Buffer.from(await libro.xlsx.writeBuffer())).expect(400);
    expect(r.body.message).toBe(
      'La planilla debe tener las columnas "Código RUDE" y "Nota" en la primera fila',
    );
  });

  it('debe leer el resultado de una nota escrita como fórmula de Excel', async () => {
    const r = await subir(
      'vista-previa',
      await archivo([['RUDE000002', { formula: '40*2', result: 80 }]]),
    ).expect(201);
    expect(r.body.filasValidas).toEqual([
      expect.objectContaining({ codigoRude: 'RUDE000002', valor: 80 }),
    ]);
  });

  it('debe rechazar una planilla de más de 1000 filas', async () => {
    const filas = Array.from({ length: 1001 }, (_, i): [string, unknown] => [`RUDE${i}`, 50]);
    const r = await subir('vista-previa', await archivo(filas)).expect(400);
    expect(r.body.message).toBe('La planilla tiene más de 1000 filas');
  });

  it('debe rechazar la importación en un trimestre cerrado', async () => {
    await subir('confirmar', mixto, 'profesor', e.actividades.cerrada.id).expect(422);
  });

  it('debe responder 403 al profesor no asignado y a la secretaria', async () => {
    await subir('vista-previa', mixto, 'otro').expect(403);
    await subir('confirmar', mixto, 'secretaria').expect(403);
  });
});
