// US-01, criterios 1 y 2 (T-021): el profesor llega a la planilla navegando (Mis materias → materia → dimensión →
// actividad), una nota fuera de la escala se rechaza junto al campo y la planilla completa se guarda.
// Cada ejecución crea su propia actividad por la API, así la prueba se repite en staging sin reiniciar la base.
// Usa la materia 1 (Matemática), el trimestre 1 y la dimensión 1 (Ser) del seed sintético.
interface Sesion {
  token: string;
}

function crearActividad() {
  const nombre = `E2E ${Date.now()}`;
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
        body: { materiaId: 1, trimestreId: 1, dimensionId: 1, nombre },
      }),
    )
    .then(() => nombre);
}

describe('Registrar calificación (US-01)', () => {
  beforeEach(() => {
    crearActividad().then((nombre) => {
      cy.ingresar(Cypress.env('profesorEmail') as string);
      cy.contains('[data-cy=materia-item]', 'Matemática').click();
      cy.get('[data-cy=trimestre-1]').click();
      cy.get('[data-cy=tab-ser]').click();
      cy.contains('[data-cy=actividad-item]', nombre).click();
      cy.get('[data-cy=planilla-titulo]').should('have.text', nombre);
    });
  });

  it('debe rechazar una nota fuera de 1 a 100 junto al campo y no guardar nada', () => {
    cy.get('[data-cy=nota-input]').first().type('120');
    cy.get('[data-cy=btn-guardar-notas]').click();
    cy.get('[data-cy=nota-error]').first().should('contain', 'La nota debe estar entre 1 y 100');
    cy.get('[data-cy=planilla-error-validacion]').should('contain', 'No se guardó ninguna nota');
  });

  it('debe guardar la planilla completa y mostrar las notas como registradas', () => {
    cy.get('[data-cy=nota-input]').each(($campo, i) => {
      cy.wrap($campo).type(String(60 + (i % 40)));
    });
    cy.get('[data-cy=btn-guardar-notas]').click();
    cy.get('[data-cy=planilla-exito]').should('contain', 'Se guardaron');
    cy.get('[data-cy=nota-input]').should('not.exist');
    cy.get('[data-cy=planilla-pendientes]').should(
      'have.text',
      'Todas las notas están registradas',
    );
  });
});
