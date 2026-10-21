import { leerNota, validarFilas } from './reglas-importacion';

// Pruebas escritas antes del código (TDD, T-038).
describe('Reglas de la importación desde Excel (US-05)', () => {
  describe('leerNota', () => {
    it('debe aceptar números de 1 a 100 con hasta dos decimales, también con coma', () => {
      expect(leerNota(85)).toBe(85);
      expect(leerNota('85,5')).toBe(85.5);
      expect(leerNota(' 70.25 ')).toBe(70.25);
      expect(leerNota(1)).toBe(1);
      expect(leerNota(100)).toBe(100);
      // 70,1 × 100 da 7010,000000000001 en coma flotante: igual es una nota con un decimal.
      expect(leerNota(70.1)).toBe(70.1);
      expect(leerNota(33.33)).toBe(33.33);
    });

    it('debe rechazar valores fuera de la escala, con más decimales o que no son números', () => {
      for (const v of [0, 101, -5, 50.123, 'abc', '', null, undefined, true, '1e2']) {
        expect(leerNota(v)).toBeNull();
      }
    });
  });

  describe('validarFilas (criterios 1 y 2)', () => {
    const estudiantes = [
      { id: 1, codigoRude: 'RUDE000001', nombres: 'Ana', apellidos: 'Quispe' },
      { id: 2, codigoRude: 'RUDE000002', nombres: 'Luis', apellidos: 'Mamani' },
      { id: 3, codigoRude: 'RUDE000003', nombres: 'Eva', apellidos: 'Condori' },
    ];

    it('debe separar las filas válidas de las filas con error, cada una con su motivo', () => {
      const r = validarFilas(
        [
          { linea: 2, rude: 'rude000001', nota: 80 },
          { linea: 3, rude: 'RUDE999999', nota: 70 },
          { linea: 4, rude: 'RUDE000002', nota: 120 },
          { linea: 5, rude: '', nota: 50 },
          { linea: 6, rude: 'RUDE000003', nota: null },
        ],
        estudiantes,
        new Set(),
      );
      expect(r.filasValidas).toEqual([
        {
          estudianteId: 1,
          codigoRude: 'RUDE000001',
          estudiante: 'Quispe, Ana',
          valor: 80,
          valida: true,
        },
      ]);
      expect(r.filasObservadas.map((f) => [f.linea, f.motivo])).toEqual([
        [3, 'El estudiante no existe en este curso'],
        [4, 'La nota debe ser un número entre 1 y 100, con hasta dos decimales'],
        [5, 'Falta el código RUDE'],
      ]);
      expect(r.filasObservadas[1]).toMatchObject({
        identificador: 'RUDE000002',
        valorIngresado: '120',
      });
      expect(r.resumen).toEqual({ total: 4, validas: 1, errores: 3 });
      expect(r.totalFilas).toBe(4);
    });

    it('debe ignorar las filas sin nota: el profesor puede llenar solo una parte de la plantilla', () => {
      const r = validarFilas(
        [
          { linea: 2, rude: 'RUDE000001', nota: 80 },
          { linea: 3, rude: 'RUDE000002', nota: null },
          { linea: 4, rude: 'RUDE000003', nota: '  ' },
        ],
        estudiantes,
        new Set(),
      );
      expect(r.resumen).toEqual({ total: 1, validas: 1, errores: 0 });
    });

    it('debe rechazar al estudiante que ya tiene nota en la actividad (se corrige con motivo, US-04)', () => {
      const r = validarFilas(
        [{ linea: 2, rude: 'RUDE000001', nota: 80 }],
        estudiantes,
        new Set([1]),
      );
      expect(r.filasObservadas[0].motivo).toBe(
        'Ya tiene nota en esta actividad: corríjala con motivo',
      );
    });

    it('debe rechazar las filas repetidas del mismo estudiante, salvo la primera', () => {
      const r = validarFilas(
        [
          { linea: 2, rude: 'RUDE000001', nota: 80 },
          { linea: 3, rude: 'RUDE000001', nota: 90 },
        ],
        estudiantes,
        new Set(),
      );
      expect(r.filasValidas.map((f) => f.valor)).toEqual([80]);
      expect(r.filasObservadas[0]).toMatchObject({
        linea: 3,
        motivo: 'El estudiante aparece más de una vez en el archivo (primera vez en la fila 2)',
      });
    });
  });
});
