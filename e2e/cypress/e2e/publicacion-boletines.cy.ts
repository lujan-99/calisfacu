// US-11 (T-050): la secretaria publica el boletín por curso y trimestre (decisión D20).

describe('Publicación de boletines (US-11)', () => {
  beforeEach(() => {
    cy.intercept('GET', '**/api/boletines/publicaciones*').as('publicaciones');
    cy.ingresar(Cypress.env('secretariaEmail') as string);
    cy.get('[data-cy=menu-publicacion-boletines]').click();
    cy.wait('@publicaciones').its('response.statusCode').should('be.oneOf', [200, 304]);
  });

  it('debe mostrar por trimestre la entrega de notas y bloquear la publicación si falta alguna', () => {
    cy.get('[data-cy=titulo-publicacion-boletines]').should('be.visible');
    cy.get('[data-cy=fila-publicacion]').should('have.length', 3);
    cy.get('[data-cy=fila-publicacion]').each(($fila) => {
      if ($fila.text().includes('Falta:')) {
        cy.wrap($fila).find('[data-cy=btn-publicar]').should('be.disabled');
      }
    });
    cy.screenshot('sprint3-us11-publicacion-boletines');
  });
});
