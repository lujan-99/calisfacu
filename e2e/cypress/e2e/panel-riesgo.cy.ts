// US-06, Criterio 1 (T-044): Panel interactivo de riesgo académico para profesores.
// Detecta estudiantes con promedio < 51 pts o asistencia < 80.0 % (Decisión D6 y RM 001/2026).

describe('Panel de Riesgo Académico (US-06, T-044)', () => {
  beforeEach(() => {
    cy.ingresar(Cypress.env('profesorEmail') as string);
    cy.contains('[data-cy=materia-item]', 'Matemática').click();
    cy.get('[data-cy=link-panel-riesgo]').click();
  });

  it('debe navegar al panel de riesgo y mostrar los indicadores de alerta temprana', () => {
    cy.location('pathname').should('match', /\/profesor\/materias\/\d+\/riesgo$/);
    cy.get('[data-cy=titulo-panel-riesgo]')
      .should('be.visible')
      .and('contain', 'Panel de Riesgo Académico');

    // Comprobar tarjetas de resumen y umbrales normativos
    cy.get('[data-cy=tarjetas-resumen-riesgo]').should('be.visible');
    cy.get('[data-cy=tarjeta-estudiantes-riesgo]').should('be.visible');

    // Capturar screenshot de evidencia visual
    cy.screenshot('sprint3-us06-panel-riesgo-dashboard');
  });

  it('debe permitir filtrar estudiantes por categoría de riesgo y buscar por nombre', () => {
    // Filtro por estudiantes en riesgo
    cy.get('[data-cy=tab-filtro-riesgo]').click();
    cy.get('[data-cy=tabla-riesgo]').should('be.visible');

    // Buscador interactivo
    cy.get('[data-cy=input-buscar-estudiante-riesgo]').type('Pérez');
    cy.get('[data-cy=tabla-riesgo]').should('contain', 'Pérez');

    cy.screenshot('sprint3-us06-panel-riesgo-filtros');
  });
});
