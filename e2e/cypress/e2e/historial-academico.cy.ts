// US-03, criterio 1 (T-035): consulta cronológica del historial académico anual del estudiante.
// El profesor consulta la evolución de un estudiante por trimestres con promedios y desglose de dimensiones.

describe('Historial académico anual del estudiante (US-03, T-035)', () => {
  beforeEach(() => {
    cy.ingresar(Cypress.env('profesorEmail') as string);
    cy.contains('[data-cy=materia-item]', 'Matemática').click();
    cy.get('[data-cy=link-notas-trimestre]').click();
  });

  it('debe acceder al historial del estudiante desde la lista de notas trimestrales', () => {
    cy.get('[data-cy=tabla-notas-trimestre]').should('be.visible');
    cy.get('[data-cy=link-historial-estudiante]').first().click();

    // Comprobar redirección al historial anual
    cy.location('pathname').should('match', /\/profesor\/estudiantes\/\d+\/historial$/);
    cy.get('[data-cy=historial-estudiante-titulo]').should('be.visible');
    cy.get('[data-cy=historial-promedio-anual]').should('be.visible');
    cy.get('[data-cy=historial-tendencia]').should('be.visible');
  });

  it('debe mostrar los trimestres en orden cronológico con sus calificaciones y dimensiones', () => {
    cy.get('[data-cy=link-historial-estudiante]').first().click();

    // Comprobar pestañas/tarjetas de trimestres cronológicos (criterio 1)
    cy.get('[data-cy=resumen-cronologico-trimestres]').should('be.visible');
    cy.get('[data-cy=tab-trimestre-1]').should('exist').and('contain', '1.er');

    // Comprobar tabla de calificaciones detalladas por dimensión
    cy.get('[data-cy=tabla-historial-trimestre]').should('be.visible');
    cy.get('[data-cy=fila-materia-historial]').should('have.length.at.least', 1);

    // Navegar de regreso a las materias asignadas
    cy.get('[data-cy=link-volver]').click();
    cy.location('pathname').should('eq', '/profesor/materias');
  });
});
