/// <reference types="cypress" />

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Cypress {
    interface Chainable {
      ingresar(email: string): Chainable<void>;
    }
  }
}

Cypress.Commands.add('ingresar', (email: string) => {
  const contrasena = String(Cypress.env('SEED_PASSWORD') ?? 'Calis2026!');
  cy.visit('/ingresar');
  cy.get('[data-cy=login-correo]').type(email);
  cy.get('[data-cy=login-contrasena]').type(contrasena, { log: false });
  cy.get('[data-cy=login-ingresar]').click();
  cy.get('[data-cy=usuario-nombre]').should('be.visible');
});

export {};
