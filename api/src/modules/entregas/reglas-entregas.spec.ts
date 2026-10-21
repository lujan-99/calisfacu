import { requisitosEntrega } from './reglas-entregas';

describe('Reglas de la entrega de notas (US-10)', () => {
  describe('requisitosEntrega (criterio 2)', () => {
    it('debe aceptar la entrega si todos los estudiantes tienen nota en todas las actividades', () => {
      expect(
        requisitosEntrega({ totalActividades: 5, totalEstudiantes: 3, totalNotasRegistradas: 15 }),
      ).toEqual({ puedeEntregar: true, totalNotasRequeridas: 15, notasFaltantes: 0 });
    });

    it('debe rechazarla e indicar cuántas notas faltan', () => {
      expect(
        requisitosEntrega({ totalActividades: 5, totalEstudiantes: 3, totalNotasRegistradas: 14 }),
      ).toEqual({
        puedeEntregar: false,
        totalNotasRequeridas: 15,
        notasFaltantes: 1,
        razon:
          'No se puede marcar como entregada: falta 1 nota por registrar. Todos los estudiantes deben tener nota en todas las actividades.',
      });
      expect(
        requisitosEntrega({ totalActividades: 2, totalEstudiantes: 3, totalNotasRegistradas: 0 })
          .razon,
      ).toContain('faltan 6 notas por registrar');
    });

    it('debe rechazar una materia sin actividades en el trimestre', () => {
      const r = requisitosEntrega({
        totalActividades: 0,
        totalEstudiantes: 3,
        totalNotasRegistradas: 0,
      });
      expect(r.puedeEntregar).toBe(false);
      expect(r.razon).toBe(
        'No se puede marcar como entregada: la materia no tiene actividades en este trimestre.',
      );
    });

    it('debe rechazar un curso sin estudiantes', () => {
      const r = requisitosEntrega({
        totalActividades: 4,
        totalEstudiantes: 0,
        totalNotasRegistradas: 0,
      });
      expect(r.puedeEntregar).toBe(false);
      expect(r.razon).toBe('No se puede marcar como entregada: el curso no tiene estudiantes.');
    });
  });
});
