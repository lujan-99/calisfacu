import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  aprobarSolicitud,
  crearSolicitud,
  marcarEdicionConsumida,
  obtenerEstadoEdicionEstudiante,
  obtenerSolicitudes,
  rechazarSolicitud,
} from './solicitudesEdicion';

describe('Sistema de Tickets de Edición de Notas (US-04)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('debe crear una solicitud de edición con estado PENDIENTE y correlativo oficial', () => {
    const solicitud = crearSolicitud({
      profesorId: 10,
      profesorNombre: 'Rosa Mamani Condori',
      actividadId: 5,
      actividadNombre: 'Examen Trimestral',
      materiaNombre: 'Matemática',
      cursoNombre: 'Secundaria 4.º «A»',
      dimension: 'Saber',
      estudiantes: [
        { estudianteId: 1, estudianteNombre: 'Apaza Miguel', notaActual: 45 },
        { estudianteId: 2, estudianteNombre: 'Choque Rosa', notaActual: 60 },
      ],
      motivo: 'Error de transcripción verificado con la prueba escrita',
    });

    expect(solicitud.id).toMatch(/^TCK-\d{4}-001$/);
    expect(solicitud.estado).toBe('PENDIENTE');
    expect(solicitud.estudiantes).toHaveLength(2);

    const todas = obtenerSolicitudes();
    expect(todas).toHaveLength(1);
    expect(todas[0].id).toBe(solicitud.id);

    const estadoMiguel = obtenerEstadoEdicionEstudiante(5, 1);
    expect(estadoMiguel.habilitada).toBe(false);
    expect(estadoMiguel.ticket?.id).toBe(solicitud.id);
  });

  it('debe habilitar la edición de notas al aprobar la solicitud', () => {
    const sol = crearSolicitud({
      profesorId: 10,
      profesorNombre: 'Rosa Mamani',
      actividadId: 8,
      actividadNombre: 'Práctica 1',
      materiaNombre: 'Física',
      cursoNombre: 'Secundaria 4.º «A»',
      dimension: 'Hacer',
      estudiantes: [{ estudianteId: 99, estudianteNombre: 'Torrez Luis', notaActual: 30 }],
      motivo: 'Revisión fundada de proyecto experimental',
    });

    expect(obtenerEstadoEdicionEstudiante(8, 99).habilitada).toBe(false);

    aprobarSolicitud(sol.id, 'Autorizado por Dirección');

    const estado = obtenerEstadoEdicionEstudiante(8, 99);
    expect(estado.habilitada).toBe(true);
    expect(estado.ticket?.estado).toBe('APROBADA');
    expect(estado.ticket?.observacionAdmin).toBe('Autorizado por Dirección');
  });

  it('debe registrar el motivo de rechazo al denegar la solicitud', () => {
    const sol = crearSolicitud({
      profesorId: 10,
      profesorNombre: 'Rosa Mamani',
      actividadId: 8,
      actividadNombre: 'Práctica 1',
      materiaNombre: 'Física',
      cursoNombre: 'Secundaria 4.º «A»',
      dimension: 'Hacer',
      estudiantes: [{ estudianteId: 99, estudianteNombre: 'Torrez Luis', notaActual: 30 }],
      motivo: 'Solicitud extemporánea sin justificativo',
    });

    rechazarSolicitud(sol.id, 'Plazo vencido de acuerdo a la reglamentación interna');

    const estado = obtenerEstadoEdicionEstudiante(8, 99);
    expect(estado.habilitada).toBe(false);
    expect(estado.ticket?.estado).toBe('RECHAZADA');
    expect(estado.ticket?.observacionAdmin).toContain('Plazo vencido');
  });

  it('debe marcar la edición como consumida al guardar la corrección', () => {
    const sol = crearSolicitud({
      profesorId: 10,
      profesorNombre: 'Rosa Mamani',
      actividadId: 12,
      actividadNombre: 'Examen',
      materiaNombre: 'Química',
      cursoNombre: 'Secundaria 4.º «A»',
      dimension: 'Saber',
      estudiantes: [{ estudianteId: 44, estudianteNombre: 'Vargas Carlos', notaActual: 50 }],
      motivo: 'Recálculo de puntaje',
    });

    aprobarSolicitud(sol.id);
    marcarEdicionConsumida(12, 44);

    const todas = obtenerSolicitudes();
    expect(todas[0].observacionAdmin).toContain('Edición completada y guardada');
  });
});
