import { describe, expect, it, vi } from 'vitest';
import {
  descargarBlob,
  esCursoNumeroso,
  filtrarBoletinesEstudiantes,
  UMBRAL_CURSO_NUMEROSO_COLA,
  type BoletinEstudiante,
} from './boletin';

describe('Generación de Boletines en PDF y Colas (US-07, Riesgo R05 / CAL-001)', () => {
  describe('esCursoNumeroso (Criterio 3 y Defecto CAL-001)', () => {
    it('debe indicar false para cursos de 50 o menos estudiantes (generación directa)', () => {
      expect(esCursoNumeroso(50)).toBe(false);
      expect(esCursoNumeroso(30)).toBe(false);
      expect(esCursoNumeroso(1)).toBe(false);
    });

    it('debe indicar true cuando el curso supera 50 estudiantes (activa BullMQ + Redis)', () => {
      expect(esCursoNumeroso(51)).toBe(true);
      expect(esCursoNumeroso(60)).toBe(true);
      expect(esCursoNumeroso(100)).toBe(true);
    });

    it('debe respetar el umbral oficial del proyecto (50 estudiantes)', () => {
      expect(UMBRAL_CURSO_NUMEROSO_COLA).toBe(50);
    });
  });

  describe('filtrarBoletinesEstudiantes', () => {
    const listaMock: BoletinEstudiante[] = [
      {
        estudianteId: 1,
        codigoRude: '90000000001',
        ci: '10203040',
        estudiante: 'Perez Ramos, Alejandro',
        promedioAnual: 82.5,
        porcentajeAsistencia: 94.0,
        clasesDictadas: 20,
        asistencias: 19,
        estadoBoletin: 'LISTO',
        trimestres: [
          { numero: 1, nota: 80 },
          { numero: 2, nota: 85 },
        ],
      },
      {
        estudianteId: 2,
        codigoRude: '90000000002',
        ci: null,
        estudiante: 'Morales Soliz, Mateo',
        promedioAnual: null,
        porcentajeAsistencia: null,
        clasesDictadas: 0,
        asistencias: 0,
        estadoBoletin: 'PENDIENTE_NOTAS',
        trimestres: [
          { numero: 1, nota: null },
          { numero: 2, nota: null },
        ],
      },
      {
        estudianteId: 3,
        codigoRude: '90000000003',
        ci: '7788990',
        estudiante: 'Castillo Cruz, Sofia',
        promedioAnual: 75.0,
        porcentajeAsistencia: 88.0,
        clasesDictadas: 20,
        asistencias: 18,
        estadoBoletin: 'LISTO',
        trimestres: [
          { numero: 1, nota: 75 },
          { numero: 2, nota: 75 },
        ],
      },
    ];

    it('debe filtrar exclusivamente boletines con notas listas para emitir', () => {
      const filtrados = filtrarBoletinesEstudiantes(listaMock, 'LISTOS', '');
      expect(filtrados).toHaveLength(2);
      expect(filtrados.map((e) => e.estudianteId)).toEqual([1, 3]);
    });

    it('debe filtrar boletines pendientes de calificaciones', () => {
      const filtrados = filtrarBoletinesEstudiantes(listaMock, 'PENDIENTES', '');
      expect(filtrados).toHaveLength(1);
      expect(filtrados[0].estudianteId).toBe(2);
    });

    it('debe permitir buscar por nombre, RUDE o Cédula de Identidad', () => {
      expect(filtrarBoletinesEstudiantes(listaMock, 'TODOS', 'Alejandro')).toHaveLength(1);
      expect(filtrarBoletinesEstudiantes(listaMock, 'TODOS', '90000000002')).toHaveLength(1);
      expect(filtrarBoletinesEstudiantes(listaMock, 'TODOS', '7788990')).toHaveLength(1);
      expect(filtrarBoletinesEstudiantes(listaMock, 'TODOS', 'NoExiste')).toHaveLength(0);
    });
  });

  describe('descargarBlob', () => {
    it('debe crear un enlace temporal y simular la descarga', () => {
      const mockBlob = new Blob(['%PDF-1.4 simulado'], { type: 'application/pdf' });
      const createObjectURLSpy = vi
        .spyOn(URL, 'createObjectURL')
        .mockReturnValue('blob:http://localhost/test');
      const revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

      const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
      const appendChildSpy = vi.spyOn(document.body, 'appendChild');
      const removeChildSpy = vi.spyOn(document.body, 'removeChild');

      descargarBlob(mockBlob, 'Boletin_Test.pdf');

      expect(createObjectURLSpy).toHaveBeenCalledWith(mockBlob);
      expect(appendChildSpy).toHaveBeenCalled();
      expect(clickSpy).toHaveBeenCalled();
      expect(removeChildSpy).toHaveBeenCalled();
      expect(revokeObjectURLSpy).toHaveBeenCalledWith('blob:http://localhost/test');
    });
  });
});
