import { describe, expect, it } from 'vitest';
import {
  calcularResumenAlertas,
  evaluarTransicionAlertaPromedio,
  filtrarAlertasPromedio,
  type AlertaPromedioBajo,
} from './alertas';

describe('Alertas Automáticas de Promedio Bajo (US-08, RM 001/2026, Decisión D7)', () => {
  describe('evaluarTransicionAlertaPromedio (CA 1 y CA 2)', () => {
    it('debe disparar alerta cuando un estudiante con promedio >= 51 cae por debajo de 51 (CA 1)', () => {
      // Estudiante venía con 65 pts y tras una nueva nota cae a 48 pts
      const resultado = evaluarTransicionAlertaPromedio(65, 48, false);

      expect(resultado.debeDisparar).toBe(true);
      expect(resultado.motivo).toBe('NUEVA_CAIDA_BAJO_MINIMO');
      expect(resultado.descripcion).toContain('cayó de 65 pts a 48 pts');
    });

    it('debe no repetir la alerta cuando el promedio continúa por debajo de 51 y ya tiene alerta activa (CA 2 - regla de histéresis)', () => {
      // Estudiante tenía 48 pts y con otra nota baja a 42 pts, pero ya tiene alerta activa
      const resultado = evaluarTransicionAlertaPromedio(48, 42, true);

      expect(resultado.debeDisparar).toBe(false);
      expect(resultado.motivo).toBe('REPETICION_BLOQUEADA_HISTESIS');
      expect(resultado.descripcion).toContain('Alerta no duplicada');
    });

    it('debe permitir disparar nueva alerta si el estudiante superó los 51 y luego volvió a caer por debajo de 51 (CA 2)', () => {
      // Estudiante se recuperó (alcanzó 55 pts), y luego en otra actividad cayó a 49 pts
      const resultado = evaluarTransicionAlertaPromedio(55, 49, false);

      expect(resultado.debeDisparar).toBe(true);
      expect(resultado.motivo).toBe('NUEVA_CAIDA_BAJO_MINIMO');
      expect(resultado.descripcion).toContain('cayó de 55 pts a 49 pts');
    });

    it('debe disparar alerta inicial cuando se registra el primer promedio menor a 51 sin alerta previa', () => {
      // Primer registro evaluativo del trimestre que resulta en 45 pts
      const resultado = evaluarTransicionAlertaPromedio(null, 45, false);

      expect(resultado.debeDisparar).toBe(true);
      expect(resultado.motivo).toBe('INICIAL_BAJO_MINIMO');
    });

    it('debe no disparar alerta si el promedio nuevo es aprobatorio (>= 51 pts)', () => {
      expect(evaluarTransicionAlertaPromedio(45, 51, false).debeDisparar).toBe(false);
      expect(evaluarTransicionAlertaPromedio(60, 75, false).debeDisparar).toBe(false);
      expect(evaluarTransicionAlertaPromedio(null, 80, false).debeDisparar).toBe(false);
    });

    it('debe no disparar alerta si el promedio es nulo o inválido', () => {
      expect(evaluarTransicionAlertaPromedio(60, null, false).debeDisparar).toBe(false);
      expect(evaluarTransicionAlertaPromedio(null, NaN, false).debeDisparar).toBe(false);
    });
  });

  describe('filtrarAlertasPromedio', () => {
    const listaMock: AlertaPromedioBajo[] = [
      {
        id: 1,
        estudianteId: 10,
        estudianteNombre: 'Mamani Ramos, Alejandro',
        codigoRude: '80980001',
        ci: '10203040',
        materiaId: 101,
        materiaNombre: 'Matemática',
        cursoId: 1,
        cursoNombre: 'Secundaria 4.º «A»',
        trimestreId: 1,
        trimestreNumero: 1,
        promedioAnterior: 60,
        promedioNuevo: 45,
        fechaAlerta: '2026-11-01T10:00:00Z',
        estado: 'ACTIVA',
        leida: false,
        correoEnviado: true,
        tutor: {
          id: 5,
          nombre: 'Elena Ramos',
          parentesco: 'Madre',
          telefono: '71234567',
          email: 'elena@gmail.com',
        },
      },
      {
        id: 2,
        estudianteId: 11,
        estudianteNombre: 'Condori Rojas, Beatriz',
        codigoRude: '80980002',
        ci: null,
        materiaId: 102,
        materiaNombre: 'Lenguaje y Comunicación',
        cursoId: 1,
        cursoNombre: 'Secundaria 4.º «A»',
        trimestreId: 1,
        trimestreNumero: 1,
        promedioAnterior: 55,
        promedioNuevo: 48,
        fechaAlerta: '2026-11-01T11:00:00Z',
        estado: 'ATENDIDA',
        leida: true,
        correoEnviado: true,
        tutor: {
          id: 6,
          nombre: 'Pedro Condori',
          parentesco: 'Padre',
          telefono: '79876543',
          email: 'pedro@gmail.com',
        },
      },
    ];

    it('debe filtrar por estado (ACTIVAS, ATENDIDAS, NO_LEIDAS)', () => {
      const activas = filtrarAlertasPromedio(listaMock, 'ACTIVAS', null, '');
      expect(activas).toHaveLength(1);
      expect(activas[0].id).toBe(1);

      const atendidas = filtrarAlertasPromedio(listaMock, 'ATENDIDAS', null, '');
      expect(atendidas).toHaveLength(1);
      expect(atendidas[0].id).toBe(2);

      const noLeidas = filtrarAlertasPromedio(listaMock, 'NO_LEIDAS', null, '');
      expect(noLeidas).toHaveLength(1);
      expect(noLeidas[0].id).toBe(1);
    });

    it('debe filtrar por materiaId', () => {
      const mat101 = filtrarAlertasPromedio(listaMock, 'TODAS', 101, '');
      expect(mat101).toHaveLength(1);
      expect(mat101[0].materiaNombre).toBe('Matemática');

      const mat999 = filtrarAlertasPromedio(listaMock, 'TODAS', 999, '');
      expect(mat999).toHaveLength(0);
    });

    it('debe filtrar por búsqueda de texto de estudiante, RUDE o tutor', () => {
      const porEstudiante = filtrarAlertasPromedio(listaMock, 'TODAS', null, 'mamani');
      expect(porEstudiante).toHaveLength(1);

      const porRude = filtrarAlertasPromedio(listaMock, 'TODAS', null, '80980002');
      expect(porRude).toHaveLength(1);
      expect(porRude[0].estudianteNombre).toContain('Beatriz');

      const porTutor = filtrarAlertasPromedio(listaMock, 'TODAS', null, 'Elena');
      expect(porTutor).toHaveLength(1);
    });
  });

  describe('calcularResumenAlertas', () => {
    it('debe calcular métricas cuantitativas y el promedio crítico mínimo', () => {
      const lista: AlertaPromedioBajo[] = [
        {
          id: 1,
          estudianteId: 1,
          estudianteNombre: 'A',
          codigoRude: 'R1',
          materiaId: 1,
          materiaNombre: 'Mat',
          cursoId: 1,
          cursoNombre: 'C1',
          trimestreId: 1,
          trimestreNumero: 1,
          promedioAnterior: 60,
          promedioNuevo: 40,
          fechaAlerta: '',
          estado: 'ACTIVA',
          leida: false,
          correoEnviado: true,
        },
        {
          id: 2,
          estudianteId: 2,
          estudianteNombre: 'B',
          codigoRude: 'R2',
          materiaId: 1,
          materiaNombre: 'Mat',
          cursoId: 1,
          cursoNombre: 'C1',
          trimestreId: 1,
          trimestreNumero: 1,
          promedioAnterior: 55,
          promedioNuevo: 48,
          fechaAlerta: '',
          estado: 'ATENDIDA',
          leida: true,
          correoEnviado: true,
        },
      ];

      const resumen = calcularResumenAlertas(lista);
      expect(resumen.totalAlertas).toBe(2);
      expect(resumen.alertasActivas).toBe(1);
      expect(resumen.alertasAtendidas).toBe(1);
      expect(resumen.noLeidas).toBe(1);
      expect(resumen.correosEnviados).toBe(2);
      expect(resumen.promedioCriticoMinimo).toBe(40);
    });
  });
});
