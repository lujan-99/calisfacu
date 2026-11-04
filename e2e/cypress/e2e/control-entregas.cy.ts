// US-10, criterio 1 (T-040): control de entrega de notas por curso para secretaría.
// La secretaria supervisa qué profesores ya entregaron sus notas y cuáles faltan antes del cierre del trimestre.

describe('Control de entrega de notas por curso (US-10, T-040)', () => {
  beforeEach(() => {
    // Sin caché: un 304 llega sin cuerpo y las pruebas necesitan saber qué materias hay en cada estado.
    cy.intercept('GET', '**/api/entregas*', (req) => {
      delete req.headers['if-none-match'];
    }).as('entregas');
    cy.ingresar(Cypress.env('secretariaEmail') as string);
    cy.get('[data-cy=menu-control-entregas]').click();
  });

  it('debe mostrar el estado de entrega (Entregado o Pendiente) de cada materia y profesor', () => {
    cy.location('pathname').should('eq', '/secretaria/control-entregas');
    cy.get('[data-cy=titulo-control-entregas]').should('be.visible');

    // Comprobar que existen materias listadas con profesor y estado
    cy.get('[data-cy=fila-entrega-materia]').should('have.length.at.least', 1);
    cy.get('[data-cy=profesor-nombre]').first().should('not.be.empty');
  });

  it('debe permitir filtrar por estado de entrega (pendientes vs entregados)', () => {
    // La base es compartida (staging): según lo que ya se entregó, puede no haber pendientes o entregadas.
    cy.wait('@entregas').then(({ response }) => {
      const estados = (response?.body as { estado: string }[]).map((x) => x.estado);
      const pendientes = estados.filter((e) => e === 'PENDIENTE').length;
      const entregadas = estados.length - pendientes;

      cy.get('[data-cy=filtro-estado]').select('PENDIENTE');
      cy.get('[data-cy=fila-entrega-materia]').should('have.length', pendientes);
      if (pendientes > 0) cy.get('[data-cy=badge-pendiente]').should('be.visible');

      cy.get('[data-cy=filtro-estado]').select('ENTREGADO');
      cy.get('[data-cy=fila-entrega-materia]').should('have.length', entregadas);
    });
  });

  it('debe permitir buscar materias o profesores por nombre', () => {
    cy.get('[data-cy=input-buscar-entrega]').type('Matemática');
    cy.get('[data-cy=fila-entrega-materia]').should('contain', 'Matemática');
  });
});
