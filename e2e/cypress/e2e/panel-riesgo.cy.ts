// US-06 (T-043, T-044): panel de riesgo académico del profesor contra la API real (decisiones D6 y D18).

describe('Panel de Riesgo Académico (US-06)', () => {
  beforeEach(() => {
    cy.intercept('GET', '**/api/materias/*/riesgo*').as('panel');
    cy.ingresar(Cypress.env('profesorEmail') as string);
    cy.contains('[data-cy=materia-item]', 'Matemática').click();
    cy.get('[data-cy=link-panel-riesgo]').click();
    cy.wait('@panel').its('response.statusCode').should('be.oneOf', [200, 304]);
  });

  it('debe mostrar a cada estudiante con su promedio y su porcentaje de asistencia (criterio 1)', () => {
    cy.location('pathname').should('match', /\/profesor\/materias\/\d+\/riesgo$/);
    cy.get('[data-cy=titulo-panel-riesgo]').should('contain', 'Matemática');
    cy.get('[data-cy=fila-estudiante-riesgo]')
      .should('have.length.at.least', 1)
      .each(($fila) => {
        // Un número, o "Pendiente" / "Sin clases" mientras no hay datos.
        cy.wrap($fila)
          .find('[data-cy=celda-promedio]')
          .invoke('text')
          .should('match', /\d|Pendiente/);
        cy.wrap($fila)
          .find('[data-cy=celda-asistencia]')
          .invoke('text')
          .should('match', /\d+(,\d)? ?%|Sin clases/);
      });
    cy.screenshot('sprint3-us06-panel-riesgo');
  });

  it('debe dejar en el filtro "en riesgo" solo a estudiantes marcados en riesgo (criterio 2)', () => {
    cy.get('[data-cy=filtro-riesgo]').click();
    cy.get('[data-cy=seccion-panel-riesgo]').then(($s) => {
      const filas = $s.find('[data-cy=fila-estudiante-riesgo]');
      filas.each((_, fila) => {
        expect(
          Cypress.$(fila).find(
            '[data-cy=insignia-riesgo-promedio], [data-cy=insignia-riesgo-asistencia], [data-cy=insignia-riesgo-critico]',
          ),
        ).to.have.length(1);
      });
    });
    cy.screenshot('sprint3-us06-panel-riesgo-filtro');
  });
});
