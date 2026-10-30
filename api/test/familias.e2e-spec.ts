import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { DataSource } from 'typeorm';
import { Rol, Usuario, VinculoPadre } from '../src/database/entities';
import { AuthService } from '../src/modules/auth/auth.service';
import { CONTRASENA, crearApp, escenario, limpiar, token, type Escenario } from './utils';

/**
 * US-20 (T-048): la secretaria vincula a cada padre con sus hijos y el padre ve solo a esos estudiantes
 * (decisión D17). El escenario ya vincula a padre@ue.test con e.estudiantes[0].
 */
describe('Vinculación padre–estudiante (US-20, T-048)', () => {
  let app: INestApplication;
  let ds: DataSource;
  let e: Escenario;
  let otraMadre: Usuario;
  const tk: Record<string, string> = {};
  const http = () => request(app.getHttpServer());
  const como = (quien: string) => ({ Authorization: `Bearer ${tk[quien]}` });

  beforeAll(async () => {
    ({ app, ds } = await crearApp());
    await limpiar(ds);
    e = await escenario(ds);
    const hash = await AuthService.hash(CONTRASENA);
    otraMadre = await ds.getRepository(Usuario).save({
      email: 'madre@ue.test',
      rol: Rol.PADRE,
      nombre: 'María Madre',
      hashContrasena: hash,
    });
    await ds.getRepository(Usuario).save({
      email: 'inactivo@ue.test',
      rol: Rol.PADRE,
      nombre: 'Pedro Inactivo',
      hashContrasena: hash,
      activo: false,
    });
    for (const [k, email] of Object.entries({
      secretaria: 'secre@ue.test',
      padre: 'padre@ue.test',
      madre: 'madre@ue.test',
    })) {
      tk[k] = await token(app, email);
    }
  });

  afterAll(() => app.close());

  describe('Gestión de vínculos de la secretaria', () => {
    it('debe listar solo a los padres de familia activos', async () => {
      const r = await http().get('/api/padres').set(como('secretaria')).expect(200);
      expect(r.body).toEqual([
        { id: e.padre.id, nombre: 'Juan Padre', email: 'padre@ue.test' },
        { id: otraMadre.id, nombre: 'María Madre', email: 'madre@ue.test' },
      ]);
    });

    it('debe vincular a un padre con un estudiante y devolver el vínculo con su parentesco', async () => {
      const r = await http()
        .post('/api/vinculos-familiares')
        .set(como('secretaria'))
        .send({ padreId: otraMadre.id, estudianteId: e.estudiantes[1].id, parentesco: 'MADRE' })
        .expect(201);
      expect(r.body).toEqual({
        padreId: otraMadre.id,
        estudianteId: e.estudiantes[1].id,
        parentesco: 'MADRE',
        creadoEn: expect.any(String),
        padre: { id: otraMadre.id, nombre: 'María Madre', email: 'madre@ue.test' },
        estudiante: expect.objectContaining({
          id: e.estudiantes[1].id,
          codigoRude: 'RUDE000002',
          curso: expect.objectContaining({ nombre: 'Secundaria 3.º «A»' }),
        }),
      });
    });

    it('debe permitir que un estudiante tenga más de un padre o tutor', async () => {
      await http()
        .post('/api/vinculos-familiares')
        .set(como('secretaria'))
        .send({ padreId: otraMadre.id, estudianteId: e.estudiantes[0].id })
        .expect(201);
      const r = await http()
        .get(`/api/vinculos-familiares?estudianteId=${e.estudiantes[0].id}`)
        .set(como('secretaria'))
        .expect(200);
      expect((r.body as VinculoPadre[]).map((v) => [v.padreId, v.parentesco])).toEqual([
        [e.padre.id, 'PADRE'],
        [otraMadre.id, 'PADRE'],
      ]);
    });

    it('debe listar los vínculos de la gestión más reciente y filtrar por curso y por padre', async () => {
      const todos = await http()
        .get('/api/vinculos-familiares')
        .set(como('secretaria'))
        .expect(200);
      expect(todos.body).toHaveLength(3);
      const deLaMadre = await http()
        .get(`/api/vinculos-familiares?padreId=${otraMadre.id}`)
        .set(como('secretaria'))
        .expect(200);
      expect((deLaMadre.body as VinculoPadre[]).map((v) => v.estudianteId).sort()).toEqual(
        [e.estudiantes[0].id, e.estudiantes[1].id].sort(),
      );
      const otroCurso = await http()
        .get(`/api/vinculos-familiares?cursoId=${e.ajeno.curso.id}`)
        .set(como('secretaria'))
        .expect(200);
      expect(otroCurso.body).toEqual([]);
    });

    it('debe rechazar con 409 un vínculo repetido', async () => {
      const r = await http()
        .post('/api/vinculos-familiares')
        .set(como('secretaria'))
        .send({ padreId: e.padre.id, estudianteId: e.estudiantes[0].id })
        .expect(409);
      expect(r.body.message).toBe('El estudiante ya está vinculado a este padre de familia');
    });

    it('debe rechazar con 422 una cuenta que no es de padre de familia o está inactiva', async () => {
      const inactivo = await ds
        .getRepository(Usuario)
        .findOneByOrFail({ email: 'inactivo@ue.test' });
      for (const padreId of [e.profesor.id, inactivo.id]) {
        await http()
          .post('/api/vinculos-familiares')
          .set(como('secretaria'))
          .send({ padreId, estudianteId: e.estudiantes[2].id })
          .expect(422);
      }
    });

    it('debe responder 404 si el padre o el estudiante no existen', async () => {
      await http()
        .post('/api/vinculos-familiares')
        .set(como('secretaria'))
        .send({ padreId: 9999, estudianteId: e.estudiantes[2].id })
        .expect(404);
      await http()
        .post('/api/vinculos-familiares')
        .set(como('secretaria'))
        .send({ padreId: e.padre.id, estudianteId: 9999 })
        .expect(404);
    });

    it('debe rechazar con 400 un parentesco que no está en la lista', async () => {
      await http()
        .post('/api/vinculos-familiares')
        .set(como('secretaria'))
        .send({ padreId: e.padre.id, estudianteId: e.estudiantes[2].id, parentesco: 'VECINO' })
        .expect(400);
    });

    it('debe quitar un vínculo y responder 404 si ya no existe', async () => {
      const url = `/api/vinculos-familiares/${otraMadre.id}/${e.estudiantes[0].id}`;
      await http().delete(url).set(como('secretaria')).expect(204);
      await http().delete(url).set(como('secretaria')).expect(404);
    });
  });

  describe('El padre ve solo a sus hijos (criterio 1)', () => {
    it('debe mostrar al padre únicamente a los estudiantes vinculados', async () => {
      const r = await http().get('/api/padre/hijos').set(como('padre')).expect(200);
      expect(r.body).toEqual([
        {
          id: e.estudiantes[0].id,
          codigoRude: 'RUDE000001',
          ci: null,
          nombres: 'Ana',
          apellidos: 'Quispe',
          curso: {
            id: expect.any(Number),
            nombre: 'Secundaria 3.º «A»',
            nivel: 'SECUNDARIA',
            anioEscolaridad: 3,
            paralelo: 'A',
          },
          gestion: { id: e.t1.gestion.id, anio: 2026 },
        },
      ]);
    });

    it('debe mostrar a la madre el hijo que se le vinculó después', async () => {
      const r = await http().get('/api/padre/hijos').set(como('madre')).expect(200);
      expect((r.body as { id: number }[]).map((h) => h.id)).toEqual([e.estudiantes[1].id]);
    });

    it('debe devolver el detalle de un hijo vinculado', async () => {
      const r = await http()
        .get(`/api/padre/hijos/${e.estudiantes[0].id}`)
        .set(como('padre'))
        .expect(200);
      expect(r.body).toMatchObject({ id: e.estudiantes[0].id, nombres: 'Ana' });
    });
  });

  describe('Guard de pertenencia (criterio 2)', () => {
    it('debe responder 403 al padre que cambia el ID por el de un estudiante no vinculado', async () => {
      for (const otro of [e.estudiantes[1], e.estudiantes[2], e.ajeno]) {
        const r = await http().get(`/api/padre/hijos/${otro.id}`).set(como('padre')).expect(403);
        expect(r.body.message).toBe('Usted no está vinculado a este estudiante');
      }
    });

    it('debe responder 403, no 404, a un ID que no existe, para no revelar qué estudiantes hay', async () => {
      await http().get('/api/padre/hijos/9999').set(como('padre')).expect(403);
    });

    it('debe responder 403 cuando la secretaria quita el vínculo', async () => {
      await http()
        .delete(`/api/vinculos-familiares/${otraMadre.id}/${e.estudiantes[1].id}`)
        .set(como('secretaria'))
        .expect(204);
      await http().get(`/api/padre/hijos/${e.estudiantes[1].id}`).set(como('madre')).expect(403);
      const r = await http().get('/api/padre/hijos').set(como('madre')).expect(200);
      expect(r.body).toEqual([]);
    });
  });
});
