import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { DataSource } from 'typeorm';
import { Nota, RegistroAuditoria } from '../src/database/entities';
import { crearApp, escenario, limpiar, token, type Escenario } from './utils';

/** M15: el 100 % de los cambios de nota quedan con registro de auditoría completo (US-04). */
describe('Corrección auditable de notas (US-04, M15)', () => {
  let app: INestApplication;
  let ds: DataSource;
  let e: Escenario;
  let tk: string;
  let notaId: number;
  const http = () => request(app.getHttpServer());

  beforeAll(async () => {
    ({ app, ds } = await crearApp());
    await limpiar(ds);
    e = await escenario(ds);
    tk = await token(app, 'profe@ue.test');
    await http()
      .post('/api/notas/planilla')
      .set('Authorization', `Bearer ${tk}`)
      .send({
        actividadId: e.actividades.saber1.id,
        notas: [{ estudianteId: e.estudiantes[0].id, valor: 60 }],
      })
      .expect(201);
    notaId = (await ds.getRepository(Nota).findOneByOrFail({})).id;
  });

  afterAll(() => app.close());

  it('debe registrar la nota nueva en la auditoría con origen REGISTRO', async () => {
    const registros = await ds
      .getRepository(RegistroAuditoria)
      .find({ relations: { usuario: true } });
    expect(registros).toHaveLength(1);
    expect(registros[0]).toMatchObject({ valorAnterior: null, valorNuevo: 60, origen: 'REGISTRO' });
    expect(registros[0].usuario.id).toBe(e.profesor.id);
  });

  it('debe exigir el motivo de la corrección', async () => {
    await http()
      .patch(`/api/notas/${notaId}/correccion`)
      .set('Authorization', `Bearer ${tk}`)
      .send({ valor: 75 })
      .expect(400);
    await http()
      .patch(`/api/notas/${notaId}/correccion`)
      .set('Authorization', `Bearer ${tk}`)
      .send({ valor: 75, motivo: '' })
      .expect(400);
  });

  it('debe guardar quién, cuándo, valor anterior, valor nuevo y motivo', async () => {
    await http()
      .patch(`/api/notas/${notaId}/correccion`)
      .set('Authorization', `Bearer ${tk}`)
      .send({ valor: 75, motivo: 'Error de transcripción' })
      .expect(200, { notaId, valorAnterior: 60, valorNuevo: 75 });

    const r = await http()
      .get(`/api/notas/${notaId}/historial`)
      .set('Authorization', `Bearer ${tk}`)
      .expect(200);
    expect(r.body).toHaveLength(2);
    expect(r.body[1]).toMatchObject({
      usuario: 'Ana Profesora',
      valorAnterior: 60,
      valorNuevo: 75,
      motivo: 'Error de transcripción',
      origen: 'CORRECCION',
    });
    expect(new Date(r.body[1].fecha).getTime()).not.toBeNaN();
    expect((await ds.getRepository(Nota).findOneByOrFail({ id: notaId })).valor).toBe(75);
  });

  it('debe rechazar una corrección que no cambia el valor', async () => {
    await http()
      .patch(`/api/notas/${notaId}/correccion`)
      .set('Authorization', `Bearer ${tk}`)
      .send({ valor: 75, motivo: 'x' })
      .expect(422);
  });

  it('debe responder 404 al corregir una nota inexistente', async () => {
    await http()
      .patch('/api/notas/9999/correccion')
      .set('Authorization', `Bearer ${tk}`)
      .send({ valor: 70, motivo: 'x' })
      .expect(404);
  });

  it('debe impedir modificar o borrar el registro de auditoría aun desde la base (US-04, criterio 2)', async () => {
    await expect(
      ds.query('UPDATE registros_auditoria SET motivo = $1', ['alterado']),
    ).rejects.toThrow('solo inserción');
    await expect(ds.query('DELETE FROM registros_auditoria')).rejects.toThrow('solo inserción');
    expect(await ds.getRepository(RegistroAuditoria).count()).toBe(2);
  });

  it('debe permitir al administrador ver el historial', async () => {
    const admin = await token(app, 'admin@ue.test');
    await http()
      .get(`/api/notas/${notaId}/historial`)
      .set('Authorization', `Bearer ${admin}`)
      .expect(200);
  });
});
