// US-09, criterios 1 y 3 (T-057, T-059): la secretaria ve la planilla consolidada del curso con todas sus materias
// y, si falta alguna entrega, la lista de pendientes sin poder centralizar. No centraliza: así la prueba se repite
// contra staging sin cambiar sus datos (la centralización y la exportación se prueban en la API, centralizacion.e2e).

describe('Centralización de notas (US-09, T-057)', () => {
  beforeEach(() => {
    // Sin caché: un 304 llega sin cuerpo y la prueba necesita la planilla que recibe la pantalla.
    cy.intercept('GET', '**/api/centralizador/cursos/*', (req) => {
      delete req.headers['if-none-match'];
    }).as('planilla');
    cy.ingresar(Cypress.env('secretariaEmail') as string);
    cy.get('[data-cy=menu-centralizador]').click();
  });

  it('debe mostrar la planilla consolidada del curso con todas sus materias (criterio 1)', () => {
    cy.location('pathname').should('eq', '/secretaria/centralizador');
    cy.wait('@planilla').then(({ response }) => {
      expect(response?.statusCode).to.eq(200);
      const p = response?.body as {
        materias: { nombre: string }[];
        filas: { estudiante: string }[];
      };
      cy.get('[data-cy=tabla-centralizador]').within(() => {
        for (const m of p.materias) cy.contains('th', m.nombre);
        cy.get('tbody tr').should('have.length', p.filas.length);
        if (p.filas.length > 0) cy.contains('td', p.filas[0].estudiante);
      });
    });
  });

  it('debe listar las materias pendientes y no dejar centralizar si falta alguna (criterio 3)', () => {
    cy.wait('@planilla').then(({ response }) => {
      const p = response?.body as {
        todasEntregadas: boolean;
        centralizado: boolean;
        materiasPendientes: { materia: string }[];
      };
      if (p.todasEntregadas) {
        cy.get('[data-cy=alerta-todas-entregadas]').should('be.visible');
      } else {
        cy.get('[data-cy=lista-pendientes]').within(() => {
          for (const m of p.materiasPendientes) cy.contains(m.materia);
        });
        cy.get('[data-cy=boton-ejecutar-centralizacion]').should('be.disabled');
      }
      // La planilla oficial se exporta solo después de centralizar (D21).
      cy.get('[data-cy=boton-exportar-pdf]').should(p.centralizado ? 'be.enabled' : 'be.disabled');
    });
  });
});
