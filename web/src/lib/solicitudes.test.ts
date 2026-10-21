import { describe, expect, it } from 'vitest';
import type { SolicitudEdicion } from './api';
import { estadoEdicion, puedePedirEdicion } from './solicitudes';

const solicitud = (
  id: number,
  estado: SolicitudEdicion['estado'],
  estudiantes: { estudianteId: number; usada?: boolean }[],
  observacionAdmin: string | null = null,
): SolicitudEdicion => ({
  id,
  profesorId: 1,
  profesorNombre: 'Ana',
  actividadId: 5,
  actividadNombre: 'Examen',
  materiaId: 7,
  materiaNombre: 'Matemática',
  cursoNombre: 'Secundaria 4.º «A»',
  dimension: 'Saber',
  estudiantes: estudiantes.map((e) => ({
    estudianteId: e.estudianteId,
    estudianteNombre: 'X',
    notaActual: 70,
    usada: e.usada ?? false,
  })),
  motivo: 'm',
  fechaSolicitud: '2026-10-20T10:00:00Z',
  estado,
  fechaResolucion: null,
  observacionAdmin,
});

describe('estadoEdicion (decisión D16)', () => {
  it('debe dejar bloqueada la nota sin solicitudes', () => {
    expect(estadoEdicion([], 1)).toEqual({ tipo: 'BLOQUEADA' });
    expect(puedePedirEdicion(estadoEdicion([], 1))).toBe(true);
  });

  it('debe mostrar pendiente y no permitir pedir otra', () => {
    const e = estadoEdicion([solicitud(3, 'PENDIENTE', [{ estudianteId: 1 }])], 1);
    expect(e).toEqual({ tipo: 'PENDIENTE', solicitudId: 3 });
    expect(puedePedirEdicion(e)).toBe(false);
  });

  it('debe habilitar la edición con una aprobación sin usar y bloquearla cuando ya se usó', () => {
    expect(estadoEdicion([solicitud(3, 'APROBADA', [{ estudianteId: 1 }])], 1)).toEqual({
      tipo: 'HABILITADA',
      solicitudId: 3,
    });
    expect(
      estadoEdicion([solicitud(3, 'APROBADA', [{ estudianteId: 1, usada: true }])], 1),
    ).toEqual({ tipo: 'BLOQUEADA' });
  });

  it('debe tomar la solicitud más reciente y mostrar la observación del rechazo', () => {
    const e = estadoEdicion(
      [
        solicitud(3, 'APROBADA', [{ estudianteId: 1, usada: true }]),
        solicitud(8, 'RECHAZADA', [{ estudianteId: 1 }], 'Falta la hoja'),
        solicitud(9, 'PENDIENTE', [{ estudianteId: 2 }]),
      ],
      1,
    );
    expect(e).toEqual({ tipo: 'RECHAZADA', solicitudId: 8, observacion: 'Falta la hoja' });
    expect(puedePedirEdicion(e)).toBe(true);
  });
});
