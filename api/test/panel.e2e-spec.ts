import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { DataSource } from 'typeorm';
import { crearApp, escenario, limpiar, token, type Escenario } from './utils';

interface FilaPanel {
  estudianteId: number;
  promedio: number | null;
  porcentajeAsistencia: number | null;
  enRiesgo: boolean;
  motivoRiesgo: string | null;
  estado: string;
}

/**
 * US-06 (T-043): panel de riesgo de una materia con la nota del trimestre y la asistencia acumulada de cada
 * estudiante (decisiones D6 y D18). Se cargan notas y asistencia por la API, como lo haría el profesor:
 *  - Ana: 90 en todo y asistencia completa → regular.
 *  - Luis: 30 en todo y asistencia completa → en riesgo por promedio.
 *  - Eva: sin notas y 3 de 5 clases (60 %) → en riesgo por asistencia.
 */
describe('Panel de riesgo académico (US-06, T-043)', () => {
  let app: INestApplication;
  let ds: DataSource;
  let e: Escenario;
  const tk: Record<string, string> = {};
  const http = () => request(app.getHttpServer());
  const como = (quien: string) => ({ Authorization: `Bearer ${tk[quien]}` });
  const panel = async (quien = 'profesor', qs = '') => {
    const r = await http()
      .get(`/api/materias/${e.matematica.id}/riesgo${qs}`)
      .set(como(quien))
      .expect(200);
    return r.body as { estudiantes: FilaPanel[]; [k: string]: unknown };
  };
  const de = (filas: FilaPanel[], i: number) =>
    filas.find((f) => f.estudianteId === e.estudiantes[i].id) as FilaPanel;

  beforeAll(async () => {
    ({ app, ds } = await crearApp());
    await limpiar(ds);
    e = await escenario(ds);
    for (const [k, email] of Object.entries({
      profesor: 'profe@ue.test',
      secretaria: 'secre@ue.test',
      admin: 'admin@ue.test',
    })) {
      tk[k] = await token(app, email);
    }
    const [ana, luis, eva] = e.estudiantes;
    const { ser, saber1, hacer, auto } = e.actividades;
    for (const actividad of [ser, saber1, hacer, auto]) {
      await http()
        .post('/api/notas/planilla')
        .set(como('profesor'))
        .send({
          actividadId: actividad.id,
          notas: [
            { estudianteId: ana.id, valor: 90 },
            { estudianteId: luis.id, valor: 30 },
          ],
        })
        .expect(201);
    }
    for (const [dia, evaVino] of [
      ['02', true],
      ['03', false],
      ['04', true],
      ['05', false],
      ['06', true],
    ] as const) {
      await http()
        .put(`/api/asistencias/materias/${e.matematica.id}/fechas/2026-03-${dia}`)
        .set(como('profesor'))
        .send({
          registros: [
            { estudianteId: ana.id, estado: 'PRESENTE' },
            { estudianteId: luis.id, estado: 'PRESENTE' },
            { estudianteId: eva.id, estado: evaVino ? 'PRESENTE' : 'AUSENTE' },
          ],
        })
        .expect(200);
    }
  });

  afterAll(() => app.close());

  describe('Criterio 1: cada estudiante con su promedio y su asistencia', () => {
    it('debe mostrar al profesor a todos los estudiantes del curso con promedio y porcentaje de asistencia', async () => {
      const r = await panel();
      expect(r).toMatchObject({
        materia: { id: e.matematica.id, nombre: 'Matemática' },
        curso: { nombre: 'Secundaria 3.º «A»' },
        trimestre: { id: e.t1.id, numero: 1, cerrado: false },
        umbralAsistencia: 80,
        umbralNotaMinima: 51,
      });
      expect(r.estudiantes).toEqual([
        {
          estudianteId: e.estudiantes[2].id,
          codigoRude: 'RUDE000003',
          ci: null,
          estudiante: 'Condori, Eva',
          promedio: null,
          porcentajeAsistencia: 60,
          clasesDictadas: 5,
          asistencias: 3,
          enRiesgo: true,
          motivoRiesgo: 'ASISTENCIA',
          estado: 'EN_RIESGO',
        },
        expect.objectContaining({
          estudiante: 'Mamani, Luis',
          promedio: 30,
          porcentajeAsistencia: 100,
        }),
        expect.objectContaining({
          estudiante: 'Quispe, Ana',
          promedio: 90,
          porcentajeAsistencia: 100,
        }),
      ]);
    });

    it('debe permitir a la secretaria consultar el panel', async () => {
      const r = await panel('secretaria');
      expect(r.estudiantes).toHaveLength(3);
    });
  });

  describe('Criterio 2: marca "en riesgo" (decisión D6)', () => {
    it('debe marcar en riesgo por promedio al que tiene menos de 51 y dejar regular al resto', async () => {
      const { estudiantes } = await panel();
      expect(de(estudiantes, 0)).toMatchObject({ enRiesgo: false, estado: 'REGULAR' });
      expect(de(estudiantes, 1)).toMatchObject({ enRiesgo: true, motivoRiesgo: 'PROMEDIO' });
      expect(de(estudiantes, 2)).toMatchObject({ enRiesgo: true, motivoRiesgo: 'ASISTENCIA' });
    });

    it('debe resumir el curso por motivo de riesgo', async () => {
      const r = await panel();
      expect(r.resumen).toEqual({
        totalEstudiantes: 3,
        enRiesgoTotal: 2,
        enRiesgoPromedio: 1,
        enRiesgoAsistencia: 1,
        enRiesgoAmbos: 0,
        regulares: 1,
        pendientes: 0,
        promedioGeneral: 60,
        asistenciaGeneral: 86.7,
      });
    });

    it('debe usar el umbral de asistencia que configura el administrador para la gestión', async () => {
      const gestionId = e.t1.gestion.id;
      const r = await http()
        .put(`/api/gestiones/${gestionId}/umbral-asistencia`)
        .set(como('admin'))
        .send({ umbralAsistencia: 55.5 })
        .expect(200);
      expect(r.body).toEqual({ gestionId, umbralAsistencia: 55.5 });
      const conUmbral = await panel();
      expect(conUmbral.umbralAsistencia).toBe(55.5);
      expect(de(conUmbral.estudiantes, 2)).toMatchObject({ enRiesgo: false, estado: 'REGULAR' });
      await http()
        .put(`/api/gestiones/${gestionId}/umbral-asistencia`)
        .set(como('admin'))
        .send({ umbralAsistencia: 80 })
        .expect(200);
    });

    it('debe rechazar con 400 un umbral fuera de 0 a 100 o con más de un decimal', async () => {
      for (const umbralAsistencia of [-1, 100.5, 80.25, 'ochenta']) {
        await http()
          .put(`/api/gestiones/${e.t1.gestion.id}/umbral-asistencia`)
          .set(como('admin'))
          .send({ umbralAsistencia })
          .expect(400);
      }
    });

    it('debe responder 404 al cambiar el umbral de una gestión que no existe', async () => {
      await http()
        .put('/api/gestiones/9999/umbral-asistencia')
        .set(como('admin'))
        .send({ umbralAsistencia: 70 })
        .expect(404);
    });
  });

  describe('Trimestre del panel (decisión D18)', () => {
    it('debe usar el trimestre pedido: sin notas en él, el riesgo sale solo de la asistencia', async () => {
      const r = await panel('profesor', `?trimestreId=${e.t3.id}`);
      expect(r.trimestre).toEqual({ id: e.t3.id, numero: 3, cerrado: true });
      expect(r.estudiantes.map((f) => [f.promedio, f.motivoRiesgo])).toEqual([
        [null, 'ASISTENCIA'],
        [null, null],
        [null, null],
      ]);
    });

    it('debe responder 404 a un trimestre que no es de la gestión de la materia', async () => {
      await http()
        .get(`/api/materias/${e.matematica.id}/riesgo?trimestreId=9999`)
        .set(como('profesor'))
        .expect(404);
    });

    it('debe responder 404 a una materia que no existe', async () => {
      await http().get('/api/materias/9999/riesgo').set(como('profesor')).expect(404);
    });

    it('debe usar el último trimestre cuando todos están cerrados', async () => {
      await ds.query('UPDATE trimestres SET cerrado = true');
      const r = await panel();
      expect(r.trimestre).toMatchObject({ id: e.t3.id, numero: 3 });
      await ds.query('UPDATE trimestres SET cerrado = (numero = 3)');
    });
  });
});
