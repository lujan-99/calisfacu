import { fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import * as api from '../lib/api';
import { abrir, USUARIOS } from '../prueba-utils';

function ingresar(correo = 'rosa@ue.bo') {
  fireEvent.change(screen.getByLabelText('Correo electrónico'), { target: { value: correo } });
  fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: 'secreta' } });
  fireEvent.click(screen.getByRole('button', { name: 'Ingresar' }));
}

/** US-17, criterio 1 (T-012): cada rol entra a su pantalla y solo ve sus opciones. */
describe('Inicio de sesión y menú por rol (US-17)', () => {
  afterEach(() => vi.restoreAllMocks());

  it('debe mostrar el nombre de la institución en la pantalla de ingreso', async () => {
    abrir('/ingresar');
    expect(await screen.findByText('Unidad Educativa Juana Azurduy')).toBeInTheDocument();
    expect(screen.getByText('Código SIE 80980123')).toBeInTheDocument();
  });

  it('debe llevar al profesor a Mis materias con su menú', async () => {
    vi.spyOn(api, 'iniciarSesion').mockResolvedValue({ token: 't', usuario: USUARIOS.PROFESOR });
    vi.spyOn(api, 'misMaterias').mockResolvedValue([]);
    abrir('/ingresar');
    ingresar();
    expect(await screen.findByRole('heading', { name: 'Mis materias' })).toBeInTheDocument();
    const menu = screen.getByRole('navigation', { name: 'Menú del profesor' });
    expect(menu).toHaveTextContent('Mis materias');
    expect(menu).not.toHaveTextContent('Cursos');
    expect(screen.getByText('Rosa Mamani Condori')).toBeInTheDocument();
    expect(screen.getByText('Profesor')).toBeInTheDocument();
  });

  it.each([
    [
      'SECRETARIA',
      'Menú de la secretaria',
      [
        'Cursos',
        'Estudiantes',
        'Materias y asignaciones',
        'Control de entregas',
        'Unidad educativa',
      ],
    ],
    [
      'ADMINISTRADOR',
      'Menú del administrador',
      ['Dimensiones de evaluación', 'Solicitudes de edición'],
    ],
    ['PADRE', 'Menú del padre de familia', ['Boletín de mi hijo']],
  ] as const)('debe mostrar a %s solo sus opciones', async (rol, nombreMenu, opciones) => {
    vi.spyOn(api, 'listarGestiones').mockResolvedValue([]);
    vi.spyOn(api, 'listarCursos').mockResolvedValue([]);
    abrir('/', rol);
    const menu = await screen.findByRole('navigation', { name: nombreMenu });
    expect(Array.from(menu.querySelectorAll('a')).map((a) => a.textContent)).toEqual(opciones);
  });

  it('debe mostrar el error de la API sin revelar si el usuario existe', async () => {
    vi.spyOn(api, 'iniciarSesion').mockRejectedValue(
      new api.ErrorApi(401, 'Credenciales inválidas'),
    );
    abrir('/ingresar');
    ingresar();
    expect(await screen.findByRole('alert')).toHaveTextContent('Credenciales inválidas');
    expect(screen.getByRole('button', { name: 'Ingresar' })).toBeEnabled();
  });

  it('debe pedir el ingreso a quien abre una pantalla sin sesión', async () => {
    abrir('/secretaria/cursos');
    expect(await screen.findByRole('heading', { name: 'Iniciar sesión' })).toBeInTheDocument();
  });

  it('debe devolver a su inicio al profesor que escribe la dirección de otro rol', async () => {
    vi.spyOn(api, 'misMaterias').mockResolvedValue([]);
    const { enrutador } = abrir('/secretaria/cursos', 'PROFESOR');
    expect(await screen.findByRole('heading', { name: 'Mis materias' })).toBeInTheDocument();
    expect(enrutador.state.location.pathname).toBe('/profesor/materias');
  });

  it('debe cerrar la sesión con Salir', async () => {
    vi.spyOn(api, 'misMaterias').mockResolvedValue([]);
    abrir('/profesor/materias', 'PROFESOR');
    fireEvent.click(await screen.findByRole('button', { name: 'Salir' }));
    expect(await screen.findByRole('heading', { name: 'Iniciar sesión' })).toBeInTheDocument();
    expect(screen.queryByText('Su sesión expiró; vuelva a ingresar')).not.toBeInTheDocument();
  });

  it('debe avisar que la sesión expiró cuando la API responde 401', async () => {
    vi.spyOn(api, 'iniciarSesion').mockResolvedValue({ token: 't', usuario: USUARIOS.PROFESOR });
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{}', { status: 401 }));
    vi.spyOn(api, 'obtenerInstitucion').mockResolvedValue({
      nombre: null,
      codigoSie: null,
      colores: { marca: '#13283F', primario: '#1D4E89', acento: '#F2B33D' },
      logoVersion: null,
    });
    abrir('/ingresar');
    ingresar();
    expect(await screen.findByText('Su sesión expiró; vuelva a ingresar')).toBeInTheDocument();
  });

  it('debe mostrar una página de no encontrada dentro del marco', async () => {
    abrir('/profesor/no-existe', 'PROFESOR');
    expect(await screen.findByText('Esta página no existe')).toBeInTheDocument();
  });
});
