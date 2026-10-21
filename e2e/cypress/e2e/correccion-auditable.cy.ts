// US-04, criterios 1 y 2 (T-033): corrección auditable de notas.
// El profesor corrige una nota registrada exigiendo un motivo obligatorio.
// El sistema guarda quién la cambió, cuándo, valor anterior y nuevo en una bitácora inmutable de solo lectura.
// Corregir exige una solicitud de edición aprobada por el administrador (decisión D16).

interface Sesion {
  token: string;
}

const urlApi = () => String(Cypress.env('apiUrl') ?? 'http://localhost:3000');
const contrasena = () => String(Cypress.env('SEED_PASSWORD') ?? 'Calis2026!');

/** El profesor pide la edición de la nota del estudiante 1 y el administrador la aprueba, por la API. */
function aprobarEdicion(tokenProfesor: string, actividadId: number) {
  return cy
    .request<{ id: number }>({
      method: 'POST',
      url: `${urlApi()}/api/solicitudes-edicion`,
      headers: { Authorization: `Bearer ${tokenProfesor}` },
      body: { actividadId, estudianteIds: [1], motivo: 'Revisión del examen (E2E)' },
    })
    .then(({ body: solicitud }) =>
      cy
        .request<Sesion>('POST', `${urlApi()}/api/auth/login`, {
          email: Cypress.env('adminEmail') as string,
          contrasena: contrasena(),
        })
        .then(({ body }) =>
          cy.request({
            method: 'PATCH',
            url: `${urlApi()}/api/solicitudes-edicion/${solicitud.id}/aprobar`,
            headers: { Authorization: `Bearer ${body.token}` },
          }),
        ),
    );
}

function prepararActividadConNota(aprobada = true) {
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
            .then(() => {
              if (aprobada) aprobarEdicion(body.token, act.body.id);
            })
            .then(() => nombre);
        });
    });
}

function abrirPlanilla(nombre: string) {
  cy.ingresar(Cypress.env('profesorEmail') as string);
  cy.contains('[data-cy=materia-item]', 'Matemática').click();
  cy.get('[data-cy=trimestre-1]').click();
  cy.get('[data-cy=tab-ser]').click();
  cy.contains('[data-cy=actividad-item]', nombre).click();
  cy.get('[data-cy=planilla-titulo]').should('have.text', nombre);
}

describe('Solicitud de edición aprobada en la bandeja del administrador (decisión D16)', () => {
  it('debe dejar corregir la nota solo después de que el administrador aprueba la solicitud', () => {
    prepararActividadConNota(false).then((nombre) => {
      abrirPlanilla(nombre);
      cy.get('[data-cy=btn-corregir-nota]').should('not.exist');
      cy.get('[data-cy=btn-pedir-edicion]').first().click();
      cy.get('[data-cy=solicitud-motivo]').type('Error de transcripción del examen');
      cy.get('[data-cy=btn-enviar-solicitud]').click();
      cy.get('[data-cy=solicitud-pendiente]').should('be.visible');

      cy.clearLocalStorage();
      cy.ingresar(Cypress.env('adminEmail') as string);
      cy.get('[data-cy=menu-solicitudes-edicion]').click();
      cy.contains('tr', nombre).contains('button', 'Aprobar').click();
      cy.get('[data-cy=mensaje-exito]').should('contain', 'aprobado');

      cy.clearLocalStorage();
      abrirPlanilla(nombre);
      cy.get('[data-cy=edicion-habilitada]').should('be.visible');
      cy.get('[data-cy=btn-corregir-nota]').should('be.visible');
    });
  });
});

describe('Corrección auditable de notas (US-04, T-033)', () => {
  beforeEach(() => {
    prepararActividadConNota().then(abrirPlanilla);
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
