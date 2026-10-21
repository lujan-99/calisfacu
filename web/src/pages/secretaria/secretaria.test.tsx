import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as api from '../../lib/api';
import { abrir, CURSO, GESTION, MATERIA } from '../../prueba-utils';

const CURSOS: api.Curso[] = [
  {
    id: 1,
    gestion: GESTION,
    nivel: 'SECUNDARIA',
    anioEscolaridad: 4,
    paralelo: 'A',
    nombre: 'Secundaria 4.º «A»',
    estudiantes: 30,
    materias: 4,
  },
  {
    id: 2,
    gestion: GESTION,
    nivel: 'PRIMARIA',
    anioEscolaridad: 1,
    paralelo: 'B',
    nombre: 'Primaria 1.º «B»',
    estudiantes: 0,
    materias: 0,
  },
];

afterEach(() => vi.restoreAllMocks());
beforeEach(() => {
  vi.spyOn(api, 'listarGestiones').mockResolvedValue([GESTION, { id: 2, anio: 2025 }]);
  vi.spyOn(api, 'listarCursos').mockResolvedValue(CURSOS);
});

describe('Cursos (US-18, criterio 1)', () => {
  it('debe listar los cursos de la gestión y filtrar por nivel', async () => {
    abrir('/secretaria/cursos', 'SECRETARIA');
    expect(await screen.findAllByRole('row')).toHaveLength(3);
    fireEvent.change(screen.getByLabelText('Nivel'), { target: { value: 'PRIMARIA' } });
    await waitFor(() =>
      expect(api.listarCursos).toHaveBeenLastCalledWith({ gestionId: 1, nivel: 'PRIMARIA' }),
    );
  });

  it('debe registrar un curso y mostrar el mensaje de éxito', async () => {
    const crear = vi
      .spyOn(api, 'crearCurso')
      .mockResolvedValue({ ...CURSOS[1], id: 3, paralelo: 'C', nombre: 'Primaria 1.º «C»' });
    abrir('/secretaria/cursos', 'SECRETARIA');
    fireEvent.click(await screen.findByRole('button', { name: 'Nuevo curso' }));
    const dialogo = screen.getByRole('dialog', { name: 'Nuevo curso' });
    fireEvent.change(within(dialogo).getByLabelText('Nivel'), { target: { value: 'PRIMARIA' } });
    fireEvent.change(within(dialogo).getByLabelText('Paralelo'), { target: { value: 'c' } });
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Guardar curso' }));
    expect(await screen.findByText('Se guardó el curso Primaria 1.º «C»')).toBeInTheDocument();
    expect(crear).toHaveBeenCalledWith({
      gestionId: 1,
      nivel: 'PRIMARIA',
      anioEscolaridad: 1,
      paralelo: 'C',
    });
  });

  it('debe mostrar en el formulario el rechazo de un curso repetido', async () => {
    vi.spyOn(api, 'crearCurso').mockRejectedValue(
      new api.ErrorApi(409, 'Ya existe el curso Secundaria 1.º «A» en la gestión 2026'),
    );
    abrir('/secretaria/cursos', 'SECRETARIA');
    fireEvent.click(await screen.findByRole('button', { name: 'Nuevo curso' }));
    fireEvent.click(screen.getByRole('button', { name: 'Guardar curso' }));
    const dialogo = await screen.findByRole('dialog');
    expect(await within(dialogo).findByRole('alert')).toHaveTextContent(
      'Ya existe el curso Secundaria 1.º «A»',
    );
  });

  it('debe limitar los años al nivel elegido (Inicial tiene 2)', async () => {
    abrir('/secretaria/cursos', 'SECRETARIA');
    fireEvent.click(await screen.findByRole('button', { name: 'Nuevo curso' }));
    fireEvent.change(screen.getByLabelText('Nivel', { selector: '[data-cy=curso-nivel]' }), {
      target: { value: 'INICIAL' },
    });
    expect(within(screen.getByLabelText('Año de escolaridad')).getAllByRole('option')).toHaveLength(
      2,
    );
  });

  it('debe pedir confirmación antes de eliminar y mostrar si la API lo impide', async () => {
    const borrar = vi
      .spyOn(api, 'borrarCurso')
      .mockRejectedValue(
        new api.ErrorApi(
          422,
          'El curso tiene 30 estudiante(s) y 4 materia(s): quítelos antes de borrarlo',
        ),
      );
    abrir('/secretaria/cursos', 'SECRETARIA');
    fireEvent.click(await screen.findByRole('button', { name: 'Eliminar Secundaria 4.º «A»' }));
    const confirmar = screen.getByRole('alertdialog', { name: '¿Eliminar este curso?' });
    expect(confirmar).toHaveTextContent(
      'Se eliminará Secundaria 4.º «A». Esta acción no se puede deshacer.',
    );
    fireEvent.click(within(confirmar).getByRole('button', { name: 'Eliminar' }));
    expect(await screen.findByText(/quítelos antes de borrarlo/)).toBeInTheDocument();
    expect(borrar).toHaveBeenCalledWith(1);
  });

  it('debe editar un curso sin cambiar su gestión', async () => {
    const actualizar = vi.spyOn(api, 'actualizarCurso').mockResolvedValue(CURSOS[0]);
    abrir('/secretaria/cursos', 'SECRETARIA');
    fireEvent.click(await screen.findByRole('button', { name: 'Editar Secundaria 4.º «A»' }));
    expect(
      screen.getByLabelText('Gestión', { selector: '[data-cy=curso-gestion]' }),
    ).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Guardar curso' }));
    await waitFor(() =>
      expect(actualizar).toHaveBeenCalledWith(1, {
        nivel: 'SECUNDARIA',
        anioEscolaridad: 4,
        paralelo: 'A',
      }),
    );
  });
});

describe('Estudiantes (US-18, criterio 3)', () => {
  const ESTUDIANTE: api.Estudiante = {
    id: 9,
    codigoRude: '80800012345678',
    nombres: 'Miguel',
    apellidos: 'Apaza Condori',
    curso: CURSO,
    gestion: GESTION,
  };

  it('debe buscar por apellido después de que el usuario deja de escribir', async () => {
    const listar = vi.spyOn(api, 'listarEstudiantes').mockResolvedValue([ESTUDIANTE]);
    abrir('/secretaria/estudiantes', 'SECRETARIA');
    expect(await screen.findByText('Apaza Condori')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Apellido'), { target: { value: 'apa' } });
    await waitFor(() =>
      expect(listar).toHaveBeenLastCalledWith({ cursoId: undefined, apellido: 'apa' }),
    );
  });

  it('debe validar el RUDE, los nombres y el curso antes de enviar', async () => {
    vi.spyOn(api, 'listarEstudiantes').mockResolvedValue([]);
    const crear = vi.spyOn(api, 'crearEstudiante');
    abrir('/secretaria/estudiantes', 'SECRETARIA');
    fireEvent.click(await screen.findByRole('button', { name: 'Nuevo estudiante' }));
    fireEvent.change(screen.getByLabelText(/Código RUDE/), { target: { value: 'R-1' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar estudiante' }));
    expect(
      screen.getByText('El código RUDE debe tener de 6 a 20 letras o números'),
    ).toBeInTheDocument();
    expect(screen.getByText('Escriba los nombres')).toBeInTheDocument();
    expect(
      screen.getByText('Seleccione un curso', { selector: '.campo-error' }),
    ).toBeInTheDocument();
    expect(crear).not.toHaveBeenCalled();
  });

  it('debe mostrar en qué curso ya está inscrito el estudiante', async () => {
    vi.spyOn(api, 'listarEstudiantes').mockResolvedValue([]);
    vi.spyOn(api, 'crearEstudiante').mockRejectedValue(
      new api.ErrorApi(
        409,
        'El estudiante con RUDE 80800012345678 ya está inscrito en Secundaria 4.º «A» en la gestión 2026',
      ),
    );
    abrir('/secretaria/estudiantes', 'SECRETARIA');
    fireEvent.click(await screen.findByRole('button', { name: 'Nuevo estudiante' }));
    const d = screen.getByRole('dialog');
    fireEvent.change(within(d).getByLabelText('Apellidos'), { target: { value: 'Apaza' } });
    fireEvent.change(within(d).getByLabelText('Nombres'), { target: { value: 'Miguel' } });
    fireEvent.change(within(d).getByLabelText(/Código RUDE/), {
      target: { value: '80800012345678' },
    });
    fireEvent.change(within(d).getByLabelText('Curso'), { target: { value: '2' } });
    fireEvent.click(within(d).getByRole('button', { name: 'Guardar estudiante' }));
    expect(await within(d).findByRole('alert')).toHaveTextContent(
      'ya está inscrito en Secundaria 4.º «A»',
    );
  });

  it('debe avisar si ningún estudiante coincide con el filtro', async () => {
    vi.spyOn(api, 'listarEstudiantes').mockResolvedValue([]);
    abrir('/secretaria/estudiantes', 'SECRETARIA');
    fireEvent.change(await screen.findByLabelText('Curso'), { target: { value: '2' } });
    expect(
      await screen.findByText('Ningún estudiante coincide con el filtro.'),
    ).toBeInTheDocument();
  });

  it('debe mostrar la advertencia de impacto de borrado seguro con técnica de burbuja', async () => {
    vi.spyOn(api, 'listarEstudiantes').mockResolvedValue([ESTUDIANTE]);
    abrir('/secretaria/estudiantes', 'SECRETARIA');
    fireEvent.click(
      await screen.findByRole('button', { name: 'Eliminar a Apaza Condori, Miguel' }),
    );
    const dialogo = await screen.findByRole('alertdialog', { name: '¿Eliminar este estudiante?' });
    expect(dialogo).toHaveTextContent('Advertencia de Impacto Académico (Técnica de Burbuja)');
  });
});

describe('Materias y asignaciones', () => {
  beforeEach(() => {
    vi.spyOn(api, 'listarProfesores').mockResolvedValue([{ id: 3, nombre: 'Rosa Mamani Condori' }]);
  });

  it('debe listar las materias con su profesor', async () => {
    vi.spyOn(api, 'listarMaterias').mockResolvedValue([MATERIA]);
    abrir('/secretaria/materias', 'SECRETARIA');
    const fila = (await screen.findAllByRole('row'))[1];
    expect(fila).toHaveTextContent('Secundaria 4.º «A»MatemáticaRosa Mamani Condori');
  });

  it('debe exigir el profesor y crear la materia con su asignación', async () => {
    vi.spyOn(api, 'listarMaterias').mockResolvedValue([]);
    const crear = vi.spyOn(api, 'crearMateria').mockResolvedValue(MATERIA);
    abrir('/secretaria/materias', 'SECRETARIA');
    fireEvent.click(await screen.findByRole('button', { name: 'Nueva materia' }));
    const d = screen.getByRole('dialog');
    fireEvent.change(within(d).getByLabelText('Curso'), { target: { value: '1' } });
    fireEvent.change(within(d).getByLabelText('Nombre de la materia'), {
      target: { value: 'Matemática' },
    });
    fireEvent.click(within(d).getByRole('button', { name: 'Guardar materia' }));
    expect(
      within(d).getByText('Seleccione un profesor', { selector: '.campo-error' }),
    ).toBeInTheDocument();
    fireEvent.change(within(d).getByLabelText(/^Profesor/), { target: { value: '3' } });
    fireEvent.click(within(d).getByRole('button', { name: 'Guardar materia' }));
    expect(
      await screen.findByText('Se guardó Matemática de Secundaria 4.º «A»'),
    ).toBeInTheDocument();
    expect(crear).toHaveBeenCalledWith({ cursoId: 1, nombre: 'Matemática', profesorId: 3 });
  });
});

describe('Unidad educativa (US-18, criterio 5)', () => {
  it('debe validar el código SIE y guardar los datos', async () => {
    vi.spyOn(api, 'obtenerUnidadEducativa').mockResolvedValue({
      id: 1,
      nombre: 'U. E. de prueba',
      codigoSie: '80000001',
      colores: { marca: '#13283F', primario: '#1D4E89', acento: '#F2B33D' },
      logoVersion: null,
    });
    const guardar = vi
      .spyOn(api, 'guardarUnidadEducativa')
      .mockResolvedValue({} as api.UnidadEducativa);
    abrir('/secretaria/unidad-educativa', 'SECRETARIA');
    const sie = await screen.findByLabelText(/Código SIE/);
    await waitFor(() => expect(sie).toHaveValue('80000001'));
    fireEvent.change(sie, { target: { value: '123' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));
    expect(screen.getByText('El código SIE debe tener 8 dígitos')).toBeInTheDocument();
    fireEvent.change(sie, { target: { value: '80980123' } });
    fireEvent.change(screen.getByLabelText('Nombre'), { target: { value: 'U. E. Juana Azurduy' } });
    expect(screen.getByText('Código SIE: 80980123')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));
    expect(
      await screen.findByText('Se guardaron los datos de la unidad educativa'),
    ).toBeInTheDocument();
    expect(guardar).toHaveBeenCalledWith({ nombre: 'U. E. Juana Azurduy', codigoSie: '80980123' });
  });

  it('debe ofrecer el formulario vacío si todavía no hay datos', async () => {
    vi.spyOn(api, 'obtenerUnidadEducativa').mockRejectedValue(
      new api.ErrorApi(404, 'Todavía no se registraron'),
    );
    abrir('/secretaria/unidad-educativa', 'SECRETARIA');
    expect(
      await screen.findByText(/Todavía no hay datos de la unidad educativa/),
    ).toBeInTheDocument();
  });
});

describe('Control de entrega de notas (US-10, criterio 1)', () => {
  const entregasMock: api.EntregaMateria[] = [
    {
      materiaId: 1,
      materia: 'Matemática',
      cursoId: 1,
      curso: 'Secundaria 4.º «A»',
      profesorId: 10,
      profesor: 'Rosa Mamani Condori',
      trimestreId: 1,
      trimestreNumero: 1,
      estado: 'ENTREGADO',
      fechaEntrega: '2026-04-10T12:00:00Z',
      totalActividades: 3,
      totalEstudiantes: 30,
      totalNotasRegistradas: 90,
      totalNotasRequeridas: 90,
      notasFaltantes: 0,
    },
    {
      materiaId: 2,
      materia: 'Física',
      cursoId: 1,
      curso: 'Secundaria 4.º «A»',
      profesorId: 11,
      profesor: 'Carlos Lujan',
      trimestreId: 1,
      trimestreNumero: 1,
      estado: 'PENDIENTE',
      fechaEntrega: null,
      totalActividades: 2,
      totalEstudiantes: 30,
      totalNotasRegistradas: 45,
      totalNotasRequeridas: 60,
      notasFaltantes: 15,
    },
    {
      materiaId: 3,
      materia: 'Lenguaje',
      cursoId: 2,
      curso: 'Primaria 1.º «B»',
      profesorId: 12,
      profesor: 'Elena Galvan',
      trimestreId: 1,
      trimestreNumero: 1,
      estado: 'PENDIENTE',
      fechaEntrega: null,
      totalActividades: 1,
      totalEstudiantes: 20,
      totalNotasRegistradas: 10,
      totalNotasRequeridas: 20,
      notasFaltantes: 10,
    },
  ];

  beforeEach(() => {
    vi.spyOn(api, 'listarTrimestres').mockResolvedValue([
      { id: 1, numero: 1, cerrado: false },
      { id: 2, numero: 2, cerrado: false },
    ]);
    vi.spyOn(api, 'obtenerControlEntregas').mockResolvedValue(entregasMock);
  });

  it('debe listar por curso cada materia con su profesor y su estado Entregado o Pendiente (US-10, criterio 1)', async () => {
    abrir('/secretaria/control-entregas', 'SECRETARIA');
    expect(
      await screen.findByRole('heading', { name: /Control de Entrega de Notas por Curso/i }),
    ).toBeInTheDocument();

    // Comprobar cursos agrupados
    expect(
      screen.getByRole('heading', { level: 3, name: 'Secundaria 4.º «A»' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 3, name: 'Primaria 1.º «B»' })).toBeInTheDocument();

    // Comprobar materias y profesores
    expect(screen.getByText('Matemática')).toBeInTheDocument();
    expect(screen.getByText('Rosa Mamani Condori')).toBeInTheDocument();
    expect(screen.getByText('Física')).toBeInTheDocument();
    expect(screen.getByText('Carlos Lujan')).toBeInTheDocument();

    // Estados
    const entregados = screen.getAllByText(/Entregado/i);
    expect(entregados.length).toBeGreaterThan(0);
    const pendientes = screen.getAllByText(/Pendiente/i);
    expect(pendientes.length).toBeGreaterThan(0);
  });

  it('debe filtrar materias por estado y buscar por profesor (US-10, criterio 1)', async () => {
    abrir('/secretaria/control-entregas', 'SECRETARIA');
    await screen.findByRole('heading', { name: /Control de Entrega de Notas por Curso/i });

    // Filtrar solo pendientes
    fireEvent.change(screen.getByLabelText(/Filtrar por estado/i), {
      target: { value: 'PENDIENTE' },
    });
    expect(screen.queryByText('Matemática')).not.toBeInTheDocument();
    expect(screen.getByText('Física')).toBeInTheDocument();
    expect(screen.getByText('Lenguaje')).toBeInTheDocument();

    // Buscar profesor
    fireEvent.change(screen.getByPlaceholderText(/Ej: Matemática, Carlos Lujan…/i), {
      target: { value: 'Lujan' },
    });
    expect(screen.getByText('Física')).toBeInTheDocument();
    expect(screen.queryByText('Lenguaje')).not.toBeInTheDocument();
  });
});
