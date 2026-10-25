import { describe, expect, it } from 'vitest';
import {
  calcularResumenPanelRiesgo,
  evaluarRiesgoEstudiante,
  filtrarEstudiantesRiesgo,
  type EstudianteRiesgo,
} from './riesgo';

describe('Panel de Riesgo Académico (US-06, Decisión D6)', () => {
  describe('evaluarRiesgoEstudiante (Criterio 2 y RNF-01)', () => {
    it('debe marcar en riesgo a un estudiante con promedio menor a 51 (escala RM 001/2026)', () => {
      const res = evaluarRiesgoEstudiante(50.4, 90.0);
      expect(res.enRiesgo).toBe(true);
      expect(res.motivoRiesgo).toBe('PROMEDIO');
      expect(res.estado).toBe('EN_RIESGO');
    });

    it('debe considerar regular al estudiante en la nota frontera de aprobación (51 pts)', () => {
      const res = evaluarRiesgoEstudiante(51.0, 85.0);
      expect(res.enRiesgo).toBe(false);
      expect(res.motivoRiesgo).toBeNull();
      expect(res.estado).toBe('REGULAR');
    });

    it('debe marcar en riesgo a un estudiante con asistencia menor a 80 % (Decisión D6)', () => {
      const res = evaluarRiesgoEstudiante(75.0, 79.9);
      expect(res.enRiesgo).toBe(true);
      expect(res.motivoRiesgo).toBe('ASISTENCIA');
      expect(res.estado).toBe('EN_RIESGO');
    });

    it('debe considerar regular al estudiante en el umbral exacto de 80.0 % de asistencia', () => {
      const res = evaluarRiesgoEstudiante(80.0, 80.0);
      expect(res.enRiesgo).toBe(false);
      expect(res.motivoRiesgo).toBeNull();
      expect(res.estado).toBe('REGULAR');
    });

    it('debe marcar en riesgo con motivo AMBOS si reprueba nota y no cumple asistencia', () => {
      const res = evaluarRiesgoEstudiante(42.0, 65.0);
      expect(res.enRiesgo).toBe(true);
      expect(res.motivoRiesgo).toBe('AMBOS');
      expect(res.estado).toBe('EN_RIESGO');
    });

    it('debe clasificar como PENDIENTE a estudiantes que aún no tienen notas ni asistencia', () => {
      const res = evaluarRiesgoEstudiante(null, null);
      expect(res.enRiesgo).toBe(false);
      expect(res.motivoRiesgo).toBeNull();
      expect(res.estado).toBe('PENDIENTE');
    });

    it('debe admitir umbrales configurables por gestión (Decisión D6)', () => {
      // Gestión con umbral de asistencia más estricto (85 %) y nota 60
      const res = evaluarRiesgoEstudiante(55.0, 82.0, 85.0, 60.0);
      expect(res.enRiesgo).toBe(true);
      expect(res.motivoRiesgo).toBe('AMBOS');
    });
  });

  describe('calcularResumenPanelRiesgo', () => {
    const listaMock: EstudianteRiesgo[] = [
      {
        estudianteId: 1,
        codigoRude: 'RUDE01',
        ci: '1234567',
        estudiante: 'Alvarez, Juan',
        promedio: 45.0,
        porcentajeAsistencia: 90.0,
        clasesDictadas: 10,
        asistencias: 9,
        enRiesgo: true,
        motivoRiesgo: 'PROMEDIO',
        estado: 'EN_RIESGO',
      },
      {
        estudianteId: 2,
        codigoRude: 'RUDE02',
        ci: null,
        estudiante: 'Benitez, Ana',
        promedio: 80.0,
        porcentajeAsistencia: 70.0,
        clasesDictadas: 10,
        asistencias: 7,
        enRiesgo: true,
        motivoRiesgo: 'ASISTENCIA',
        estado: 'EN_RIESGO',
      },
      {
        estudianteId: 3,
        codigoRude: 'RUDE03',
        ci: '7654321',
        estudiante: 'Castro, Carlos',
        promedio: 40.0,
        porcentajeAsistencia: 60.0,
        clasesDictadas: 10,
        asistencias: 6,
        enRiesgo: true,
        motivoRiesgo: 'AMBOS',
        estado: 'EN_RIESGO',
      },
      {
        estudianteId: 4,
        codigoRude: 'RUDE04',
        ci: null,
        estudiante: 'Diaz, Daniel',
        promedio: 85.0,
        porcentajeAsistencia: 95.0,
        clasesDictadas: 10,
        asistencias: 9,
        enRiesgo: false,
        motivoRiesgo: null,
        estado: 'REGULAR',
      },
      {
        estudianteId: 5,
        codigoRude: 'RUDE05',
        ci: null,
        estudiante: 'Espinoza, Elena',
        promedio: null,
        porcentajeAsistencia: null,
        clasesDictadas: 0,
        asistencias: 0,
        enRiesgo: false,
        motivoRiesgo: null,
        estado: 'PENDIENTE',
      },
    ];

    it('debe calcular métricas consolidadas y conteos de riesgo correctamente', () => {
      const resumen = calcularResumenPanelRiesgo(listaMock);

      expect(resumen.totalEstudiantes).toBe(5);
      expect(resumen.enRiesgoTotal).toBe(3);
      expect(resumen.enRiesgoPromedio).toBe(1);
      expect(resumen.enRiesgoAsistencia).toBe(1);
      expect(resumen.enRiesgoAmbos).toBe(1);
      expect(resumen.regulares).toBe(1);
      expect(resumen.pendientes).toBe(1);

      // Promedio general: (45 + 80 + 40 + 85) / 4 = 62.5
      expect(resumen.promedioGeneral).toBe(62.5);

      // Asistencia general: (90 + 70 + 60 + 95) / 4 = 78.8
      expect(resumen.asistenciaGeneral).toBe(78.8);
    });
  });

  describe('filtrarEstudiantesRiesgo', () => {
    const listaMock: EstudianteRiesgo[] = [
      {
        estudianteId: 1,
        codigoRude: '90000000001',
        ci: '10203040',
        estudiante: 'Mamani Quispe, Rodrigo',
        promedio: 48.0,
        porcentajeAsistencia: 92.0,
        clasesDictadas: 10,
        asistencias: 9,
        enRiesgo: true,
        motivoRiesgo: 'PROMEDIO',
        estado: 'EN_RIESGO',
      },
      {
        estudianteId: 2,
        codigoRude: '90000000002',
        ci: null,
        estudiante: 'Flores Choque, Maria',
        promedio: 75.0,
        porcentajeAsistencia: 72.0,
        clasesDictadas: 10,
        asistencias: 7,
        enRiesgo: true,
        motivoRiesgo: 'ASISTENCIA',
        estado: 'EN_RIESGO',
      },
      {
        estudianteId: 3,
        codigoRude: '90000000003',
        ci: '8899001',
        estudiante: 'Condori Ramos, Lucia',
        promedio: 88.0,
        porcentajeAsistencia: 95.0,
        clasesDictadas: 10,
        asistencias: 10,
        enRiesgo: false,
        motivoRiesgo: null,
        estado: 'REGULAR',
      },
    ];

    it('debe filtrar exclusivamente estudiantes en riesgo', () => {
      const filtrados = filtrarEstudiantesRiesgo(listaMock, 'RIESGO', '');
      expect(filtrados).toHaveLength(2);
      expect(filtrados.map((e) => e.estudianteId)).toEqual([1, 2]);
    });

    it('debe filtrar estudiantes con riesgo en promedio', () => {
      const filtrados = filtrarEstudiantesRiesgo(listaMock, 'PROMEDIO', '');
      expect(filtrados).toHaveLength(1);
      expect(filtrados[0].estudianteId).toBe(1);
    });

    it('debe filtrar estudiantes con riesgo en asistencia', () => {
      const filtrados = filtrarEstudiantesRiesgo(listaMock, 'ASISTENCIA', '');
      expect(filtrados).toHaveLength(1);
      expect(filtrados[0].estudianteId).toBe(2);
    });

    it('debe filtrar estudiantes regulares sin riesgo', () => {
      const filtrados = filtrarEstudiantesRiesgo(listaMock, 'REGULAR', '');
      expect(filtrados).toHaveLength(1);
      expect(filtrados[0].estudianteId).toBe(3);
    });

    it('debe buscar por nombre, RUDE o cédula de identidad', () => {
      expect(filtrarEstudiantesRiesgo(listaMock, 'TODOS', 'Rodrigo')).toHaveLength(1);
      expect(filtrarEstudiantesRiesgo(listaMock, 'TODOS', '90000000002')).toHaveLength(1);
      expect(filtrarEstudiantesRiesgo(listaMock, 'TODOS', '8899001')).toHaveLength(1);
      expect(filtrarEstudiantesRiesgo(listaMock, 'TODOS', 'Inexistente')).toHaveLength(0);
    });
  });
});
