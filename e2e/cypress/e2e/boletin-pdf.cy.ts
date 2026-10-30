// US-07 (T-045 a T-047): boletín en PDF de un estudiante y de todo el curso por la cola BullMQ (decisión D19).

describe('Boletín de Notas en PDF (US-07)', () => {
  beforeEach(() => {
    cy.intercept('GET', '**/api/boletines/cursos/*/estudiantes').as('lista');
    cy.ingresar(Cypress.env('profesorEmail') as string);
    cy.contains('[data-cy=materia-item]', 'Matemática').click();
    cy.get('[data-cy=link-generar-boletines]').click();
    cy.wait('@lista').its('response.statusCode').should('be.oneOf', [200, 304]);
  });

  it('debe listar a los estudiantes del curso y descargar el PDF de uno (criterio 1)', () => {
    cy.location('pathname').should('match', /\/profesor\/materias\/\d+\/boletines$/);
    cy.get('[data-cy=fila-boletin-estudiante]').should('have.length.at.least', 1);
    cy.screenshot('sprint3-us07-boletines-curso');
    cy.intercept('GET', '**/api/boletines/estudiantes/*/pdf').as('pdf');
    cy.get('[data-cy=btn-descargar-boletin-pdf]').first().click();
    cy.wait('@pdf').then(({ response }) => {
      expect(response?.statusCode).to.eq(200);
      expect(response?.headers['content-type']).to.eq('application/pdf');
    });
  });

  it('debe generar los boletines del curso en la cola, avisar al terminar y descargar el PDF (criterio 3)', () => {
    cy.intercept('POST', '**/api/boletines/cursos/*/cola').as('cola');
    cy.get('[data-cy=btn-emision-masiva]').click();
    cy.wait('@cola').its('response.statusCode').should('eq', 202);
    cy.get('[data-cy=mensaje-estado-cola]', { timeout: 60000 }).should(
      'contain',
      'listos para descargar',
    );
    // La captura va antes de la descarga: después, cy.screenshot() puede quedarse esperando.
    cy.screenshot('sprint3-us07-cola-completada');
    cy.intercept('GET', '**/api/boletines/trabajos/*/pdf').as('pdfCurso');
    cy.get('[data-cy=btn-descargar-boletines-curso]').click();
    cy.wait('@pdfCurso').then(({ response }) => {
      expect(response?.statusCode).to.eq(200);
      expect(response?.headers['content-type']).to.eq('application/pdf');
    });
  });
});
