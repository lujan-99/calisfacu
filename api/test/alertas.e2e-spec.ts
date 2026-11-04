import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { DataSource } from 'typeorm';
import { AlertaPromedio, Nota } from '../src/database/entities';
import { crearApp, escenario, habilitarCorreccion, limpiar, token, type Escenario } from './utils';

interface Alerta {
  id: number;
  estudianteNombre: string;
  materiaNombre: string;
  trimestreNumero: number;
  promedioAnterior: number | null;
  promedioNuevo: number;
  estado: string;
  vigente: boolean;
  leida: boolean;
  tutor?: { nombre: string; parentesco: string; email: string };
  notaAtencion?: string;
}

/** US-08 (T-060): alertas de promedio bajo al recalcular, contra PostgreSQL real (decisión D22). */
describe('Alertas de promedio bajo (US-08)', () => {
  let app: INestApplication;
  let ds: DataSource;
  let e: Escenario;
  const tk: Record<string, string> = {};
  const http = () => request(app.getHttpServer());
  const actividades = ['ser', 'saber1', 'saber2', 'hacer', 'auto'] as const;
  const alertas = async (quien = 'profesor') =>
    (
      await http()
        .get('/api/notificaciones/alertas')
        .set('Authorization', `Bearer ${tk[quien]}`)
        .expect(200)
    ).body as Alerta[];
  /** Corrige la nota del estudiante en la actividad con su solicitud aprobada (D16). */
  const corregir = async (actividad: (typeof actividades)[number], i: number, valor: number) => {
    const estudiante = e.estudiantes[i];
    await habilitarCorreccion(ds, e, e.actividades[actividad].id, estudiante.id);
    const nota = await ds.getRepository(Nota).findOneByOrFail({
      actividad: { id: e.actividades[actividad].id },
      estudiante: { id: estudiante.id },
    });
    await http()
      .patch(`/api/notas/${nota.id}/correccion`)
      .set('Authorization', `Bearer ${tk.profesor}`)
      .send({ valor, motivo: 'Revisión del examen' })
      .expect(200);
  };

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
  });

  afterAll(() => app.close());

  it('debe avisar al profesor cuando una nota deja al estudiante por debajo de 51 (criterio 1)', async () => {
    // Nota igual en todas las actividades: la nota trimestral es ese valor (Ana 40, Luis 90, Eva 60).
    const valores = [40, 90, 60];
    for (const a of actividades) {
      await http()
        .post('/api/notas/planilla')
        .set('Authorization', `Bearer ${tk.profesor}`)
        .send({
          actividadId: e.actividades[a].id,
          notas: e.estudiantes.map((est, i) => ({ estudianteId: est.id, valor: valores[i] })),
        })
        .expect(201);
      // Mientras falta alguna dimensión no hay nota trimestral (D4) ni alerta.
      if (a !== 'auto') expect(await alertas()).toEqual([]);
    }
    const lista = await alertas();
    expect(lista).toHaveLength(1);
    expect(lista[0]).toMatchObject({
      estudianteNombre: 'Quispe, Ana',
      materiaNombre: 'Matemática',
      trimestreNumero: 1,
      promedioAnterior: null,
      promedioNuevo: 40,
      estado: 'ACTIVA',
      vigente: true,
      leida: false,
      // El padre del escenario está vinculado a Ana: el profesor ve a quién contactar.
      tutor: { nombre: 'Juan Padre', parentesco: 'PADRE', email: 'padre@ue.test' },
    });
  });

  it('debe avisar con la nota anterior cuando un aprobado cae por debajo de 51 (criterio 1)', async () => {
    // Eva: Saber pasa de (60 + 60)/2 a (1 + 60)/2 → 6 + 13,725 + 24 + 3 = 46,725 → 47.
    await corregir('saber1', 2, 1);
    const eva = (await alertas()).find((a) => a.estudianteNombre === 'Condori, Eva');
    expect(eva).toMatchObject({ promedioAnterior: 60, promedioNuevo: 47, vigente: true });
  });

  it('debe no repetir la alerta mientras el promedio sigue por debajo de 51 (criterio 2)', async () => {
    await corregir('ser', 0, 45);
    await corregir('saber2', 2, 30);
    const lista = await alertas();
    expect(lista).toHaveLength(2);
    expect(await ds.getRepository(AlertaPromedio).count()).toBe(2);
  });

  it('debe volver a avisar solo después de que el estudiante supere el mínimo', async () => {
    // Ana: Hacer 40 → 100 la deja en 4,5 + 18 + 40 + 2 = 64,5 → 65: la alerta se supera.
    await corregir('hacer', 0, 100);
    let ana = (await alertas()).filter((a) => a.estudianteNombre === 'Quispe, Ana');
    expect(ana).toHaveLength(1);
    expect(ana[0].vigente).toBe(false);
    // Vuelve a caer: alerta nueva, con la nota anterior.
    await corregir('hacer', 0, 1);
    ana = (await alertas()).filter((a) => a.estudianteNombre === 'Quispe, Ana');
    expect(ana).toHaveLength(2);
    expect(ana[0]).toMatchObject({ vigente: true, promedioAnterior: 65, promedioNuevo: 25 });
  });

  it('debe dejar al profesor marcar la alerta como leída y atenderla', async () => {
    const [alerta] = await alertas();
    await http()
      .patch(`/api/notificaciones/alertas/${alerta.id}/leer`)
      .set('Authorization', `Bearer ${tk.otro}`)
      .expect(403);
    await http()
      .patch(`/api/notificaciones/alertas/${alerta.id}/leer`)
      .set('Authorization', `Bearer ${tk.profesor}`)
      .expect(204);
    expect((await alertas()).find((a) => a.id === alerta.id)?.leida).toBe(true);

    const vacia = await http()
      .post(`/api/notificaciones/alertas/${alerta.id}/atender`)
      .set('Authorization', `Bearer ${tk.profesor}`)
      .send({ notaAtencion: '' })
      .expect(400);
    expect((vacia.body as { message: string[] }).message).toContain(
      'Escriba qué hizo con la alerta',
    );
    const r = await http()
      .post(`/api/notificaciones/alertas/${alerta.id}/atender`)
      .set('Authorization', `Bearer ${tk.profesor}`)
      .send({ notaAtencion: '  Se habló con el padre por teléfono.  ' })
      .expect(200);
    expect(r.body).toMatchObject({
      id: alerta.id,
      estado: 'ATENDIDA',
      notaAtencion: 'Se habló con el padre por teléfono.',
    });
    await http()
      .post(`/api/notificaciones/alertas/${alerta.id}/atender`)
      .set('Authorization', `Bearer ${tk.profesor}`)
      .send({ notaAtencion: 'Otra vez' })
      .expect(409);
  });

  it('debe mostrar a cada profesor solo las alertas de sus materias', async () => {
    expect(await alertas('otro')).toEqual([]);
    expect(await alertas('secretaria')).toHaveLength(3);
    await http()
      .get(`/api/notificaciones/alertas?materiaId=${e.matematica.id}`)
      .set('Authorization', `Bearer ${tk.otro}`)
      .expect(403);
    await http()
      .patch('/api/notificaciones/alertas/99999/leer')
      .set('Authorization', `Bearer ${tk.profesor}`)
      .expect(404);
  });
});
