// US-11, Criterio 1 y 2 (T-051): Portal del padre de familia para consulta y descarga de boletín.
// M02: 100% de escenarios E2E críticos pasando; solo boletines publicados permiten descarga (CA 1 vs CA 2).

describe('Portal de Consulta de Boletín para el Padre de Familia (US-11, T-051)', () => {
  beforeEach(() => {
    cy.ingresar(Cypress.env('padreEmail') as string);
  });

  it('debe acceder al portal de familias y visualizar la información formativa oficial', () => {
    cy.location('pathname').should('eq', '/padre/boletin');
    cy.get('h1').should('contain', 'Boletín de mi hijo');
    cy.contains('Portal de Familias y Tutores').should('be.visible');

    cy.screenshot('sprint3-us11-portal-familia-inicio');
  });

  it('debe gestionar adecuadamente la disponibilidad y descarga del boletín según su estado', () => {
    cy.get('body').then(($body) => {
      if ($body.find('[data-cy=boletin-publicado-detalle]').length > 0) {
        // Caso: Boletín publicado oficialmente (CA 1)
        cy.get('[data-cy=tabla-boletin-padre]').should('be.visible');
        cy.get('[data-cy=btn-descargar-boletin-padre]').should('be.visible');
        cy.screenshot('sprint3-us11-boletin-publicado-descarga');
      } else {
        // Caso: Boletín en elaboración / no publicado (CA 2)
        cy.get('[data-cy=aviso-boletin-proximamente]').should('be.visible');
        cy.contains('El boletín todavía no está disponible').should('be.visible');
        cy.screenshot('sprint3-us11-boletin-en-elaboracion');
      }
    });
  });
});
