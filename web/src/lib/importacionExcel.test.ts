import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as api from './api';
import {
  confirmarImportacionNotas,
  generarPlantillaCsv,
  procesarTextoImportacion,
} from './importacionExcel';

describe('Importación de notas desde Excel (US-05, T-039)', () => {
  const planillaMock: api.Planilla = {
    actividad: {
      id: 10,
      nombre: 'Examen Trimestral',
      dimension: 'Saber',
      materia: 'Matemática',
      materiaId: 7,
      curso: 'Secundaria 4.º «A»',
      trimestre: { id: 21, numero: 1, cerrado: false },
    },
    filas: [
      { estudianteId: 1, estudiante: 'Apaza Condori, Miguel', valor: null },
      { estudianteId: 2, estudiante: 'Choque Huanca, Rosa', valor: null },
      { estudianteId: 3, estudiante: 'Flores Quispe, Daniela', valor: null },
    ],
  };

  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('debe generar vista previa identificando filas válidas y con error (US-05, criterio 1)', () => {
    const csv = `
Apellidos y Nombres,Nota
Apaza Condori, Miguel,85
Choque Huanca, Rosa,120
Estudiante Inexistente,70
Flores Quispe, Daniela,75.5
`;
    const vista = procesarTextoImportacion(csv, planillaMock);

    expect(vista.resumen.total).toBe(4);
    expect(vista.resumen.validas).toBe(2); // Apaza (85) y Flores (75.5)
    expect(vista.resumen.errores).toBe(2); // Choque (>100) y Estudiante Inexistente

    expect(vista.filasValidas[0].estudiante).toBe('Apaza Condori, Miguel');
    expect(vista.filasValidas[0].valor).toBe(85);
    expect(vista.filasValidas[1].estudiante).toBe('Flores Quispe, Daniela');
    expect(vista.filasValidas[1].valor).toBe(75.5);
  });

  it('debe rechazar un estudiante que no pertenece al curso con su motivo (US-05, criterio 2)', () => {
    const csv = 'Zeballos Torrez, Pedro,90';
    const vista = procesarTextoImportacion(csv, planillaMock);

    expect(vista.resumen.validas).toBe(0);
    expect(vista.resumen.errores).toBe(1);
    expect(vista.filasObservadas[0].motivo).toContain('no existe o no pertenece a este curso');
  });

  it('debe rechazar notas fuera de escala o vacías (US-05, criterio 2)', () => {
    const csv = `
Apaza Condori, Miguel,0
Choque Huanca, Rosa,105
Flores Quispe, Daniela,ABC
`;
    const vista = procesarTextoImportacion(csv, planillaMock);

    expect(vista.resumen.validas).toBe(0);
    expect(vista.resumen.errores).toBe(3);
    expect(vista.filasObservadas[0].motivo).toContain('entre 1 y 100');
    expect(vista.filasObservadas[1].motivo).toContain('entre 1 y 100');
    expect(vista.filasObservadas[2].motivo).toContain('número');
  });

  it('debe confirmar la importación y asentar la auditoría con origen "IMPORTACION" (US-05, criterio 3)', async () => {
    const guardar = vi.spyOn(api, 'guardarPlanilla').mockResolvedValue({ guardadas: 2 });

    const filasValidas = [
      {
        estudianteId: 1,
        codigoRude: '123',
        estudiante: 'Apaza Condori, Miguel',
        valor: 85,
        valida: true as const,
      },
      {
        estudianteId: 3,
        codigoRude: '456',
        estudiante: 'Flores Quispe, Daniela',
        valor: 92,
        valida: true as const,
      },
    ];

    const resultado = await confirmarImportacionNotas(10, filasValidas, 'Ana Profesora');
    expect(resultado.guardadas).toBe(2);
    expect(guardar).toHaveBeenCalledWith(10, [
      { estudianteId: 1, valor: 85 },
      { estudianteId: 3, valor: 92 },
    ]);

    // Verificar que las notas quedaron en auditoría con origen "IMPORTACION"
    const auditoria = JSON.parse(
      localStorage.getItem('calisfacu_auditoria_notas_v1') ?? '[]',
    ) as Array<{ origen: string; estudianteNombre: string }>;

    expect(auditoria).toHaveLength(2);
    expect(auditoria[0].origen).toBe('IMPORTACION');
    expect(auditoria[1].origen).toBe('IMPORTACION');
  });

  it('debe generar la plantilla CSV descargable con los estudiantes del curso', () => {
    const csv = generarPlantillaCsv(planillaMock);
    expect(csv).toContain('N.º,Apellidos y Nombres,Nota (1-100)');
    expect(csv).toContain('Apaza Condori, Miguel');
    expect(csv).toContain('Choque Huanca, Rosa');
    expect(csv).toContain('Flores Quispe, Daniela');
  });
});
