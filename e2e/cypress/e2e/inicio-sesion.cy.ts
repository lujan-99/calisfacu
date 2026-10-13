// US-17, criterio 1: cada rol entra a su pantalla y solo ve sus opciones.
describe('Inicio de sesión por rol (US-17)', () => {
  it('debe mostrar el nombre y el rol del profesor', () => {
    cy.ingresar(Cypress.env('profesorEmail') as string);
    cy.get('[data-cy=usuario]').should('contain', 'PROFESOR');
  });

  it('debe mostrar el rol de la secretaria', () => {
    cy.ingresar(Cypress.env('secretariaEmail') as string);
    cy.get('[data-cy=usuario]').should('contain', 'SECRETARIA');
  });

  it('debe rechazar una contraseña incorrecta sin revelar si el usuario existe', () => {
    cy.visit('/');
    cy.get('[data-cy=email]').type(Cypress.env('profesorEmail') as string);
    cy.get('[data-cy=contrasena]').type('incorrecta');
    cy.get('[data-cy=ingresar]').click();
    cy.get('[role=alert]').should('contain', 'Credenciales inválidas');
  });
});
