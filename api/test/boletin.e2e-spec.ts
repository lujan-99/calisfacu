import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { DataSource } from 'typeorm';
import {
  Actividad,
  Curso,
  DimensionEvaluacion,
  Estudiante,
  Nivel,
  Nota,
  Trimestre,
} from '../src/database/entities';
import type { DatosBoletin } from '../src/modules/boletin/contenido';
import { crearApp, escenario, limpiar, token, type Escenario } from './utils';

/** Lee la respuesta binaria de supertest como Buffer. */
const binario = (res: request.Response, cb: (e: Error | null, b: Buffer) => void) => {
  const partes: Buffer[] = [];
  res.on('data', (p: Buffer) => partes.push(p));
  res.on('end', () => cb(null, Buffer.concat(partes)));
};
const paginas = (pdf: Buffer) => (pdf.toString('latin1').match(/\/Type \/Page\b/g) ?? []).length;

/**
 * US-07: boletín en PDF de un estudiante (T-045, criterio 1) y los de un curso grande en la cola BullMQ (T-046,
 * criterio 3; decisión D19). Ana tiene Matemática con nota en los tres trimestres; Lenguaje solo en el primero.
 */
describe('Boletín de notas en PDF (US-07)', () => {
  let app: INestApplication;
  let ds: DataSource;
  let e: Escenario;
  const tk: Record<string, string> = {};
  const http = () => request(app.getHttpServer());
  const como = (quien: string) => ({ Authorization: `Bearer ${tk[quien]}` });

  beforeAll(async () => {
    ({ app, ds } = await crearApp());
    await limpiar(ds);
    e = await escenario(ds);
    for (const [k, email] of Object.entries({
      profesor: 'profe@ue.test',
      otro: 'otro@ue.test',
      secretaria: 'secre@ue.test',
      admin: 'admin@ue.test',
    })) {
      tk[k] = await token(app, email);
    }
    const ana = e.estudiantes[0];
    // Trimestre 1 por la API, como el profesor: Matemática 90 en todo; Lenguaje 60 (otro profesor).
    for (const a of [
      e.actividades.ser,
      e.actividades.saber1,
      e.actividades.hacer,
      e.actividades.auto,
    ]) {
      await http()
        .post('/api/notas/planilla')
        .set(como('profesor'))
        .send({ actividadId: a.id, notas: [{ estudianteId: ana.id, valor: 90 }] })
        .expect(201);
    }
    // Trimestres 2 y 3 directo en la base (el 3 está cerrado): Matemática 70 y 80 → anual 80.
    const t2 = await ds.getRepository(Trimestre).findOneByOrFail({ numero: 2 });
    const dims = await ds.getRepository(DimensionEvaluacion).find();
    for (const [trimestre, valor] of [
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
        await ds.getRepository(Nota).save({ actividad, estudiante: ana, valor });
      }
    }
    for (const [dia, estado] of [
      ['02', 'PRESENTE'],
      ['03', 'LICENCIA'],
      ['04', 'AUSENTE'],
      ['05', 'PRESENTE'],
    ]) {
      await http()
        .put(`/api/asistencias/materias/${e.matematica.id}/fechas/2026-03-${dia}`)
        .set(como('profesor'))
        .send({
          registros: e.estudiantes.map((x) => ({
            estudianteId: x.id,
            estado: x.id === ana.id ? estado : 'PRESENTE',
          })),
        })
        .expect(200);
    }
  });

  afterAll(() => app.close());

  describe('Boletín de un estudiante (T-045, criterio 1)', () => {
    it('debe llevar la unidad educativa, el código SIE, el nivel, el año de escolaridad y el paralelo', async () => {
      const r = await http()
        .get(`/api/boletines/estudiantes/${e.estudiantes[0].id}`)
        .set(como('profesor'))
        .expect(200);
      const b = r.body as DatosBoletin;
      expect(b.unidadEducativa).toEqual({ nombre: 'U. E. de prueba', codigoSie: '80000001' });
      expect(b.curso).toMatchObject({
        nivel: 'SECUNDARIA',
        nivelNombre: 'Secundaria',
        anioEscolaridad: 3,
        paralelo: 'A',
      });
      expect(b.estudiante).toMatchObject({ codigoRude: 'RUDE000001', apellidos: 'Quispe' });
    });

    it('debe tener por materia la nota de cada trimestre, la nota anual y la asistencia', async () => {
      const r = await http()
        .get(`/api/boletines/estudiantes/${e.estudiantes[0].id}`)
        .set(como('profesor'))
        .expect(200);
      const b = r.body as DatosBoletin;
      const mat = b.materias.find((m) => m.nombre === 'Matemática');
      // 3 de 4 clases contando la licencia (D5).
      expect(mat).toMatchObject({
        notas: [90, 70, 80],
        notaAnual: 80,
        aprobado: true,
        porcentajeAsistencia: 75,
      });
      expect(b.materias.find((m) => m.nombre === 'Lenguaje')).toMatchObject({
        notas: [null, null, null],
        notaAnual: null,
        porcentajeAsistencia: null,
      });
    });

    it('debe mostrar las mismas notas que el historial y la misma asistencia que la materia', async () => {
      const id = e.estudiantes[0].id;
      const [boletin, historial, asistencia] = await Promise.all([
        http().get(`/api/boletines/estudiantes/${id}`).set(como('secretaria')),
        http().get(`/api/estudiantes/${id}/historial`).set(como('secretaria')),
        http()
          .get(`/api/asistencias/materias/${e.matematica.id}/porcentajes`)
          .set(como('secretaria')),
      ]);
      const b = boletin.body as DatosBoletin;
      const h = historial.body as {
        promedioAnual: number | null;
        trimestres: {
          promedioTrimestral: number | null;
          materias: { materia: string; nota: number | null }[];
        }[];
      };
      for (const m of b.materias) {
        expect(m.notas).toEqual(
          h.trimestres.map((t) => t.materias.find((x) => x.materia === m.nombre)?.nota ?? null),
        );
      }
      expect(b.promediosTrimestrales).toEqual(h.trimestres.map((t) => t.promedioTrimestral));
      expect(b.promedioAnual).toBe(h.promedioAnual);
      const deAna = (asistencia.body as { estudianteId: number; porcentaje: number }[]).find(
        (x) => x.estudianteId === id,
      );
      expect(b.materias.find((m) => m.nombre === 'Matemática')?.porcentajeAsistencia).toBe(
        deAna?.porcentaje,
      );
    });

    it('debe descargar el boletín como un PDF de una página', async () => {
      const r = await http()
        .get(`/api/boletines/estudiantes/${e.estudiantes[0].id}/pdf`)
        .set(como('profesor'))
        .buffer(true)
        .parse(binario)
        .expect(200);
      expect(r.headers['content-type']).toBe('application/pdf');
      expect(r.headers['content-disposition']).toBe(
        'attachment; filename="Boletin_RUDE000001.pdf"',
      );
      const pdf = r.body as Buffer;
      expect(pdf.subarray(0, 5).toString()).toBe('%PDF-');
      expect(paginas(pdf)).toBe(1);
    });

    it('debe dejar generar el boletín al profesor de otra materia del mismo curso', async () => {
      await http()
        .get(`/api/boletines/estudiantes/${e.estudiantes[0].id}/pdf`)
        .set(como('otro'))
        .expect(200);
    });

    it('debe responder 403 al profesor que no da clases al curso y 404 a un estudiante que no existe', async () => {
      await http()
        .get(`/api/boletines/estudiantes/${e.ajeno.id}/pdf`)
        .set(como('profesor'))
        .expect(403);
      await http().get('/api/boletines/estudiantes/9999/pdf').set(como('secretaria')).expect(404);
    });
  });

  describe('Boletines de un curso grande en la cola (T-046, criterio 3)', () => {
    let cursoGrande: Curso;

    beforeAll(async () => {
      cursoGrande = await ds.getRepository(Curso).save({
        gestion: e.t1.gestion,
        nivel: Nivel.PRIMARIA,
        anioEscolaridad: 6,
        paralelo: 'C',
      });
      await ds.getRepository(Estudiante).save(
        Array.from({ length: 51 }, (_, i) => ({
          codigoRude: `GRANDE${String(i).padStart(4, '0')}`,
          nombres: `Estudiante ${i}`,
          apellidos: 'Grande',
          curso: cursoGrande,
          gestion: e.t1.gestion,
        })),
      );
    });

    const esperarFin = async (jobId: string, quien: string) => {
      for (let i = 0; i < 100; i++) {
        const r = await http().get(`/api/boletines/trabajos/${jobId}`).set(como(quien)).expect(200);
        const body = r.body as { estado: string };
        if (body.estado === 'COMPLETADO' || body.estado === 'FALLIDO')
          return r.body as Record<string, unknown>;
        await new Promise((ok) => setTimeout(ok, 200));
      }
      throw new Error('La cola no terminó a tiempo');
    };

    it('debe encolar los 51 boletines, avisar al terminar y entregar un PDF con una página por estudiante', async () => {
      const r = await http()
        .post(`/api/boletines/cursos/${cursoGrande.id}/cola`)
        .set(como('secretaria'))
        .expect(202);
      expect(r.body).toEqual({
        jobId: expect.any(String),
        totalEstudiantes: 51,
        estado: 'ENCOLADO',
      });
      const jobId = (r.body as { jobId: string }).jobId;

      const fin = await esperarFin(jobId, 'secretaria');
      expect(fin).toEqual({
        jobId,
        estado: 'COMPLETADO',
        progreso: 100,
        total: 51,
        mensaje: 'Los 51 boletines de Primaria 6.º «C» están listos para descargar.',
        urlDescarga: `/boletines/trabajos/${jobId}/pdf`,
      });

      const pdf = await http()
        .get(`/api/boletines/trabajos/${jobId}/pdf`)
        .set(como('secretaria'))
        .buffer(true)
        .parse(binario)
        .expect(200);
      expect(pdf.headers['content-type']).toBe('application/pdf');
      expect(paginas(pdf.body as Buffer)).toBe(51);
    });

    it('debe ocultar el trabajo a otro usuario con 404', async () => {
      const r = await http()
        .post(`/api/boletines/cursos/${cursoGrande.id}/cola`)
        .set(como('secretaria'))
        .expect(202);
      const jobId = (r.body as { jobId: string }).jobId;
      await http().get(`/api/boletines/trabajos/${jobId}`).set(como('admin')).expect(404);
      await http().get(`/api/boletines/trabajos/${jobId}/pdf`).set(como('admin')).expect(404);
      await esperarFin(jobId, 'secretaria');
    });

    it('debe responder 404 a un trabajo que no existe', async () => {
      await http().get('/api/boletines/trabajos/no-existe').set(como('secretaria')).expect(404);
    });

    it('debe responder 403 al profesor que no da clases al curso', async () => {
      await http()
        .post(`/api/boletines/cursos/${cursoGrande.id}/cola`)
        .set(como('profesor'))
        .expect(403);
    });

    it('debe responder 404 a un curso que no existe y 422 a un curso sin estudiantes', async () => {
      await http().post('/api/boletines/cursos/9999/cola').set(como('secretaria')).expect(404);
      const vacio = await ds.getRepository(Curso).save({
        gestion: e.t1.gestion,
        nivel: Nivel.PRIMARIA,
        anioEscolaridad: 1,
        paralelo: 'Z',
      });
      await http()
        .post(`/api/boletines/cursos/${vacio.id}/cola`)
        .set(como('secretaria'))
        .expect(422);
    });
  });
});
