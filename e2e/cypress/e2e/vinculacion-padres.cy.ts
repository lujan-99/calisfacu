// US-20, Criterio 1 y 2 (T-049): Gestión de vinculación padre-estudiante para secretaría.
// RNF-04: Protección de datos de menores; solo tutores formalmente vinculados tienen acceso.

describe('Vinculación Padre–Estudiante en Secretaría (US-20, T-049)', () => {
  beforeEach(() => {
    cy.ingresar(Cypress.env('secretariaEmail') as string);
    cy.get('[data-cy=menu-vinculos-familiares]').click();
  });

  it('debe mostrar la lista de vínculos familiares y métricas de cobertura de tutores', () => {
    cy.location('pathname').should('eq', '/secretaria/vinculos-familiares');
    cy.get('h1').should('contain', 'Vinculación Padre–Estudiante');

    // Comprobar tarjetas métricas
    cy.contains('Total de Vínculos Activos').should('be.visible');
    cy.contains('Padres y Tutores Registrados').should('be.visible');

    // Tabla de vinculaciones
    cy.get('[data-cy=tabla-vinculos]').should('be.visible');
    cy.get('[data-cy=fila-vinculo]').should('have.length.at.least', 1);

    cy.screenshot('sprint3-us20-vinculaciones-secretaria');
  });

  it('debe abrir el diálogo modal accesible para registrar un nuevo vínculo familiar', () => {
    cy.get('[data-cy=btn-nuevo-vinculo]').click();

    // Comprobar diálogo modal
    cy.get('[data-cy=dialogo-nuevo-vinculo]').should('be.visible');
    cy.get('[data-cy=select-padre]').should('be.visible');
    cy.get('[data-cy=select-parentesco]').should('be.visible');
    cy.get('[data-cy=select-estudiante]').should('be.visible');
    cy.get('[data-cy=btn-guardar-vinculo]').should('be.visible');

    cy.screenshot('sprint3-us20-modal-nuevo-vinculo');

    cy.contains('button', 'Cancelar').click();
    cy.get('[data-cy=dialogo-nuevo-vinculo]').should('not.exist');
  });
});
