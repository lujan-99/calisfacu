// US-01, criterios 1 y 2: el profesor registra las notas de una actividad; una nota fuera de la escala se rechaza.
// Cada ejecución crea su propia actividad por la API, así la prueba se puede repetir en staging sin
// reiniciar la base. Usa la materia 1, el trimestre 1 y la dimensión 1 del seed sintético.
interface Sesion {
  token: string;
}

function crearActividad() {
  const api = String(Cypress.env('apiUrl') ?? 'http://localhost:3000');
  return cy
    .request<Sesion>('POST', `${api}/api/auth/login`, {
      email: Cypress.env('profesorEmail') as string,
      contrasena: String(Cypress.env('SEED_PASSWORD') ?? 'Calis2026!'),
    })
    .then(({ body }) =>
      cy.request<{ id: number }>({
        method: 'POST',
        url: `${api}/api/notas/actividades`,
        headers: { Authorization: `Bearer ${body.token}` },
        body: { materiaId: 1, trimestreId: 1, dimensionId: 1, nombre: `E2E ${Date.now()}` },
      }),
    )
    .then(({ body }) => body.id);
}

describe('Registrar calificación (US-01)', () => {
  beforeEach(() => {
    crearActividad().then((id) => {
      cy.ingresar(Cypress.env('profesorEmail') as string);
      cy.get('label').contains('Actividad').find('input').clear().type(String(id));
    });
  });

  it('debe rechazar una nota fuera de 1 a 100 junto al campo', () => {
    cy.get('[data-cy^=nota-]').first().clear().type('120');
    cy.get('[data-cy=guardar-planilla]').click();
    cy.contains('La nota debe estar entre 1 y 100').should('be.visible');
  });

  it('debe guardar la planilla completa', () => {
    cy.get('[data-cy^=nota-]').each(($campo, i) => {
      cy.wrap($campo)
        .clear()
        .type(String(60 + (i % 40)));
    });
    cy.get('[data-cy=guardar-planilla]').click();
    cy.get('[role=status]').should('contain', 'Se guardaron');
  });
});
