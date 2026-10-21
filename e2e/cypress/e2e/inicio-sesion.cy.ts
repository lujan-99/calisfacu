// US-17, criterio 1 (T-013): cada rol entra a su pantalla de inicio y solo ve las opciones de su rol.
const ROLES = [
  {
    rol: 'Profesor',
    email: 'profesorEmail',
    inicio: '/profesor/materias',
    menu: ['Mis materias'],
  },
  {
    rol: 'Secretaria',
    email: 'secretariaEmail',
    inicio: '/secretaria/cursos',
    menu: [
      'Cursos',
      'Estudiantes',
      'Materias y asignaciones',
      'Control de entregas',
      'Unidad educativa',
    ],
  },
  {
    rol: 'Administrador',
    email: 'adminEmail',
    inicio: '/admin/dimensiones',
    menu: ['Dimensiones de evaluación'],
  },
  { rol: 'Padre', email: 'padreEmail', inicio: '/padre/boletin', menu: ['Boletín de mi hijo'] },
];

describe('Inicio de sesión por rol (US-17)', () => {
  for (const r of ROLES) {
    it(`debe llevar al rol ${r.rol} a su inicio y mostrarle solo sus opciones`, () => {
      cy.ingresar(Cypress.env(r.email) as string);
      cy.location('pathname').should('eq', r.inicio);
      cy.get('[data-cy=usuario-rol]').should('have.text', r.rol);
      cy.get('nav a').then(($a) => {
        expect($a.toArray().map((a) => a.textContent?.trim())).to.deep.equal(r.menu);
      });
    });
  }

  it('debe devolver a su inicio al profesor que escribe la dirección de otro rol', () => {
    cy.ingresar(Cypress.env('profesorEmail') as string);
    cy.get('[data-cy=menu-mis-materias]').should('be.visible');
    // Navegación del lado del cliente: la sesión vive en memoria y una recarga la cerraría.
    cy.window().then((w) => {
      w.history.pushState({}, '', '/secretaria/cursos');
      w.dispatchEvent(new w.PopStateEvent('popstate'));
    });
    cy.location('pathname').should('eq', '/profesor/materias');
  });

  it('debe rechazar una contraseña incorrecta sin revelar si el usuario existe', () => {
    cy.visit('/ingresar');
    cy.get('[data-cy=login-correo]').type(Cypress.env('profesorEmail') as string);
    cy.get('[data-cy=login-contrasena]').type('incorrecta');
    cy.get('[data-cy=login-ingresar]').click();
    cy.get('[data-cy=login-error]').should('contain', 'Credenciales inválidas');
  });

  it('debe cerrar la sesión con Salir', () => {
    cy.ingresar(Cypress.env('secretariaEmail') as string);
    cy.get('[data-cy=btn-salir]').click();
    cy.location('pathname').should('eq', '/ingresar');
  });
});
