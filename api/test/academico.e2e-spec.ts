import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { DataSource } from 'typeorm';
import { Gestion } from '../src/database/entities';
import { crearApp, escenario, limpiar, token, type Escenario } from './utils';

/**
 * US-18 (T-016): gestión académica de la secretaria y consultas que usan las pantallas del profesor
 * (Mis materias, Materia y actividades) y de la institución (ADR-0010).
 */
describe('Gestión académica (US-18, T-016)', () => {
  let app: INestApplication;
  let ds: DataSource;
  let e: Escenario;
  let gestion: number;
  const tk: Record<string, string> = {};
  const http = () => request(app.getHttpServer());
  const como = (quien: string) => ({ Authorization: `Bearer ${tk[quien]}` });

  beforeAll(async () => {
    ({ app, ds } = await crearApp());
    await limpiar(ds);
    e = await escenario(ds);
    gestion = e.t1.gestion.id;
    for (const [k, email] of Object.entries({
      profesor: 'profe@ue.test',
      otro: 'otro@ue.test',
      secretaria: 'secre@ue.test',
      admin: 'admin@ue.test',
      padre: 'padre@ue.test',
    })) {
      tk[k] = await token(app, email);
    }
  });

  afterAll(() => app.close());

  describe('Mis materias del profesor (criterio 2)', () => {
    it('debe mostrar al profesor solo las materias que tiene asignadas, con su curso y gestión', async () => {
      const r = await http().get('/api/materias/mias').set(como('profesor')).expect(200);
      expect(r.body).toEqual([
        {
          id: e.matematica.id,
          nombre: 'Matemática',
          curso: { id: expect.any(Number), nombre: 'Secundaria 3.º «A»' },
          gestion: { id: gestion, anio: 2026 },
          profesor: { id: e.profesor.id, nombre: 'Ana Profesora' },
        },
      ]);
    });

    it('debe devolver la lista vacía al profesor sin materias', async () => {
      await ds.query('DELETE FROM asignaciones_materia WHERE profesor_id = $1', [
        e.otroProfesor.id,
      ]);
      const r = await http().get('/api/materias/mias').set(como('otro')).expect(200);
      expect(r.body).toEqual([]);
      await ds.query('INSERT INTO asignaciones_materia (materia_id, profesor_id) VALUES ($1, $2)', [
        e.lenguaje.id,
        e.otroProfesor.id,
      ]);
    });

    it('debe dar el detalle de una materia a su profesor y negarlo a otro profesor', async () => {
      const r = await http()
        .get(`/api/materias/${e.matematica.id}`)
        .set(como('profesor'))
        .expect(200);
      expect(r.body.curso.nombre).toBe('Secundaria 3.º «A»');
      await http().get(`/api/materias/${e.matematica.id}`).set(como('otro')).expect(403);
      await http().get('/api/materias/9999').set(como('secretaria')).expect(404);
    });
  });

  describe('Gestiones y trimestres', () => {
    it('debe listar las gestiones de la más reciente a la más antigua', async () => {
      await ds
        .getRepository(Gestion)
        .save({ anio: 2025, unidadEducativa: e.t1.gestion.unidadEducativa });
      const r = await http().get('/api/gestiones').set(como('profesor')).expect(200);
      expect((r.body as { anio: number }[]).map((g) => g.anio)).toEqual([2026, 2025]);
    });

    it('debe listar los trimestres con su estado de cierre (criterio 4)', async () => {
      const r = await http()
        .get(`/api/gestiones/${gestion}/trimestres`)
        .set(como('profesor'))
        .expect(200);
      expect(r.body).toEqual([
        { id: e.t1.id, numero: 1, cerrado: false },
        { id: expect.any(Number), numero: 2, cerrado: false },
        { id: e.t3.id, numero: 3, cerrado: true },
      ]);
      await http().get('/api/gestiones/9999/trimestres').set(como('profesor')).expect(404);
    });
  });

  describe('Actividades de una materia en un trimestre (pantalla Materia y actividades)', () => {
    it('debe listar las actividades con cuántas notas tienen sobre el total de estudiantes', async () => {
      await http()
        .post('/api/notas/planilla')
        .set(como('profesor'))
        .send({
          actividadId: e.actividades.saber1.id,
          notas: e.estudiantes.slice(0, 2).map((x) => ({ estudianteId: x.id, valor: 70 })),
        })
        .expect(201);
      const r = await http()
        .get('/api/notas/actividades')
        .query({ materiaId: e.matematica.id, trimestreId: e.t1.id })
        .set(como('profesor'))
        .expect(200);
      expect(r.body.estudiantes).toBe(3);
      const examen1 = (r.body.actividades as { id: number }[]).find(
        (a) => a.id === e.actividades.saber1.id,
      );
      expect(examen1).toEqual({
        id: e.actividades.saber1.id,
        nombre: 'Examen 1',
        dimension: { id: expect.any(Number), codigo: 'SABER', nombre: 'Saber' },
        notasRegistradas: 2,
      });
      expect((r.body.actividades as { nombre: string }[]).map((a) => a.nombre)).toEqual([
        'Participación',
        'Examen 1',
        'Examen 2',
        'Proyecto',
        'Autoevaluación',
      ]);
    });

    it('debe negar la lista a otro profesor y responder 404 si el trimestre es de otra gestión', async () => {
      const q = { materiaId: e.matematica.id, trimestreId: e.t1.id };
      await http().get('/api/notas/actividades').query(q).set(como('otro')).expect(403);
      await http()
        .get('/api/notas/actividades')
        .query({ ...q, trimestreId: 9999 })
        .set(como('profesor'))
        .expect(404);
      await http().get('/api/notas/actividades').set(como('profesor')).expect(400);
    });
  });

  describe('Cursos (criterio 1)', () => {
    let cursoId: number;

    it('debe permitir a la secretaria registrar un curso con nivel, año y paralelo en una gestión', async () => {
      const r = await http()
        .post('/api/cursos')
        .set(como('secretaria'))
        .send({ gestionId: gestion, nivel: 'PRIMARIA', anioEscolaridad: 1, paralelo: 'b' })
        .expect(201);
      cursoId = r.body.id;
      expect(r.body).toEqual({
        id: cursoId,
        gestion: { id: gestion, anio: 2026 },
        nivel: 'PRIMARIA',
        anioEscolaridad: 1,
        paralelo: 'B',
        nombre: 'Primaria 1.º «B»',
        estudiantes: 0,
        materias: 0,
      });
    });

    it('debe dejar el curso disponible para asignarle materias y estudiantes', async () => {
      await http()
        .post('/api/materias')
        .set(como('secretaria'))
        .send({ cursoId, nombre: 'Matemática', profesorId: e.profesor.id })
        .expect(201);
      await http()
        .post('/api/estudiantes')
        .set(como('secretaria'))
        .send({ cursoId, codigoRude: 'rude100001', nombres: 'Mia', apellidos: 'Flores' })
        .expect(201);
      const r = await http()
        .get('/api/cursos')
        .query({ gestionId: gestion })
        .set(como('secretaria'));
      expect((r.body as { id: number }[]).find((c) => c.id === cursoId)).toMatchObject({
        estudiantes: 1,
        materias: 1,
      });
    });

    it('debe rechazar un curso repetido en la misma gestión con un mensaje', async () => {
      const r = await http()
        .post('/api/cursos')
        .set(como('secretaria'))
        .send({ gestionId: gestion, nivel: 'PRIMARIA', anioEscolaridad: 1, paralelo: 'B' })
        .expect(409);
      expect(r.body.message).toBe('Ya existe el curso Primaria 1.º «B» en la gestión 2026');
    });

    it.each([
      ['un año fuera del nivel', { nivel: 'INICIAL', anioEscolaridad: 3, paralelo: 'A' }, 422],
      ['un paralelo inválido', { nivel: 'PRIMARIA', anioEscolaridad: 2, paralelo: 'A-1' }, 400],
      ['un nivel inexistente', { nivel: 'UNIVERSIDAD', anioEscolaridad: 1, paralelo: 'A' }, 400],
    ])('debe rechazar %s', async (_caso, datos, estado) => {
      await http()
        .post('/api/cursos')
        .set(como('secretaria'))
        .send({ gestionId: gestion, ...datos })
        .expect(estado);
    });

    it('debe filtrar los cursos por nivel', async () => {
      const r = await http()
        .get('/api/cursos')
        .query({ gestionId: gestion, nivel: 'SECUNDARIA' })
        .set(como('admin'))
        .expect(200);
      expect((r.body as { nombre: string }[]).map((c) => c.nombre)).toEqual([
        'Secundaria 3.º «A»',
        'Secundaria 3.º «B»',
      ]);
    });

    it('debe permitir corregir el paralelo y negar el borrado de un curso con estudiantes o materias', async () => {
      const r = await http()
        .put(`/api/cursos/${cursoId}`)
        .set(como('secretaria'))
        .send({ nivel: 'PRIMARIA', anioEscolaridad: 1, paralelo: 'C' })
        .expect(200);
      expect(r.body.nombre).toBe('Primaria 1.º «C»');
      const b = await http().delete(`/api/cursos/${cursoId}`).set(como('secretaria')).expect(422);
      expect(b.body.message).toBe(
        'El curso tiene 1 estudiante(s) y 1 materia(s): quítelos antes de borrarlo',
      );
    });

    it('debe borrar un curso vacío', async () => {
      const r = await http()
        .post('/api/cursos')
        .set(como('secretaria'))
        .send({ gestionId: gestion, nivel: 'INICIAL', anioEscolaridad: 2, paralelo: 'A' })
        .expect(201);
      await http().delete(`/api/cursos/${r.body.id}`).set(como('secretaria')).expect(204);
      await http().delete(`/api/cursos/${r.body.id}`).set(como('secretaria')).expect(404);
    });
  });

  describe('Estudiantes (criterio 3)', () => {
    it('debe registrar un estudiante con su código RUDE y su curso', async () => {
      const r = await http()
        .post('/api/estudiantes')
        .set(como('secretaria'))
        .send({
          cursoId: e.estudiantes[0].curso.id,
          codigoRude: ' rude200001 ',
          nombres: ' Sara ',
          apellidos: 'Apaza',
        })
        .expect(201);
      expect(r.body).toEqual({
        id: expect.any(Number),
        codigoRude: 'RUDE200001',
        nombres: 'Sara',
        apellidos: 'Apaza',
        curso: { id: e.estudiantes[0].curso.id, nombre: 'Secundaria 3.º «A»' },
        gestion: { id: gestion, anio: 2026 },
      });
    });

    it('debe rechazar con un mensaje al estudiante ya inscrito en otro curso de la misma gestión', async () => {
      const r = await http()
        .post('/api/estudiantes')
        .set(como('secretaria'))
        .send({
          cursoId: e.ajeno.curso.id,
          codigoRude: 'RUDE000001',
          nombres: 'Ana',
          apellidos: 'Quispe',
        })
        .expect(409);
      expect(r.body.message).toBe(
        'El estudiante con RUDE RUDE000001 ya está inscrito en Secundaria 3.º «A» en la gestión 2026',
      );
    });

    it('debe permitir el mismo RUDE en otra gestión (el estudiante pasa de año)', async () => {
      const g2025 = await ds.getRepository(Gestion).findOneByOrFail({ anio: 2025 });
      const curso = await http()
        .post('/api/cursos')
        .set(como('secretaria'))
        .send({ gestionId: g2025.id, nivel: 'SECUNDARIA', anioEscolaridad: 2, paralelo: 'A' })
        .expect(201);
      await http()
        .post('/api/estudiantes')
        .set(como('secretaria'))
        .send({
          cursoId: curso.body.id,
          codigoRude: 'RUDE000001',
          nombres: 'Ana',
          apellidos: 'Quispe',
        })
        .expect(201);
    });

    it('debe buscar por apellido sin distinguir mayúsculas y filtrar por curso', async () => {
      const r = await http()
        .get('/api/estudiantes')
        .query({ gestionId: gestion, apellido: 'QUIS' })
        .set(como('secretaria'))
        .expect(200);
      expect((r.body as { apellidos: string }[]).map((x) => x.apellidos)).toEqual(['Quispe']);
      const c = await http()
        .get('/api/estudiantes')
        .query({ cursoId: e.ajeno.curso.id })
        .set(como('secretaria'))
        .expect(200);
      expect((c.body as { nombres: string }[]).map((x) => x.nombres)).toEqual(['Otro']);
    });

    it('debe tratar los comodines de la búsqueda como texto', async () => {
      const r = await http()
        .get('/api/estudiantes')
        .query({ gestionId: gestion, apellido: '%' })
        .set(como('secretaria'))
        .expect(200);
      expect(r.body).toEqual([]);
    });

    it('debe permitir cambiar de curso dentro de la gestión solo si el estudiante no tiene notas', async () => {
      const sin = await http()
        .post('/api/estudiantes')
        .set(como('secretaria'))
        .send({
          cursoId: e.ajeno.curso.id,
          codigoRude: 'RUDE300001',
          nombres: 'Leo',
          apellidos: 'Vargas',
        })
        .expect(201);
      await http()
        .put(`/api/estudiantes/${sin.body.id}`)
        .set(como('secretaria'))
        .send({
          cursoId: e.estudiantes[0].curso.id,
          codigoRude: 'RUDE300001',
          nombres: 'Leo',
          apellidos: 'Vargas',
        })
        .expect(200);
      const con = await http()
        .put(`/api/estudiantes/${e.estudiantes[0].id}`)
        .set(como('secretaria'))
        .send({
          cursoId: e.ajeno.curso.id,
          codigoRude: 'RUDE000001',
          nombres: 'Ana',
          apellidos: 'Quispe',
        })
        .expect(422);
      expect(con.body.message).toBe(
        'El estudiante ya tiene notas en su curso: no se puede cambiar de curso',
      );
    });

    it('debe negar el cambio a un curso de otra gestión', async () => {
      const g2025 = await ds.getRepository(Gestion).findOneByOrFail({ anio: 2025 });
      const [curso] = await ds.query<{ id: number }[]>(
        'SELECT id FROM cursos WHERE gestion_id = $1',
        [g2025.id],
      );
      const r = await http()
        .put(`/api/estudiantes/${e.ajeno.id}`)
        .set(como('secretaria'))
        .send({ cursoId: curso.id, codigoRude: 'RUDE000004', nombres: 'Otro', apellidos: 'Curso' })
        .expect(422);
      expect(r.body.message).toBe('El curso nuevo es de otra gestión');
    });

    it('debe negar el borrado de un estudiante con notas y permitirlo sin historial', async () => {
      const r = await http()
        .delete(`/api/estudiantes/${e.estudiantes[0].id}`)
        .set(como('secretaria'))
        .expect(422);
      expect(r.body.message).toBe(
        'El estudiante ya tiene notas, asistencia o padres vinculados: no se puede borrar',
      );
      const nuevo = await http()
        .post('/api/estudiantes')
        .set(como('secretaria'))
        .send({
          cursoId: e.ajeno.curso.id,
          codigoRude: 'RUDE400001',
          nombres: 'Ema',
          apellidos: 'Ríos',
        })
        .expect(201);
      await http().delete(`/api/estudiantes/${nuevo.body.id}`).set(como('secretaria')).expect(204);
    });

    it.each([
      ['un RUDE con símbolos', { codigoRude: 'RUDE-01' }],
      ['un nombre vacío', { nombres: '   ' }],
    ])('debe rechazar con 400 %s', async (_caso, cambio) => {
      await http()
        .post('/api/estudiantes')
        .set(como('secretaria'))
        .send({
          cursoId: e.ajeno.curso.id,
          codigoRude: 'RUDE500001',
          nombres: 'A',
          apellidos: 'B',
          ...cambio,
        })
        .expect(400);
    });
  });

  describe('Materias y asignaciones', () => {
    let materiaId: number;

    it('debe listar los profesores activos para asignarlos', async () => {
      const r = await http().get('/api/profesores').set(como('secretaria')).expect(200);
      expect(r.body).toEqual([
        { id: e.profesor.id, nombre: 'Ana Profesora' },
        { id: e.otroProfesor.id, nombre: 'Luis Profesor' },
      ]);
    });

    it('debe crear una materia en un curso con su profesor', async () => {
      const r = await http()
        .post('/api/materias')
        .set(como('secretaria'))
        .send({ cursoId: e.ajeno.curso.id, nombre: ' Física ', profesorId: e.otroProfesor.id })
        .expect(201);
      materiaId = r.body.id;
      expect(r.body).toMatchObject({
        nombre: 'Física',
        curso: { id: e.ajeno.curso.id, nombre: 'Secundaria 3.º «B»' },
        profesor: { id: e.otroProfesor.id, nombre: 'Luis Profesor' },
      });
      const mias = await http().get('/api/materias/mias').set(como('otro')).expect(200);
      expect((mias.body as { nombre: string }[]).map((m) => m.nombre)).toContain('Física');
    });

    it('debe rechazar una materia repetida en el curso y un profesor que no lo es', async () => {
      const dup = await http()
        .post('/api/materias')
        .set(como('secretaria'))
        .send({ cursoId: e.ajeno.curso.id, nombre: 'Física', profesorId: e.profesor.id })
        .expect(409);
      expect(dup.body.message).toBe('El curso Secundaria 3.º «B» ya tiene la materia Física');
      const noProfe = await http()
        .post('/api/materias')
        .set(como('secretaria'))
        .send({ cursoId: e.ajeno.curso.id, nombre: 'Química', profesorId: e.secretaria.id })
        .expect(422);
      expect(noProfe.body.message).toBe('El usuario elegido no es un profesor activo');
    });

    it('debe reasignar la materia a otro profesor (una materia tiene un solo profesor)', async () => {
      const r = await http()
        .put(`/api/materias/${materiaId}`)
        .set(como('secretaria'))
        .send({ nombre: 'Física', profesorId: e.profesor.id })
        .expect(200);
      expect(r.body.profesor).toEqual({ id: e.profesor.id, nombre: 'Ana Profesora' });
      const [{ n }] = await ds.query<{ n: number }[]>(
        'SELECT count(*)::int AS n FROM asignaciones_materia WHERE materia_id = $1',
        [materiaId],
      );
      expect(n).toBe(1);
    });

    it('debe filtrar las materias por curso', async () => {
      const r = await http()
        .get('/api/materias')
        .query({ cursoId: e.estudiantes[0].curso.id })
        .set(como('secretaria'))
        .expect(200);
      expect((r.body as { nombre: string }[]).map((m) => m.nombre)).toEqual([
        'Lenguaje',
        'Matemática',
      ]);
    });

    it('debe negar el borrado de una materia con actividades y permitirlo sin ellas', async () => {
      const r = await http()
        .delete(`/api/materias/${e.matematica.id}`)
        .set(como('secretaria'))
        .expect(422);
      expect(r.body.message).toBe(
        'La materia ya tiene actividades registradas: no se puede borrar',
      );
      await http().delete(`/api/materias/${materiaId}`).set(como('secretaria')).expect(204);
    });
  });

  describe('Unidad educativa (criterio 5) y apariencia (ADR-0010)', () => {
    it('debe mostrar los datos de la institución sin iniciar sesión, para la pantalla de ingreso', async () => {
      const r = await http().get('/api/institucion').expect(200);
      expect(r.body).toEqual({
        nombre: 'U. E. de prueba',
        codigoSie: '80000001',
        colores: { marca: '#13283F', primario: '#1D4E89', acento: '#F2B33D' },
        logoVersion: null,
      });
      await http().get('/api/institucion/logo').expect(404);
    });

    it('debe permitir a la secretaria corregir el nombre y el código SIE', async () => {
      const r = await http()
        .put('/api/unidad-educativa')
        .set(como('secretaria'))
        .send({ nombre: 'U. E. Juana Azurduy', codigoSie: '80980123' })
        .expect(200);
      expect(r.body).toMatchObject({ nombre: 'U. E. Juana Azurduy', codigoSie: '80980123' });
      await http()
        .put('/api/unidad-educativa')
        .set(como('secretaria'))
        .send({ nombre: 'U. E. Juana Azurduy', codigoSie: '123' })
        .expect(400);
    });

    it('debe permitir al administrador cambiar los colores y rechazar los ilegibles', async () => {
      const r = await http()
        .put('/api/unidad-educativa/colores')
        .set(como('admin'))
        .send({ marca: '#2b1d0e', primario: '#7a2e0e', acento: '#e9c46a' })
        .expect(200);
      expect(r.body.colores).toEqual({ marca: '#2B1D0E', primario: '#7A2E0E', acento: '#E9C46A' });
      await http()
        .put('/api/unidad-educativa/colores')
        .set(como('admin'))
        .send({ marca: '#2B1D0E', primario: '#FFFF00', acento: '#E9C46A' })
        .expect(400);
      await http()
        .put('/api/unidad-educativa/colores')
        .set(como('secretaria'))
        .send({ marca: '#2B1D0E', primario: '#7A2E0E', acento: '#E9C46A' })
        .expect(403);
    });

    const png = Buffer.concat([
      Buffer.from('89504e470d0a1a0a', 'hex'),
      Buffer.from('0000000d49484452000000010000000108060000001f15c489', 'hex'),
    ]);

    it('debe guardar un logo PNG y servirlo con una versión nueva', async () => {
      await http()
        .put('/api/unidad-educativa/logo')
        .set(como('admin'))
        .attach('logo', png, 'logo.png')
        .expect(200);
      const inst = await http().get('/api/institucion').expect(200);
      expect(inst.body.logoVersion).toEqual(expect.any(Number));
      const logo = await http().get('/api/institucion/logo').expect(200);
      expect(logo.headers['content-type']).toBe('image/png');
      expect(logo.headers['x-content-type-options']).toBe('nosniff');
      expect(Buffer.compare(logo.body as Buffer, png)).toBe(0);
    });

    it('debe rechazar un logo que no es PNG, JPEG ni WebP aunque diga serlo', async () => {
      const r = await http()
        .put('/api/unidad-educativa/logo')
        .set(como('admin'))
        .attach('logo', Buffer.from('<svg onload="alert(1)"/>'), {
          filename: 'logo.png',
          contentType: 'image/png',
        })
        .expect(400);
      expect(r.body.message).toBe('El logo debe ser una imagen PNG, JPEG o WebP');
      await http().put('/api/unidad-educativa/logo').set(como('admin')).expect(400);
    });

    it('debe rechazar un logo de más de 256 KB', async () => {
      const grande = Buffer.concat([png, Buffer.alloc(300 * 1024)]);
      await http()
        .put('/api/unidad-educativa/logo')
        .set(como('admin'))
        .attach('logo', grande, 'logo.png')
        .expect(413);
    });

    it('debe quitar el logo y volver al predeterminado', async () => {
      await http().delete('/api/unidad-educativa/logo').set(como('admin')).expect(204);
      const inst = await http().get('/api/institucion').expect(200);
      expect(inst.body.logoVersion).toBeNull();
      await http().get('/api/institucion/logo').expect(404);
    });
  });
});
