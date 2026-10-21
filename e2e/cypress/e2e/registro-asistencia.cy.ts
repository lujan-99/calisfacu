// US-19, criterios 1 y 3 (T-037): registro y control de asistencia por clase.
// El profesor marca presentes, licencias o ausentes, el sistema impide fechas futuras y calcula el porcentaje según D5.

describe('Registro de asistencia por clase (US-19, T-037)', () => {
  beforeEach(() => {
    cy.ingresar(Cypress.env('profesorEmail') as string);
    cy.contains('[data-cy=materia-item]', 'Matemática').click();
    cy.get('[data-cy=link-asistencia-materia]').click();
  });

  it('debe registrar y guardar la asistencia de la clase para la fecha actual', () => {
    cy.get('[data-cy=asistencia-titulo]').should('be.visible');
    cy.get('[data-cy=tabla-toma-asistencia]').should('be.visible');

    // Usar acción rápida para marcar a todos presentes
    cy.get('[data-cy=btn-todos-presentes]').click();
    cy.get('[data-cy=resumen-marcados]').should('not.contain', 'pendientes de marcado');

    // Cambiar el primer estudiante a Licencia
    cy.get('[data-cy^=btn-licencia-]').first().click();

    // Guardar la asistencia
    cy.get('[data-cy=btn-guardar-asistencia]').should('be.enabled').click();

    // Comprobar mensaje de éxito
    cy.get('[data-cy=aviso-exito]').should('contain', 'Se guardó correctamente la asistencia');
  });

  it('debe impedir el registro de asistencia en fechas futuras (criterio 3)', () => {
    // Escribir una fecha del año 2099 (invoke('val') no dispara el onChange de React)
    cy.get('[data-cy=input-fecha-asistencia]').clear().type('2099-12-31');

    // Comprobar que aparece el aviso de bloqueo por fecha futura
    cy.get('[data-cy=aviso-fecha-futura]').should(
      'contain',
      'No se puede registrar asistencia de una fecha futura',
    );
    cy.get('[data-cy=btn-guardar-asistencia]').should('not.exist');
  });

  it('debe consultar la pestaña de porcentajes acumulados de asistencia (D5)', () => {
    cy.get('[data-cy=tab-porcentajes]').click();
    cy.get('[data-cy=tabla-porcentajes-asistencia]').should('be.visible');
    cy.get('[data-cy=fila-porcentaje-estudiante]').should('have.length.at.least', 1);
  });
});
