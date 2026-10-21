// US-05, criterios 1 y 2 (T-039): importación de notas desde Excel.
// El profesor pega o sube su planilla y previsualiza filas válidas y observadas antes de confirmar.

interface Sesion {
  token: string;
}

function prepararActividadParaImportar() {
  const nombre = `E2E Importar ${Date.now()}`;
  const api = String(Cypress.env('apiUrl') ?? 'http://localhost:3000');
  return cy
    .request<Sesion>('POST', `${api}/api/auth/login`, {
      email: Cypress.env('profesorEmail') as string,
      contrasena: String(Cypress.env('SEED_PASSWORD') ?? 'Calis2026!'),
    })
    .then(({ body }) => {
      return cy
        .request<{ id: number }>({
          method: 'POST',
          url: `${api}/api/notas/actividades`,
          headers: { Authorization: `Bearer ${body.token}` },
          body: { materiaId: 1, trimestreId: 1, dimensionId: 1, nombre },
        })
        .then(() => nombre);
    });
}

describe('Importación de calificaciones desde Excel (US-05, T-039)', () => {
  beforeEach(() => {
    prepararActividadParaImportar().then((nombre) => {
      cy.ingresar(Cypress.env('profesorEmail') as string);
      cy.contains('[data-cy=materia-item]', 'Matemática').click();
      cy.get('[data-cy=trimestre-1]').click();
      cy.get('[data-cy=tab-ser]').click();
      cy.contains('[data-cy=actividad-item]', nombre).click();
      cy.get('[data-cy=btn-importar-excel]').click();
      cy.get('[data-cy=importar-titulo]').should('have.text', nombre);
    });
  });

  it('debe previsualizar y discriminar filas válidas de filas con error antes de confirmar', () => {
    // Pegar contenido simulado de Excel con filas válidas y una fila con error (> 100)
    const contenidoExcel =
      'Apaza Condori, Miguel\t85\nEstudiante Ficticio Inexistente\t90\nFlores Quispe, Daniela\t120';
    cy.get('[data-cy=textarea-pegar-excel]').type(contenidoExcel);
    cy.get('[data-cy=btn-analizar-texto]').click();

    // Comprobar que se muestra la sección de vista previa
    cy.get('[data-cy=seccion-vista-previa]').should('be.visible');

    // Comprobar filas válidas
    cy.get('[data-cy=tab-ver-validas]').click();
    cy.get('[data-cy=tabla-filas-validas]').should('be.visible');
    cy.get('[data-cy=fila-valida]').should('have.length.at.least', 1);

    // Comprobar filas observadas con motivo de rechazo (criterio 2)
    cy.get('[data-cy=tab-ver-errores]').click();
    cy.get('[data-cy=tabla-filas-errores]').should('be.visible');
    cy.get('[data-cy=fila-error]').should('have.length.at.least', 1);
  });

  it('debe confirmar la importación y redirigir con aviso de éxito', () => {
    const contenidoValido = 'Apaza Condori, Miguel\t95';
    cy.get('[data-cy=textarea-pegar-excel]').type(contenidoValido);
    cy.get('[data-cy=btn-analizar-texto]').click();

    // Confirmar importación
    cy.get('[data-cy=btn-confirmar-importacion]').should('be.enabled').click();

    // Debe volver a la planilla y mostrar aviso de notas importadas
    cy.location('pathname').should('match', /\/profesor\/materias\/\d+\/actividades\/\d+$/);
    cy.get('[data-cy=planilla-exito]').should('contain', 'importación');
  });
});
