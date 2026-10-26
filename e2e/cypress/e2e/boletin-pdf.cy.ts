// US-07, Criterio 1 y 3 (T-047): Generación de boletines en PDF y gestión de colas.
// Métrica M02: 100% de escenarios E2E críticos pasando; R05: colas para cursos > 50 estudiantes.

describe('Generación de Boletín de Notas en PDF (US-07, T-047)', () => {
  beforeEach(() => {
    cy.ingresar(Cypress.env('profesorEmail') as string);
    cy.contains('[data-cy=materia-item]', 'Matemática').click();
    cy.get('[data-cy=link-generar-boletines]').click();
  });

  it('debe mostrar la lista de estudiantes con notas trimestrales y estado del boletín', () => {
    cy.location('pathname').should('match', /\/profesor\/materias\/\d+\/boletines$/);
    cy.get('h1').should('contain', 'Emisión de Boletines de Calificaciones');

    // Comprobar tabla oficial
    cy.get('[data-cy=tabla-boletines-curso]').should('be.visible');
    cy.get('[data-cy=fila-boletin-estudiante]').should('have.length.at.least', 1);

    // Botón de descarga individual
    cy.get('[data-cy=btn-descargar-boletin-fila]').first().should('be.visible');

    cy.screenshot('sprint3-us07-boletines-curso-tabla');
  });

  it('debe permitir descargar el boletín en PDF desde el historial académico del estudiante', () => {
    cy.get('[data-cy=btn-ver-historial-estudiante]').first().click();
    cy.location('pathname').should('match', /\/profesor\/estudiantes\/\d+\/historial$/);

    // Botón directo de descarga en PDF
    cy.get('[data-cy=btn-descargar-boletin-pdf]').should('be.visible');

    cy.screenshot('sprint3-us07-historial-descarga-pdf');
  });
});
