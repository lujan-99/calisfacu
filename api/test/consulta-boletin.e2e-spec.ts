import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { DataSource } from 'typeorm';
import {
  Actividad,
  DimensionEvaluacion,
  EntregaNotas,
  Nota,
  Trimestre,
} from '../src/database/entities';
import { crearApp, escenario, limpiar, token, type Escenario } from './utils';

interface BoletinPadre {
  publicado: boolean;
  estadoPeriodo: string;
  promedioAnual: number | null;
  estadoAnual: string;
  materias: {
    nombre: string;
    notaT1: number | null;
    notaT2: number | null;
    notaT3: number | null;
    promedioFinal: number | null;
    estado: string;
  }[];
}

/**
 * US-11 (T-050): la secretaria publica el boletín de un curso por trimestre cuando todas las materias entregaron sus
 * notas, y el padre ve y descarga solo lo publicado de sus hijos (decisión D20). El padre del escenario está
 * vinculado a Ana, que tiene Matemática con 90, 70 y 80 en los tres trimestres.
 */
describe('Consulta del boletín por el padre (US-11, T-050)', () => {
  let app: INestApplication;
  let ds: DataSource;
  let e: Escenario;
  let t2: Trimestre;
  let cursoId: number;
  const tk: Record<string, string> = {};
  const http = () => request(app.getHttpServer());
  const como = (quien: string) => ({ Authorization: `Bearer ${tk[quien]}` });
  const boletinDeAna = async () => {
    const r = await http()
      .get(`/api/padre/hijos/${e.estudiantes[0].id}/boletin`)
      .set(como('padre'))
      .expect(200);
    return r.body as BoletinPadre;
  };
  const entregar = (trimestre: Trimestre) =>
    ds.getRepository(EntregaNotas).save([
      { materia: e.matematica, trimestre, profesor: e.profesor },
      { materia: e.lenguaje, trimestre, profesor: e.otroProfesor },
    ]);
  const publicar = (trimestreId: number) =>
    http()
      .post('/api/boletines/publicaciones')
      .set(como('secretaria'))
      .send({ cursoId, trimestreId });

  beforeAll(async () => {
    ({ app, ds } = await crearApp());
    await limpiar(ds);
    e = await escenario(ds);
    cursoId = e.estudiantes[0].curso.id;
    t2 = await ds.getRepository(Trimestre).findOneByOrFail({ numero: 2 });
    for (const [k, email] of Object.entries({
      profesor: 'profe@ue.test',
      secretaria: 'secre@ue.test',
      padre: 'padre@ue.test',
    })) {
      tk[k] = await token(app, email);
    }
    const dims = await ds.getRepository(DimensionEvaluacion).find();
    for (const [trimestre, valor] of [
      [e.t1, 90],
      [t2, 70],
      [e.t3, 80],
    ] as const) {
      for (const dimension of dims) {
        const actividad = await ds.getRepository(Actividad).save({
          nombre: `${dimension.codigo} T${trimestre.numero}`,
          materia: e.matematica,
          trimestre,
          dimension,
        });
        await ds.getRepository(Nota).save({ actividad, estudiante: e.estudiantes[0], valor });
      }
    }
  });

  afterAll(() => app.close());

  describe('Criterio 2: sin publicar, el padre no ve el boletín', () => {
    it('debe mostrar al padre que el boletín está en elaboración, sin ninguna nota', async () => {
      expect(await boletinDeAna()).toMatchObject({
        publicado: false,
        estadoPeriodo: 'EN_ELABORACION',
        mensajeEstado: 'El boletín todavía no fue publicado por la unidad educativa.',
        promedioAnual: null,
        porcentajeAsistencia: null,
        estadoAnual: 'EN_CURSO',
        materias: [],
      });
    });

    it('debe responder 404 a la descarga del PDF', async () => {
      const r = await http()
        .get(`/api/padre/hijos/${e.estudiantes[0].id}/boletin/pdf`)
        .set(como('padre'))
        .expect(404);
      expect(r.body.message).toBe('El boletín todavía no fue publicado por la unidad educativa.');
    });
  });

  describe('Publicación de la secretaria (decisión D20)', () => {
    it('debe mostrar por trimestre qué materias faltan entregar', async () => {
      const r = await http()
        .get(`/api/boletines/publicaciones?cursoId=${cursoId}`)
        .set(como('secretaria'))
        .expect(200);
      expect((r.body as unknown[])[0]).toEqual({
        trimestreId: e.t1.id,
        numero: 1,
        cerrado: false,
        materias: 2,
        materiasPendientes: ['Lenguaje', 'Matemática'],
        publicado: false,
        publicadoEn: null,
        publicadoPor: null,
      });
    });

    it('debe rechazar con 422 la publicación si falta alguna entrega de notas', async () => {
      const r = await publicar(e.t1.id).expect(422);
      expect(r.body.message).toBe('Faltan entregar las notas de: Lenguaje, Matemática');
    });

    it('debe publicar el trimestre cuando todas las materias entregaron y rechazar repetirlo', async () => {
      await entregar(e.t1);
      const r = await publicar(e.t1.id).expect(201);
      expect(r.body).toMatchObject({
        trimestreId: e.t1.id,
        materiasPendientes: [],
        publicado: true,
        publicadoEn: expect.any(String),
        publicadoPor: { id: e.secretaria.id, nombre: 'Rosa Secretaria' },
      });
      await publicar(e.t1.id).expect(409);
    });

    it('debe responder 404 a un trimestre de otra gestión y a un curso que no existe', async () => {
      await publicar(9999).expect(404);
      await http()
        .get('/api/boletines/publicaciones?cursoId=9999')
        .set(como('secretaria'))
        .expect(404);
    });
  });

  describe('Criterio 1: publicado, el padre lo ve y lo descarga', () => {
    it('debe mostrar solo las notas de los trimestres publicados', async () => {
      const b = await boletinDeAna();
      expect(b).toMatchObject({ publicado: true, estadoPeriodo: 'PUBLICADO' });
      // El 2.º y el 3.er trimestre ya tienen notas, pero no están publicados.
      expect(b.materias.find((m) => m.nombre === 'Matemática')).toEqual({
        materiaId: e.matematica.id,
        nombre: 'Matemática',
        profesorNombre: 'Ana Profesora',
        notaT1: 90,
        notaT2: null,
        notaT3: null,
        promedioFinal: null,
        estado: 'EN_CURSO',
      });
    });

    it('debe descargar el PDF del boletín publicado', async () => {
      const r = await http()
        .get(`/api/padre/hijos/${e.estudiantes[0].id}/boletin/pdf`)
        .set(como('padre'))
        .expect(200);
      expect(r.headers['content-type']).toBe('application/pdf');
      expect(r.headers['content-disposition']).toBe(
        'attachment; filename="Boletin_RUDE000001.pdf"',
      );
    });

    it('debe mostrar la nota anual cuando están publicados los tres trimestres', async () => {
      await entregar(t2);
      await entregar(e.t3);
      await publicar(t2.id).expect(201);
      await publicar(e.t3.id).expect(201);
      const b = await boletinDeAna();
      expect(b.materias.find((m) => m.nombre === 'Matemática')).toMatchObject({
        notaT1: 90,
        notaT2: 70,
        notaT3: 80,
        promedioFinal: 80,
        estado: 'APROBADO',
      });
    });

    it('debe responder 403 al padre que pide el boletín de un estudiante no vinculado', async () => {
      for (const sufijo of ['boletin', 'boletin/pdf']) {
        await http()
          .get(`/api/padre/hijos/${e.estudiantes[1].id}/${sufijo}`)
          .set(como('padre'))
          .expect(403);
      }
    });

    it('debe ocultar de nuevo un trimestre que se despublica', async () => {
      await http()
        .delete(`/api/boletines/publicaciones/${cursoId}/${e.t3.id}`)
        .set(como('secretaria'))
        .expect(204);
      await http()
        .delete(`/api/boletines/publicaciones/${cursoId}/${e.t3.id}`)
        .set(como('secretaria'))
        .expect(404);
      const b = await boletinDeAna();
      expect(b.materias.find((m) => m.nombre === 'Matemática')).toMatchObject({
        notaT3: null,
        promedioFinal: null,
      });
    });
  });
});
