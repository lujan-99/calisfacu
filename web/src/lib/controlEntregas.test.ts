import { describe, expect, it } from 'vitest';
import {
  agruparEntregasPorCurso,
  calcularEstadisticasGenerales,
  verificarRequisitosEntrega,
  type EntregaMateria,
} from './controlEntregas';

describe('Control de Entrega de Notas (US-10)', () => {
  describe('Criterio 2: Validación de requisitos para marcar como entregada', () => {
    it('debe rechazar la entrega si faltan notas por registrar en las actividades', () => {
      // 2 actividades, 10 estudiantes -> se requieren 20 notas, pero solo hay 18
      const resultado = verificarRequisitosEntrega({
        totalActividades: 2,
        totalEstudiantes: 10,
        totalNotasRegistradas: 18,
      });

      expect(resultado.puedeEntregar).toBe(false);
      expect(resultado.totalNotasRequeridas).toBe(20);
      expect(resultado.notasFaltantes).toBe(2);
      expect(resultado.razon).toContain('faltan 2 nota(s) por calificar');
    });

    it('debe aceptar la entrega cuando todos los estudiantes tienen nota en todas las actividades', () => {
      // 3 actividades, 15 estudiantes -> se requieren 45 notas y las 45 están registradas
      const resultado = verificarRequisitosEntrega({
        totalActividades: 3,
        totalEstudiantes: 15,
        totalNotasRegistradas: 45,
      });

      expect(resultado.puedeEntregar).toBe(true);
      expect(resultado.totalNotasRequeridas).toBe(45);
      expect(resultado.notasFaltantes).toBe(0);
      expect(resultado.razon).toBeUndefined();
    });

    it('debe rechazar la entrega si no existen actividades creadas en el trimestre', () => {
      const resultado = verificarRequisitosEntrega({
        totalActividades: 0,
        totalEstudiantes: 20,
        totalNotasRegistradas: 0,
      });

      expect(resultado.puedeEntregar).toBe(false);
      expect(resultado.razon).toContain('la materia no tiene actividades creadas');
    });

    it('debe rechazar la entrega si el curso no tiene estudiantes registrados', () => {
      const resultado = verificarRequisitosEntrega({
        totalActividades: 2,
        totalEstudiantes: 0,
        totalNotasRegistradas: 0,
      });

      expect(resultado.puedeEntregar).toBe(false);
      expect(resultado.razon).toContain('el curso no tiene estudiantes');
    });
  });

  describe('Criterio 1: Agrupación y cálculo de métricas por curso y generales', () => {
    const entregasEjemplo: EntregaMateria[] = [
      {
        materiaId: 1,
        materia: 'Matemática',
        cursoId: 10,
        curso: 'Secundaria 4.º «A»',
        profesorId: 101,
        profesor: 'Rosa Mamani Condori',
        trimestreId: 1,
        trimestreNumero: 1,
        estado: 'ENTREGADO',
        fechaEntrega: '2026-04-10T14:30:00Z',
        totalActividades: 4,
        totalEstudiantes: 25,
        totalNotasRegistradas: 100,
        totalNotasRequeridas: 100,
        notasFaltantes: 0,
      },
      {
        materiaId: 2,
        materia: 'Física',
        cursoId: 10,
        curso: 'Secundaria 4.º «A»',
        profesorId: 102,
        profesor: 'Carlos Lujan',
        trimestreId: 1,
        trimestreNumero: 1,
        estado: 'PENDIENTE',
        fechaEntrega: null,
        totalActividades: 3,
        totalEstudiantes: 25,
        totalNotasRegistradas: 60,
        totalNotasRequeridas: 75,
        notasFaltantes: 15,
      },
      {
        materiaId: 3,
        materia: 'Lenguaje',
        cursoId: 20,
        curso: 'Secundaria 3.º «B»',
        profesorId: 103,
        profesor: 'Elena Galvan',
        trimestreId: 1,
        trimestreNumero: 1,
        estado: 'ENTREGADO',
        fechaEntrega: '2026-04-12T09:00:00Z',
        totalActividades: 2,
        totalEstudiantes: 20,
        totalNotasRegistradas: 40,
        totalNotasRequeridas: 40,
        notasFaltantes: 0,
      },
    ];

    it('debe agrupar materias por curso y computar porcentajes de entrega', () => {
      const resumenes = agruparEntregasPorCurso(entregasEjemplo);

      expect(resumenes).toHaveLength(2);

      const curso4A = resumenes.find((r) => r.cursoId === 10);
      expect(curso4A).toBeDefined();
      expect(curso4A?.totalMaterias).toBe(2);
      expect(curso4A?.entregadas).toBe(1);
      expect(curso4A?.pendientes).toBe(1);
      expect(curso4A?.porcentajeCumplimiento).toBe(50.0);

      const curso3B = resumenes.find((r) => r.cursoId === 20);
      expect(curso3B).toBeDefined();
      expect(curso3B?.totalMaterias).toBe(1);
      expect(curso3B?.entregadas).toBe(1);
      expect(curso3B?.pendientes).toBe(0);
      expect(curso3B?.porcentajeCumplimiento).toBe(100.0);
    });

    it('debe calcular estadísticas globales consolidadas', () => {
      const stats = calcularEstadisticasGenerales(entregasEjemplo);

      expect(stats.totalMaterias).toBe(3);
      expect(stats.entregadas).toBe(2);
      expect(stats.pendientes).toBe(1);
      // 2 / 3 = 66.666... -> 66.7%
      expect(stats.porcentajeGlobal).toBe(66.7);
    });
  });
});
