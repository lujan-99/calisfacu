// US-04, criterios 1 y 2 (T-033): corrección auditable de notas.
// El profesor corrige una nota registrada exigiendo un motivo obligatorio.
// El sistema guarda quién la cambió, cuándo, valor anterior y nuevo en una bitácora inmutable de solo lectura.

interface Sesion {
  token: string;
}

function prepararActividadConNota() {
  const nombre = `E2E Corrección ${Date.now()}`;
  const api = String(Cypress.env('apiUrl') ?? 'http://localhost:3000');
  return cy
    .request<Sesion>('POST', `${api}/api/auth/login`, {
      email: Cypress.env('profesorEmail') as string,
      contrasena: String(Cypress.env('SEED_PASSWORD') ?? 'Calis2026!'),
    })
    .then(({ body }) => {
      // 1. Crear actividad
      return cy
        .request<{ id: number }>({
          method: 'POST',
          url: `${api}/api/notas/actividades`,
          headers: { Authorization: `Bearer ${body.token}` },
          body: { materiaId: 1, trimestreId: 1, dimensionId: 1, nombre },
        })
        .then((act) => {
          // 2. Registrar nota inicial
          return cy
            .request({
              method: 'POST',
              url: `${api}/api/notas/planilla`,
              headers: { Authorization: `Bearer ${body.token}` },
              body: {
                actividadId: act.body.id,
                notas: [{ estudianteId: 1, valor: 70 }],
              },
            })
            .then(() => nombre);
        });
    });
}

describe('Corrección auditable de notas (US-04, T-033)', () => {
  beforeEach(() => {
    prepararActividadConNota().then((nombre) => {
      cy.ingresar(Cypress.env('profesorEmail') as string);
      cy.contains('[data-cy=materia-item]', 'Matemática').click();
      cy.get('[data-cy=trimestre-1]').click();
      cy.get('[data-cy=tab-ser]').click();
      cy.contains('[data-cy=actividad-item]', nombre).click();
      cy.get('[data-cy=planilla-titulo]').should('have.text', nombre);
    });
  });

  it('debe exigir motivo obligatorio para corregir una nota registrada', () => {
    cy.get('[data-cy=btn-corregir-nota]').first().click();
    cy.get('[data-cy=dialogo-corregir-nota]').should('be.visible');

    // Intentar guardar sin motivo
    cy.get('[data-cy=input-nueva-nota]').type('85');
    cy.get('[data-cy=btn-guardar-correccion]').click();
    cy.get('[data-cy=error-correccion]').should(
      'contain',
      'El motivo de la corrección es obligatorio',
    );
  });

  it('debe corregir la nota con motivo y mostrar el historial de auditoría inmutable', () => {
    cy.get('[data-cy=btn-corregir-nota]').first().click();
    cy.get('[data-cy=input-nueva-nota]').type('90');
    cy.get('[data-cy=textarea-motivo-correccion]').type(
      'Revisión presencial de la prueba y corrección de transcripción',
    );
    cy.get('[data-cy=btn-guardar-correccion]').click();

    // Comprobar que se actualiza la nota y se muestra el aviso
    cy.get('[data-cy=planilla-exito]').should('contain', 'corregida');
    cy.contains('[data-cy=nota-registrada]', '90').should('be.visible');

    // Abrir historial de auditoría (solo lectura)
    cy.get('[data-cy=btn-historial-nota]').first().click();
    cy.get('[data-cy=dialogo-historial-nota]').should('be.visible');
    cy.get('[data-cy=item-historial-auditoria]').should('contain', 'Corrección');
    cy.get('[data-cy=item-historial-auditoria]').should(
      'contain',
      'Revisión presencial de la prueba',
    );
  });
});
