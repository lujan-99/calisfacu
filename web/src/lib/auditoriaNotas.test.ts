import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as api from './api';
import {
  ejecutarCorreccionNota,
  obtenerAuditoriaLocal,
  obtenerCorreccionesActividad,
  obtenerHistorialNotaEstudiante,
} from './auditoriaNotas';

describe('Auditoría y corrección de notas (US-04, RNF-04, M15)', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('debe exigir el motivo de la corrección de forma obligatoria (US-04, criterio 1)', async () => {
    await expect(
      ejecutarCorreccionNota({
        actividadId: 10,
        estudianteId: 1,
        estudianteNombre: 'Condori, Juan',
        valorActual: 60,
        valorNuevo: 75,
        motivo: '   ',
        usuarioNombre: 'Ana Profesora',
      }),
    ).rejects.toThrow('El motivo de la corrección es obligatorio');
  });

  it('debe rechazar una nota fuera de la escala de 1 a 100', async () => {
    await expect(
      ejecutarCorreccionNota({
        actividadId: 10,
        estudianteId: 1,
        estudianteNombre: 'Condori, Juan',
        valorActual: 60,
        valorNuevo: 105,
        motivo: 'Error de transcripción',
        usuarioNombre: 'Ana Profesora',
      }),
    ).rejects.toThrow('La nota debe estar entre 1 y 100');

    await expect(
      ejecutarCorreccionNota({
        actividadId: 10,
        estudianteId: 1,
        estudianteNombre: 'Condori, Juan',
        valorActual: 60,
        valorNuevo: 0,
        motivo: 'Error de transcripción',
        usuarioNombre: 'Ana Profesora',
      }),
    ).rejects.toThrow('La nota debe estar entre 1 y 100');
  });

  it('debe rechazar una corrección donde el nuevo valor es idéntico al actual', async () => {
    await expect(
      ejecutarCorreccionNota({
        actividadId: 10,
        estudianteId: 1,
        estudianteNombre: 'Condori, Juan',
        valorActual: 80,
        valorNuevo: 80,
        motivo: 'Revisión sin cambios',
        usuarioNombre: 'Ana Profesora',
      }),
    ).rejects.toThrow('La nota nueva debe ser diferente a la nota actual');
  });

  it('debe registrar quién, cuándo, valor anterior, nuevo valor y motivo (US-04, criterio 1)', async () => {
    const { registro } = await ejecutarCorreccionNota({
      actividadId: 10,
      estudianteId: 1,
      estudianteNombre: 'Condori, Juan',
      valorActual: 60,
      valorNuevo: 85,
      motivo: 'Revisión formal de prueba escrita',
      usuarioNombre: 'Ana Profesora',
    });

    expect(registro).toMatchObject({
      actividadId: 10,
      estudianteId: 1,
      estudianteNombre: 'Condori, Juan',
      usuario: 'Ana Profesora',
      valorAnterior: 60,
      valorNuevo: 85,
      motivo: 'Revisión formal de prueba escrita',
      origen: 'CORRECCION',
    });
    expect(registro.id).toMatch(/^AUD-\d{4}-\d{3}$/);
    expect(new Date(registro.fecha).getTime()).not.toBeNaN();

    const guardados = obtenerAuditoriaLocal();
    expect(guardados).toHaveLength(1);
    expect(guardados[0].id).toBe(registro.id);
  });

  it('debe invocar a la API de corrección cuando se provee el notaId', async () => {
    const patch = vi.spyOn(api, 'corregirNota').mockResolvedValue({
      notaId: 44,
      valorAnterior: 50,
      valorNuevo: 70,
    });

    const resultado = await ejecutarCorreccionNota({
      actividadId: 10,
      estudianteId: 2,
      estudianteNombre: 'Mamani, Carlos',
      notaId: 44,
      valorActual: 50,
      valorNuevo: 70,
      motivo: 'Transcripción corregida',
      usuarioNombre: 'Ana Profesora',
    });

    expect(patch).toHaveBeenCalledWith(44, {
      valor: 70,
      motivo: 'Transcripción corregida',
    });
    expect(resultado.resultadoApi).toEqual({
      notaId: 44,
      valorAnterior: 50,
      valorNuevo: 70,
    });
  });

  it('debe consultar el historial de la API si existe notaId y tiene registros', async () => {
    vi.spyOn(api, 'historialNota').mockResolvedValue([
      {
        fecha: '2026-10-20T10:00:00.000Z',
        usuario: 'Ana Profesora',
        valorAnterior: null,
        valorNuevo: 60,
        motivo: null,
        origen: 'REGISTRO',
      },
      {
        fecha: '2026-10-20T12:00:00.000Z',
        usuario: 'Ana Profesora',
        valorAnterior: 60,
        valorNuevo: 75,
        motivo: 'Corrección aprobada',
        origen: 'CORRECCION',
      },
    ]);

    const historial = await obtenerHistorialNotaEstudiante(10, 1, 99);
    expect(historial).toHaveLength(2);
    expect(historial[0].origen).toBe('REGISTRO');
    expect(historial[1].valorNuevo).toBe(75);
  });

  it('debe listar todas las correcciones auditadas de una actividad', async () => {
    await ejecutarCorreccionNota({
      actividadId: 10,
      estudianteId: 1,
      estudianteNombre: 'Condori, Juan',
      valorActual: 60,
      valorNuevo: 80,
      motivo: 'Motivo 1',
      usuarioNombre: 'Ana',
    });
    await ejecutarCorreccionNota({
      actividadId: 10,
      estudianteId: 2,
      estudianteNombre: 'Mamani, Carlos',
      valorActual: 50,
      valorNuevo: 65,
      motivo: 'Motivo 2',
      usuarioNombre: 'Ana',
    });
    await ejecutarCorreccionNota({
      actividadId: 11,
      estudianteId: 3,
      estudianteNombre: 'Flores, Daniela',
      valorActual: 70,
      valorNuevo: 90,
      motivo: 'Otra actividad',
      usuarioNombre: 'Ana',
    });

    const correccionesAct10 = obtenerCorreccionesActividad(10);
    expect(correccionesAct10).toHaveLength(2);
    expect(correccionesAct10[0].estudianteNombre).toBe('Condori, Juan');
    expect(correccionesAct10[1].estudianteNombre).toBe('Mamani, Carlos');
  });
});
