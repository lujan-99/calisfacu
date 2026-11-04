import type { INestApplication } from '@nestjs/common';
import ExcelJS from 'exceljs';
import request from 'supertest';
import type { DataSource } from 'typeorm';
import {
  Actividad,
  Centralizacion,
  Curso,
  DimensionEvaluacion,
  Materia,
  Nivel,
  Nota,
  Trimestre,
} from '../src/database/entities';
import { crearApp, escenario, limpiar, token, type Escenario } from './utils';

interface Planilla {
  todasEntregadas: boolean;
  centralizado: boolean;
  fechaCentralizacion: string | null;
  unidadEducativa: { nombre: string; codigoSie: string };
  trimestre: { numero: number; cerrado: boolean };
  materiasPendientes: { materia: string; profesor: string; notasFaltantes: number }[];
  materias: { id: number; nombre: string; profesor: string }[];
  filas: {
    numero: number;
    estudiante: string;
    notas: Record<string, number | null>;
    promedioTrimestral: number | null;
    observacion: string;
  }[];
  resumen: Record<string, number | null>;
}

const binario = (res: request.Response, cb: (err: Error | null, body: Buffer) => void) => {
  const partes: Buffer[] = [];
  res.on('data', (p: Buffer) => partes.push(p));
  res.on('end', () => cb(null, Buffer.concat(partes)));
};

/** US-09 (T-057 y T-058): centralización de notas y planilla oficial, contra PostgreSQL real. */
describe('Centralización de notas (US-09)', () => {
  let app: INestApplication;
  let ds: DataSource;
  let e: Escenario;
  let fisica: Materia;
  let cursoC: Curso;
  const tk: Record<string, string> = {};
  const http = () => request(app.getHttpServer());
  const url = (sufijo = '') =>
    `/api/centralizador/cursos/${e.matematica.curso.id}${sufijo}?trimestreId=${e.t1.id}`;
  const planilla = async () =>
    (await http().get(url()).set('Authorization', `Bearer ${tk.secretaria}`).expect(200))
      .body as Planilla;
  const ejecutar = (cerrarTrimestre?: boolean) =>
    http()
      .post(`/api/centralizador/cursos/${e.matematica.curso.id}/ejecutar`)
      .set('Authorization', `Bearer ${tk.secretaria}`)
      .send({ trimestreId: e.t1.id, cerrarTrimestre });
  const entregar = (materiaId: number, quien: string) =>
    http()
      .post(`/api/entregas/materias/${materiaId}/entregar`)
      .set('Authorization', `Bearer ${tk[quien]}`)
      .send({ trimestreId: e.t1.id })
      .expect(201);

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
    // Lenguaje completa sus cuatro dimensiones (el escenario solo trae una actividad de Saber).
    const dims = await ds.getRepository(DimensionEvaluacion).find();
    const dim = (codigo: string) => dims.find((d) => d.codigo === codigo);
    const lenguaje = [
      { id: e.actividades.lenguaje.id },
      ...(await ds.getRepository(Actividad).save(
        ['SER', 'HACER', 'AUTOEVALUACION'].map((codigo) => ({
          nombre: `Lenguaje ${codigo}`,
          materia: e.lenguaje,
          trimestre: e.t1,
          dimension: dim(codigo),
        })),
      )),
    ];
    const matematica = ['ser', 'saber1', 'saber2', 'hacer', 'auto'] as const;
    // Nota igual en todas las actividades: la nota trimestral es ese mismo valor.
    const notas: Record<string, [number, number]> = {
      Ana: [90, 80],
      Luis: [60, 80],
      Eva: [40, 80],
    };
    for (const est of e.estudiantes) {
      const [mat, len] = notas[est.nombres];
      for (const a of matematica) {
        await ds
          .getRepository(Nota)
          .save({ actividad: e.actividades[a], estudiante: est, valor: mat });
      }
      for (const a of lenguaje) {
        await ds.getRepository(Nota).save({ actividad: { id: a.id }, estudiante: est, valor: len });
      }
    }
    // Un tercer curso con una materia sin entregar: impide cerrar el trimestre.
    cursoC = await ds.getRepository(Curso).save({
      gestion: e.t1.gestion,
      nivel: Nivel.SECUNDARIA,
      anioEscolaridad: 4,
      paralelo: 'A',
    });
    fisica = await ds.getRepository(Materia).save({ nombre: 'Física', curso: cursoC });
  });

  afterAll(() => app.close());

  it('debe listar las materias pendientes y no centralizar (criterio 3)', async () => {
    const p = await planilla();
    expect(p.todasEntregadas).toBe(false);
    expect(p.materiasPendientes.map((m) => [m.materia, m.profesor, m.notasFaltantes])).toEqual([
      ['Lenguaje', 'Luis Profesor', 0],
      ['Matemática', 'Ana Profesora', 0],
    ]);
    await entregar(e.matematica.id, 'profesor');
    const r = await ejecutar().expect(422);
    expect((r.body as { message: string }).message).toBe(
      'No se puede centralizar: faltan entregar las notas de Lenguaje (Luis Profesor)',
    );
    expect(await ds.getRepository(Centralizacion).count()).toBe(0);
  });

  it('debe mostrar la planilla consolidada con todas las materias del curso (criterio 1)', async () => {
    await entregar(e.lenguaje.id, 'otro');
    const p = await planilla();
    expect(p.todasEntregadas).toBe(true);
    expect(p.centralizado).toBe(false);
    expect(p.unidadEducativa).toEqual({ nombre: 'U. E. de prueba', codigoSie: '80000001' });
    expect(p.materias.map((m) => [m.nombre, m.profesor])).toEqual([
      ['Lenguaje', 'Luis Profesor'],
      ['Matemática', 'Ana Profesora'],
    ]);
    const [len, mat] = p.materias.map((m) => m.id);
    expect(
      p.filas.map((f) => [
        f.numero,
        f.estudiante,
        f.notas[len],
        f.notas[mat],
        f.promedioTrimestral,
        f.observacion,
      ]),
    ).toEqual([
      // El promedio (60) aprobaría, pero reprueba Matemática: las notas oficiales son por materia (D21).
      [1, 'Condori, Eva', 80, 40, 60, 'REPROBADO'],
      [2, 'Mamani, Luis', 80, 60, 70, 'APROBADO'],
      [3, 'Quispe, Ana', 80, 90, 85, 'APROBADO'],
    ]);
    expect(p.resumen).toMatchObject({
      totalEstudiantes: 3,
      aprobados: 2,
      reprobados: 1,
      pendientes: 0,
      promedioGeneral: 71.7,
      tasaAprobacion: 66.7,
    });
  });

  it('debe exportar la planilla oficial solo después de centralizar', async () => {
    const r = await http()
      .get(url('/pdf'))
      .set('Authorization', `Bearer ${tk.secretaria}`)
      .expect(422);
    expect((r.body as { message: string }).message).toMatch(/Primero centralice/);
  });

  it('debe no cerrar el trimestre si falta centralizar otro curso de la gestión', async () => {
    const r = await ejecutar(true).expect(422);
    expect((r.body as { message: string }).message).toBe(
      'No se puede cerrar el trimestre: faltan centralizar Secundaria 4.º «A»',
    );
    // Nada a medias: tampoco queda centralizado el curso.
    expect(await ds.getRepository(Centralizacion).count()).toBe(0);
    expect((await ds.getRepository(Trimestre).findOneByOrFail({ id: e.t1.id })).cerrado).toBe(
      false,
    );
  });

  it('debe centralizar y cerrar el trimestre cuando no queda ningún curso pendiente', async () => {
    // El curso C se queda sin materias: no tiene notas que centralizar.
    await ds.getRepository(Materia).delete(fisica.id);
    const r = await ejecutar(true).expect(200);
    const cuerpo = r.body as { exito: boolean; mensaje: string; centralizador: Planilla };
    expect(cuerpo.exito).toBe(true);
    expect(cuerpo.mensaje).toBe(
      'Se centralizaron las notas de Secundaria 3.º «A» y se cerró el trimestre 1.',
    );
    expect(cuerpo.centralizador.centralizado).toBe(true);
    expect(cuerpo.centralizador.fechaCentralizacion).not.toBeNull();
    expect(cuerpo.centralizador.trimestre.cerrado).toBe(true);
    // El trimestre cerrado ya no admite notas (US-18) ni otra centralización.
    await ejecutar().expect(422);
  });

  it('debe exportar la planilla en PDF con el formato oficial (criterio 2)', async () => {
    const r = await http()
      .get(url('/pdf'))
      .set('Authorization', `Bearer ${tk.secretaria}`)
      .buffer(true)
      .parse(binario)
      .expect(200);
    expect(r.headers['content-type']).toBe('application/pdf');
    expect(r.headers['content-disposition']).toBe(
      'attachment; filename="Centralizador_Secundaria_3A_T1_2026.pdf"',
    );
    expect((r.body as Buffer).subarray(0, 5).toString()).toBe('%PDF-');
  });

  it('debe exportar la planilla en Excel con el formato oficial (criterio 2)', async () => {
    const r = await http()
      .get(url('/excel'))
      .set('Authorization', `Bearer ${tk.secretaria}`)
      .buffer(true)
      .parse(binario)
      .expect(200);
    expect(r.headers['content-type']).toBe(
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    const libro = new ExcelJS.Workbook();
    await libro.xlsx.load(r.body);
    expect(libro.worksheets.map((w) => w.name)).toEqual([
      'Centralizador',
      'Lenguaje',
      'Matemática',
    ]);
    const filas = (nombre: string) => {
      const v: unknown[][] = [];
      libro
        .getWorksheet(nombre)
        ?.eachRow((f) =>
          v.push((f.values as unknown[]).slice(1).filter((c) => c !== undefined && c !== null)),
        );
      return v;
    };
    const consolidada = filas('Centralizador');
    for (const dato of [
      ['Unidad educativa', 'U. E. de prueba'],
      ['Código SIE', '80000001'],
      ['Nivel', 'Secundaria'],
      ['Año de escolaridad', '3.º'],
      ['Paralelo', 'A'],
      ['Gestión', '2026'],
    ]) {
      expect(consolidada).toContainEqual(dato);
    }
    expect(consolidada).toContainEqual([1, 'Condori, Eva', 80, 40, 60, 'Reprobado']);
    const matematica = filas('Matemática');
    expect(matematica).toContainEqual(['Maestro(a)', 'Ana Profesora']);
    expect(matematica).toContainEqual([
      'N.º',
      'Apellidos y nombres',
      '1.er trim.',
      '2.º trim.',
      '3.er trim.',
      'Nota anual',
      'Observaciones',
    ]);
    expect(matematica).toContainEqual([3, 'Quispe, Ana', 90, '—', '—', '—', 'Aprobado']);
    expect(matematica.flat()).toEqual(
      expect.arrayContaining(['Director(a)', 'Maestro(a): Ana Profesora']),
    );
  });

  it('debe responder 404 si el trimestre no es de la gestión del curso', async () => {
    await http()
      .get(`/api/centralizador/cursos/${e.matematica.curso.id}?trimestreId=99999`)
      .set('Authorization', `Bearer ${tk.secretaria}`)
      .expect(404);
  });
});
