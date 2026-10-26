import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as api from '../../lib/api';
import * as boletinLib from '../../lib/boletin';
import * as riesgoLib from '../../lib/riesgo';
import { abrir, DIMENSIONES, MATERIA, TRIMESTRES } from '../../prueba-utils';
import { trimestrePorDefecto } from './MateriaActividades';
import { textoPendiente } from './NotasTrimestre';

afterEach(() => vi.restoreAllMocks());

describe('Mis materias (US-18, criterio 2)', () => {
  it('debe mostrar solo las materias del profesor, cada una con su curso', async () => {
    vi.spyOn(api, 'misMaterias').mockResolvedValue([
      MATERIA,
      { ...MATERIA, id: 8, nombre: 'Física' },
    ]);
    abrir('/profesor/materias', 'PROFESOR');
    const tarjetas = await screen.findAllByRole('link', { name: /Ver actividades/ });
    expect(tarjetas).toHaveLength(2);
    expect(tarjetas[0]).toHaveTextContent('Matemática');
    expect(tarjetas[0]).toHaveTextContent('Secundaria 4.º «A»');
    expect(tarjetas[0]).toHaveAttribute('href', '/profesor/materias/7');
    expect(screen.getByText(/Gestión 2026 · elija una materia/)).toBeInTheDocument();
  });

  it('debe avisar si no tiene materias asignadas', async () => {
    vi.spyOn(api, 'misMaterias').mockResolvedValue([]);
    abrir('/profesor/materias', 'PROFESOR');
    expect(
      await screen.findByText('No tiene materias asignadas en esta gestión'),
    ).toBeInTheDocument();
  });

  it('debe mostrar el error y permitir reintentar', async () => {
    const llamada = vi
      .spyOn(api, 'misMaterias')
      .mockRejectedValueOnce(new Error('Sin conexión'))
      .mockResolvedValueOnce([MATERIA]);
    abrir('/profesor/materias', 'PROFESOR');
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No se pudieron cargar sus materias. Sin conexión',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(await screen.findByText('Matemática')).toBeInTheDocument();
    expect(llamada).toHaveBeenCalledTimes(2);
  });
});

describe('Materia y actividades (T-020)', () => {
  beforeEach(() => {
    vi.spyOn(api, 'obtenerMateria').mockResolvedValue(MATERIA);
    vi.spyOn(api, 'listarTrimestres').mockResolvedValue(TRIMESTRES);
    vi.spyOn(api, 'listarDimensiones').mockResolvedValue(DIMENSIONES);
  });

  it('debe elegir por defecto el trimestre en curso: el primero abierto', () => {
    expect(trimestrePorDefecto(TRIMESTRES)?.numero).toBe(2);
    expect(trimestrePorDefecto(TRIMESTRES.map((t) => ({ ...t, cerrado: true })))?.numero).toBe(3);
    expect(trimestrePorDefecto([])).toBeUndefined();
  });

  it('debe listar las actividades de la dimensión elegida con su avance', async () => {
    const listar = vi.spyOn(api, 'listarActividades').mockResolvedValue({
      estudiantes: 30,
      actividades: [
        {
          id: 1,
          nombre: 'Participación',
          dimension: { id: 11, codigo: 'SER', nombre: 'Ser' },
          notasRegistradas: 30,
        },
        {
          id: 2,
          nombre: 'Examen 1',
          dimension: { id: 12, codigo: 'SABER', nombre: 'Saber' },
          notasRegistradas: 28,
        },
      ],
    });
    abrir('/profesor/materias/7', 'PROFESOR');
    expect(await screen.findByText('Participación')).toBeInTheDocument();
    expect(listar).toHaveBeenCalledWith(7, 22);
    expect(screen.queryByText('Examen 1')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: /Saber/ }));
    expect(await screen.findByText('Examen 1')).toBeInTheDocument();
    expect(screen.getByText('28/30 notas')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Examen 1/ })).toHaveAttribute(
      'href',
      '/profesor/materias/7/actividades/2',
    );
  });

  it('debe avisar que el trimestre está cerrado y no dejar crear actividades (US-18, criterio 4)', async () => {
    vi.spyOn(api, 'listarActividades').mockResolvedValue({ estudiantes: 30, actividades: [] });
    abrir('/profesor/materias/7?trimestre=21', 'PROFESOR');
    expect(await screen.findByText(/El 1.er trimestre está cerrado/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Nueva actividad' })).toBeDisabled();
  });

  it('debe exigir el nombre y crear la actividad en el trimestre y la dimensión elegidos', async () => {
    vi.spyOn(api, 'listarActividades').mockResolvedValue({ estudiantes: 30, actividades: [] });
    const crear = vi.spyOn(api, 'crearActividad').mockResolvedValue({ id: 9, nombre: 'Práctica' });
    abrir('/profesor/materias/7?dimension=HACER', 'PROFESOR');
    fireEvent.click(await screen.findByRole('button', { name: 'Nueva actividad' }));
    fireEvent.click(screen.getByRole('button', { name: 'Crear actividad' }));
    expect(screen.getByText('Escriba el nombre de la actividad')).toBeInTheDocument();
    expect(crear).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText('Nombre de la actividad'), {
      target: { value: ' Práctica ' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Crear actividad' }));
    await waitFor(() =>
      expect(crear).toHaveBeenCalledWith({
        materiaId: 7,
        trimestreId: 22,
        dimensionId: 13,
        nombre: 'Práctica',
      }),
    );
  });
});

describe('Planilla de notas (US-01, criterios 1 a 3)', () => {
  const planilla = (cerrado = false): api.Planilla => ({
    actividad: {
      id: 5,
      nombre: 'Práctica: funciones cuadráticas',
      dimension: 'Saber',
      materia: 'Matemática',
      materiaId: 7,
      curso: 'Secundaria 4.º «A»',
      trimestre: { id: 23, numero: 3, cerrado },
    },
    filas: [
      { estudianteId: 1, estudiante: 'Apaza Condori, Miguel', valor: 78 },
      { estudianteId: 2, estudiante: 'Choque Huanca, Rosa', valor: null },
      { estudianteId: 3, estudiante: 'Flores Quispe, Daniela', valor: 85.5 },
      { estudianteId: 4, estudiante: 'Mamani Torrez, Luis', valor: null },
    ],
  });
  const ruta = '/profesor/materias/7/actividades/5';
  const campo = (nombre: string) => screen.getByLabelText(`Nota de ${nombre}`);

  it('debe mostrar las notas registradas con coma y sin poder cambiarlas', async () => {
    vi.spyOn(api, 'obtenerPlanilla').mockResolvedValue(planilla());
    abrir(ruta, 'PROFESOR');
    expect(await screen.findByText('85,5')).toBeInTheDocument();
    expect(screen.getAllByText('Registrada')).toHaveLength(2);
    expect(screen.queryByLabelText('Nota de Apaza Condori, Miguel')).not.toBeInTheDocument();
    expect(
      screen.getByText(/Matemática · Secundaria 4.º «A» · 3.er trimestre/),
    ).toBeInTheDocument();
  });

  it('debe marcar una nota fuera de 1 a 100 junto al campo y no guardar nada', async () => {
    vi.spyOn(api, 'obtenerPlanilla').mockResolvedValue(planilla());
    const guardar = vi.spyOn(api, 'guardarPlanilla');
    abrir(ruta, 'PROFESOR');
    fireEvent.change(await screen.findByLabelText('Nota de Choque Huanca, Rosa'), {
      target: { value: '105' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar notas' }));
    expect(await screen.findByText('La nota debe estar entre 1 y 100')).toBeInTheDocument();
    expect(screen.getByText('Ingrese una nota')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent(
      'No se guardó ninguna nota. Corrija 2 nota(s)',
    );
    expect(campo('Choque Huanca, Rosa')).toHaveAttribute('aria-invalid', 'true');
    expect(guardar).not.toHaveBeenCalled();
  });

  it('debe guardar todas las notas pendientes juntas y mostrarlas como registradas', async () => {
    // Después de guardar, la pantalla vuelve a leer la planilla para tener el id de cada nota (US-04).
    const guardada = planilla();
    guardada.filas[1] = { ...guardada.filas[1], valor: 72.5, notaId: 12 };
    guardada.filas[3] = { ...guardada.filas[3], valor: 51, notaId: 14 };
    vi.spyOn(api, 'obtenerPlanilla')
      .mockResolvedValueOnce(planilla())
      .mockResolvedValueOnce(guardada);
    const guardar = vi.spyOn(api, 'guardarPlanilla').mockResolvedValue({ guardadas: 2 });
    abrir(ruta, 'PROFESOR');
    expect(screen.queryByRole('button', { name: 'Guardar notas' })).not.toBeInTheDocument();
    fireEvent.change(await screen.findByLabelText('Nota de Choque Huanca, Rosa'), {
      target: { value: '72,5' },
    });
    expect(screen.getByText('1 de 2 notas escritas, sin guardar')).toBeInTheDocument();
    fireEvent.change(campo('Mamani Torrez, Luis'), { target: { value: '51' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar notas' }));
    expect(await screen.findByText('Se guardaron 2 notas')).toBeInTheDocument();
    expect(guardar).toHaveBeenCalledWith(5, [
      { estudianteId: 2, valor: 72.5 },
      { estudianteId: 4, valor: 51 },
    ]);
    expect(screen.getByText('72,5')).toBeInTheDocument();
    expect(screen.getByText('Todas las notas están registradas')).toBeInTheDocument();
  });

  it('debe mostrar el aviso con el que vuelve la importación desde Excel (US-05)', async () => {
    vi.spyOn(api, 'obtenerPlanilla').mockResolvedValue(planilla());
    abrir(
      { pathname: ruta, state: { mensajeExito: 'Se importaron 3 calificaciones' } },
      'PROFESOR',
    );
    expect(await screen.findByText('Se importaron 3 calificaciones')).toBeInTheDocument();
  });

  it('debe mostrar el rechazo de la API sin perder lo escrito', async () => {
    vi.spyOn(api, 'obtenerPlanilla').mockResolvedValue(planilla());
    vi.spyOn(api, 'guardarPlanilla').mockRejectedValue(
      new api.ErrorApi(422, 'El trimestre está cerrado: no se pueden registrar ni corregir notas'),
    );
    abrir(ruta, 'PROFESOR');
    fireEvent.change(await screen.findByLabelText('Nota de Choque Huanca, Rosa'), {
      target: { value: '70' },
    });
    fireEvent.change(campo('Mamani Torrez, Luis'), { target: { value: '80' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar notas' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No se guardó ninguna nota. El trimestre está cerrado',
    );
    expect(campo('Choque Huanca, Rosa')).toHaveValue('70');
  });

  it('debe pasar al siguiente estudiante con Enter', async () => {
    vi.spyOn(api, 'obtenerPlanilla').mockResolvedValue(planilla());
    abrir(ruta, 'PROFESOR');
    const primero = await screen.findByLabelText('Nota de Choque Huanca, Rosa');
    primero.focus();
    fireEvent.keyDown(primero, { key: 'Enter' });
    expect(campo('Mamani Torrez, Luis')).toHaveFocus();
  });

  it('debe desactivar la planilla de un trimestre cerrado', async () => {
    vi.spyOn(api, 'obtenerPlanilla').mockResolvedValue(planilla(true));
    abrir(ruta, 'PROFESOR');
    expect(
      await screen.findByText(/está cerrado: no se pueden registrar notas/),
    ).toBeInTheDocument();
    expect(campo('Choque Huanca, Rosa')).toBeDisabled();
  });

  it('debe preguntar antes de salir con notas sin guardar', async () => {
    vi.spyOn(api, 'obtenerPlanilla').mockResolvedValue(planilla());
    vi.spyOn(api, 'misMaterias').mockResolvedValue([]);
    const { enrutador } = abrir(ruta, 'PROFESOR');
    fireEvent.change(await screen.findByLabelText('Nota de Choque Huanca, Rosa'), {
      target: { value: '70' },
    });
    fireEvent.click(screen.getByRole('link', { name: 'Mis materias' }));
    const dialogo = await screen.findByRole('dialog', { name: '¿Salir sin guardar?' });
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Seguir editando' }));
    expect(enrutador.state.location.pathname).toBe(ruta);
    expect(campo('Choque Huanca, Rosa')).toHaveValue('70');
    fireEvent.click(screen.getByRole('link', { name: 'Mis materias' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Salir sin guardar' }));
    await waitFor(() => expect(enrutador.state.location.pathname).toBe('/profesor/materias'));
  });
});

describe('Notas del trimestre (US-02, T-024)', () => {
  it('debe nombrar las dimensiones que faltan (decisión D4)', () => {
    expect(textoPendiente(['HACER'], DIMENSIONES)).toBe('Pendiente: falta Hacer');
    expect(textoPendiente(['SABER', 'HACER'], DIMENSIONES)).toBe('Pendiente: falta Saber y Hacer');
    expect(textoPendiente(['SER', 'SABER', 'HACER'], DIMENSIONES)).toBe(
      'Pendiente: falta Ser, Saber y Hacer',
    );
  });

  it('debe mostrar los puntos que calcula la API, la nota y el estado de cada estudiante', async () => {
    vi.spyOn(api, 'obtenerMateria').mockResolvedValue(MATERIA);
    vi.spyOn(api, 'listarTrimestres').mockResolvedValue(TRIMESTRES);
    vi.spyOn(api, 'listarDimensiones').mockResolvedValue(DIMENSIONES);
    const pts = (
      ser: number | null,
      saber: number | null,
      hacer: number | null,
      auto: number | null,
    ) => [
      { codigo: 'SER', puntos: ser },
      { codigo: 'SABER', puntos: saber },
      { codigo: 'HACER', puntos: hacer },
      { codigo: 'AUTOEVALUACION', puntos: auto },
    ];
    vi.spyOn(api, 'notasTrimestrales').mockResolvedValue([
      {
        estudianteId: 1,
        estudiante: 'Mamani Torrez, Luis',
        dimensiones: pts(10, 22.5, 16, 2),
        nota: 51,
        aprobado: true,
        pendientes: [],
      },
      {
        estudianteId: 2,
        estudiante: 'Ticona Apaza, Jhonny',
        dimensiones: pts(6, 20, 14, 3),
        nota: 43,
        aprobado: false,
        pendientes: [],
      },
      {
        estudianteId: 3,
        estudiante: 'Rojas Vargas, Camila',
        dimensiones: pts(9, null, null, 4),
        nota: null,
        aprobado: null,
        pendientes: ['SABER', 'HACER'],
      },
    ]);
    abrir('/profesor/materias/7/notas?trimestre=22', 'PROFESOR');
    const filas = await screen.findAllByRole('row');
    expect(within(filas[1]).getByText('22,5')).toBeInTheDocument();
    expect(within(filas[1]).getByText('Aprueba')).toBeInTheDocument();
    expect(within(filas[2]).getByText('Reprueba')).toBeInTheDocument();
    expect(within(filas[3]).getByText('Pendiente: falta Saber y Hacer')).toBeInTheDocument();
    expect(screen.getByLabelText('Trimestre')).toHaveValue('22');
    expect(screen.getAllByRole('columnheader').map((c) => c.textContent)).toEqual([
      'Estudiante',
      'Ser/ 10',
      'Saber/ 45',
      'Hacer/ 40',
      'Autoev./ 5',
      'Nota/ 100',
      'Estado',
    ]);
  });
});

describe('Corrección auditable de notas (US-04, T-032, RNF-04)', () => {
  const planillaConNota = (): api.Planilla => ({
    actividad: {
      id: 5,
      nombre: 'Práctica: funciones cuadráticas',
      dimension: 'Saber',
      materia: 'Matemática',
      materiaId: 7,
      curso: 'Secundaria 4.º «A»',
      trimestre: { id: 23, numero: 3, cerrado: false },
    },
    filas: [
      { estudianteId: 1, estudiante: 'Apaza Condori, Miguel', valor: 78, notaId: 101 },
      { estudianteId: 2, estudiante: 'Choque Huanca, Rosa', valor: null },
    ],
  });
  const ruta = '/profesor/materias/7/actividades/5';
  const solicitud = (
    estado: api.EstadoSolicitud,
    usada = false,
    observacionAdmin: string | null = null,
  ): api.SolicitudEdicion => ({
    id: 4,
    profesorId: 1,
    profesorNombre: 'Ana Profesora',
    actividadId: 5,
    actividadNombre: 'Práctica: funciones cuadráticas',
    materiaId: 7,
    materiaNombre: 'Matemática',
    cursoNombre: 'Secundaria 4.º «A»',
    dimension: 'Saber',
    estudiantes: [
      { estudianteId: 1, estudianteNombre: 'Apaza Condori, Miguel', notaActual: 78, usada },
    ],
    motivo: 'Revisión del examen',
    fechaSolicitud: '2026-10-20T10:00:00Z',
    estado,
    fechaResolucion: null,
    observacionAdmin,
  });

  // Por defecto, el administrador ya aprobó la edición de la nota de Miguel (decisión D16).
  beforeEach(() => {
    vi.spyOn(api, 'listarSolicitudes').mockResolvedValue([solicitud('APROBADA')]);
  });

  it('debe pedir la edición al administrador si la nota no está habilitada (decisión D16)', async () => {
    vi.spyOn(api, 'listarSolicitudes').mockResolvedValue([]);
    vi.spyOn(api, 'obtenerPlanilla').mockResolvedValue(planillaConNota());
    const crear = vi.spyOn(api, 'crearSolicitud').mockResolvedValue(solicitud('PENDIENTE'));
    abrir(ruta, 'PROFESOR');
    fireEvent.click(await screen.findByRole('button', { name: 'Pedir edición' }));
    expect(screen.queryByRole('button', { name: /^Corregir$/ })).not.toBeInTheDocument();
    const d = screen.getByRole('dialog');
    fireEvent.click(within(d).getByRole('button', { name: 'Enviar al administrador' }));
    expect(within(d).getByText('Escriba el motivo de la corrección.')).toBeInTheDocument();
    fireEvent.change(within(d).getByLabelText('Motivo de la corrección'), {
      target: { value: 'Error de transcripción' },
    });
    fireEvent.click(within(d).getByRole('button', { name: 'Enviar al administrador' }));
    await waitFor(() =>
      expect(crear).toHaveBeenCalledWith({
        actividadId: 5,
        estudianteIds: [1],
        motivo: 'Error de transcripción',
      }),
    );
    expect(
      await screen.findByText(/Se envió la solicitud #4 al administrador/),
    ).toBeInTheDocument();
  });

  it('debe mostrar la solicitud en revisión y el rechazo con su observación', async () => {
    vi.spyOn(api, 'obtenerPlanilla').mockResolvedValue(planillaConNota());
    vi.spyOn(api, 'listarSolicitudes').mockResolvedValue([
      solicitud('RECHAZADA', false, 'Falta la hoja de respuestas'),
    ]);
    abrir(ruta, 'PROFESOR');
    expect(await screen.findByText('Rechazada: Falta la hoja de respuestas')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Pedir edición' })).toBeInTheDocument();
  });

  it('debe abrir el modal de corrección y exigir el motivo obligatorio antes de guardar (US-04, criterio 1)', async () => {
    vi.spyOn(api, 'obtenerPlanilla').mockResolvedValue(planillaConNota());
    abrir(ruta, 'PROFESOR');
    expect(await screen.findByText('78')).toBeInTheDocument();

    const btnCorregir = screen.getByRole('button', { name: /Corregir/i });
    fireEvent.click(btnCorregir);

    expect(await screen.findByText(/Corregir nota de Apaza Condori, Miguel/)).toBeInTheDocument();
    expect(screen.getAllByText('78')).toHaveLength(2);

    const inputNueva = screen.getByLabelText(/Nueva calificación/);
    const btnGuardar = screen.getByRole('button', { name: 'Guardar corrección' });

    // Intento 1: sin nueva nota
    fireEvent.click(btnGuardar);
    expect(await screen.findByText('Ingrese una nota')).toBeInTheDocument();

    // Intento 2: misma nota
    fireEvent.change(inputNueva, { target: { value: '78' } });
    fireEvent.click(btnGuardar);
    expect(
      await screen.findByText('La nota nueva debe ser diferente a la nota actual.'),
    ).toBeInTheDocument();

    // Intento 3: sin motivo
    fireEvent.change(inputNueva, { target: { value: '88' } });
    fireEvent.click(btnGuardar);
    expect(
      await screen.findByText('El motivo de la corrección es obligatorio.'),
    ).toBeInTheDocument();
  });

  it('debe corregir la nota, actualizar la planilla y guardar el registro de auditoría (US-04, criterio 1 y 3)', async () => {
    vi.spyOn(api, 'obtenerPlanilla').mockResolvedValue(planillaConNota());
    const patch = vi.spyOn(api, 'corregirNota').mockResolvedValue({
      notaId: 101,
      valorAnterior: 78,
      valorNuevo: 88,
    });
    abrir(ruta, 'PROFESOR');

    fireEvent.click(await screen.findByRole('button', { name: /Corregir/i }));
    fireEvent.change(screen.getByLabelText(/Nueva calificación/), { target: { value: '88' } });
    fireEvent.change(screen.getByLabelText(/Motivo justificado de la corrección/), {
      target: { value: 'Error en la transcripción de la pregunta 3' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar corrección' }));

    expect(
      await screen.findByText(/Nota de Apaza Condori, Miguel corregida de 78 a 88/),
    ).toBeInTheDocument();
    expect(patch).toHaveBeenCalledWith(101, {
      valor: 88,
      motivo: 'Error en la transcripción de la pregunta 3',
    });
    expect(screen.getByText('88')).toBeInTheDocument();
  });

  it('debe mostrar el historial de auditoría de solo lectura con quién, cuándo y valor anterior (US-04, criterio 1 y 2)', async () => {
    vi.spyOn(api, 'obtenerPlanilla').mockResolvedValue(planillaConNota());
    vi.spyOn(api, 'historialNota').mockResolvedValue([
      {
        fecha: '2026-10-20T14:30:00.000Z',
        usuario: 'Ana Profesora',
        valorAnterior: null,
        valorNuevo: 78,
        motivo: null,
        origen: 'REGISTRO',
      },
      {
        fecha: '2026-10-20T16:00:00.000Z',
        usuario: 'Ana Profesora',
        valorAnterior: 78,
        valorNuevo: 88,
        motivo: 'Revisión formal con el estudiante',
        origen: 'CORRECCION',
      },
    ]);
    abrir(ruta, 'PROFESOR');

    fireEvent.click(await screen.findByRole('button', { name: /Historial/i }));
    expect(
      await screen.findByText(/Historial de Auditoría — Apaza Condori, Miguel/),
    ).toBeInTheDocument();
    expect(await screen.findByText(/Revisión formal con el estudiante/)).toBeInTheDocument();
    expect(screen.getByText(/Registro inmutable de solo lectura/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cerrar' })).toBeInTheDocument();
    // Comprobar que no hay botones de editar ni eliminar la auditoría (solo lectura)
    expect(screen.queryByRole('button', { name: /Eliminar/i })).not.toBeInTheDocument();
  });

  it('debe avisar si no se pudo leer el historial en vez de mostrarlo vacío', async () => {
    vi.spyOn(api, 'obtenerPlanilla').mockResolvedValue(planillaConNota());
    vi.spyOn(api, 'historialNota').mockRejectedValue(
      new api.ErrorApi(403, 'Usted no es el profesor asignado a esta materia'),
    );
    abrir(ruta, 'PROFESOR');
    fireEvent.click(await screen.findByRole('button', { name: /Historial/i }));
    expect(
      await screen.findByText('Usted no es el profesor asignado a esta materia'),
    ).toBeInTheDocument();
    expect(screen.queryByText(/No se registran correcciones/)).not.toBeInTheDocument();
  });

  it('debe ocultar la corrección mientras la nota no tenga id', async () => {
    const sinId = planillaConNota();
    sinId.filas[0] = { ...sinId.filas[0], notaId: null };
    vi.spyOn(api, 'obtenerPlanilla').mockResolvedValue(sinId);
    abrir(ruta, 'PROFESOR');
    expect(await screen.findByText('78')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Corregir/i })).not.toBeInTheDocument();
  });
});

describe('Historial académico del estudiante (US-03, T-035)', () => {
  const historialMock: api.HistorialAcademicoEstudiante = {
    estudiante: {
      id: 1,
      codigoRude: '809800012026001',
      ci: '12345678',
      nombres: 'Miguel',
      apellidos: 'Apaza Condori',
      curso: { id: 3, nombre: 'Secundaria 4.º «A»' },
      gestion: { id: 1, anio: 2026 },
    },
    promedioAnual: 78.5,
    tendencia: 'ASCENDENTE',
    estadoAnual: 'PROMOVIDO',
    trimestres: [
      {
        trimestreId: 21,
        numero: 1,
        cerrado: true,
        promedioTrimestral: 74,
        materias: [
          {
            materiaId: 7,
            materia: 'Matemática',
            profesor: 'Rosa Mamani Condori',
            dimensiones: [
              { codigo: 'SER', nombre: 'Ser', puntos: 8, puntajeMaximo: 10 },
              { codigo: 'SABER', nombre: 'Saber', puntos: 32, puntajeMaximo: 45 },
              { codigo: 'HACER', nombre: 'Hacer', puntos: 30, puntajeMaximo: 40 },
              { codigo: 'AUTOEVALUACION', nombre: 'Autoevaluación', puntos: 4, puntajeMaximo: 5 },
            ],
            nota: 74,
            aprobado: true,
          },
        ],
      },
      {
        trimestreId: 22,
        numero: 2,
        cerrado: false,
        promedioTrimestral: 83,
        materias: [
          {
            materiaId: 7,
            materia: 'Matemática',
            profesor: 'Rosa Mamani Condori',
            dimensiones: [
              { codigo: 'SER', nombre: 'Ser', puntos: 9, puntajeMaximo: 10 },
              { codigo: 'SABER', nombre: 'Saber', puntos: 38, puntajeMaximo: 45 },
              { codigo: 'HACER', nombre: 'Hacer', puntos: 32, puntajeMaximo: 40 },
              { codigo: 'AUTOEVALUACION', nombre: 'Autoevaluación', puntos: 4, puntajeMaximo: 5 },
            ],
            nota: 83,
            aprobado: true,
          },
        ],
      },
      {
        trimestreId: 23,
        numero: 3,
        cerrado: false,
        promedioTrimestral: null,
        materias: [],
      },
    ],
  };

  it('debe mostrar las notas y promedios de cada trimestre en orden cronológico (US-03, criterio 1)', async () => {
    vi.spyOn(api, 'obtenerHistorialAcademicoEstudiante').mockResolvedValue(historialMock);
    abrir('/profesor/estudiantes/1/historial', 'PROFESOR');

    expect(await screen.findByText('Apaza Condori, Miguel')).toBeInTheDocument();
    expect(screen.getByText('809800012026001')).toBeInTheDocument();
    expect(screen.getByText('12345678')).toBeInTheDocument();
    expect(screen.getByText('78,5')).toBeInTheDocument(); // Promedio Anual

    // Comprobar orden cronológico de trimestres en pestañas/tarjetas
    expect(screen.getByText('1.er trimestre')).toBeInTheDocument();
    expect(screen.getByText('2.º trimestre')).toBeInTheDocument();
    expect(screen.getByText('3.er trimestre')).toBeInTheDocument();

    // Ver notas del 1.er trimestre
    expect(screen.getAllByText('74').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Aprueba')).toBeInTheDocument();
  });

  it('debe cambiar de trimestre y ver sus materias correspondientes', async () => {
    vi.spyOn(api, 'obtenerHistorialAcademicoEstudiante').mockResolvedValue(historialMock);
    abrir('/profesor/estudiantes/1/historial', 'PROFESOR');

    expect(await screen.findByText('Apaza Condori, Miguel')).toBeInTheDocument();

    // Click en pestaña de 2.º trimestre
    fireEvent.click(screen.getByRole('button', { name: /2.º trimestre/i }));
    expect(screen.getAllByText('83').length).toBeGreaterThanOrEqual(1);
  });

  it('debe mostrar mensaje de acceso denegado (403) cuando el profesor no tiene autorización (US-03, criterio 2)', async () => {
    vi.spyOn(api, 'obtenerHistorialAcademicoEstudiante').mockRejectedValue(
      new api.ErrorApi(403, 'No tiene acceso a las calificaciones de este estudiante'),
    );
    abrir('/profesor/estudiantes/99/historial', 'PROFESOR');

    expect(await screen.findByText(/Acceso Denegado \(HTTP 403\)/)).toBeInTheDocument();
    expect(
      screen.getByText(/Solo los profesores con materias asignadas a este estudiante/),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Volver a mis materias/i })).toHaveAttribute(
      'href',
      '/profesor/materias',
    );
  });
});

describe('Importación desde Excel (US-05, T-039)', () => {
  const planillaImportacion: api.Planilla = {
    actividad: {
      id: 5,
      nombre: 'Examen Diagnóstico',
      dimension: 'Saber',
      materia: 'Matemática',
      materiaId: 7,
      curso: 'Secundaria 4.º «A»',
      trimestre: { id: 23, numero: 3, cerrado: false },
    },
    filas: [
      { estudianteId: 1, estudiante: 'Apaza Condori, Miguel', valor: null },
      { estudianteId: 2, estudiante: 'Choque Huanca, Rosa', valor: null },
    ],
  };

  const vista: api.VistaPreviaImportacion = {
    totalFilas: 3,
    filasValidas: [
      {
        estudianteId: 1,
        codigoRude: '809800012026001',
        estudiante: 'Apaza Condori, Miguel',
        valor: 88,
        valida: true,
      },
    ],
    filasObservadas: [
      {
        linea: 3,
        identificador: '999999999999999',
        valorIngresado: '75',
        motivo: 'El estudiante no existe en este curso',
        valida: false,
      },
      {
        linea: 4,
        identificador: '809800012026002',
        valorIngresado: '105',
        motivo: 'La nota debe ser un número entre 1 y 100, con hasta dos decimales',
        valida: false,
      },
    ],
    resumen: { total: 3, validas: 1, errores: 2 },
  };

  const archivo = new File(['xlsx'], 'notas.xlsx', {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });

  async function subirArchivo() {
    abrir('/profesor/materias/7/actividades/5/importar', 'PROFESOR');
    await screen.findByRole('heading', { name: /Importar Notas desde Excel/i });
    fireEvent.change(screen.getByLabelText('Planilla Excel con las notas'), {
      target: { files: [archivo] },
    });
  }

  beforeEach(() => {
    vi.spyOn(api, 'obtenerPlanilla').mockResolvedValue(planillaImportacion);
  });

  it('debe mostrar la pantalla de importación con la descarga de la plantilla (US-05, criterio 1)', async () => {
    abrir('/profesor/materias/7/actividades/5/importar', 'PROFESOR');
    expect(
      await screen.findByRole('heading', { name: /Importar Notas desde Excel/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Descargar plantilla Excel/i })).toBeInTheDocument();
    expect(screen.getByLabelText('Planilla Excel con las notas')).toHaveAttribute(
      'accept',
      expect.stringContaining('.xlsx'),
    );
  });

  it('debe enviar el archivo a la API y mostrar la vista previa con filas válidas y con error (US-05, criterios 1 y 2)', async () => {
    const previa = vi.spyOn(api, 'vistaPreviaImportacion').mockResolvedValue(vista);
    await subirArchivo();

    expect(await screen.findByRole('button', { name: /Válidas \(1\)/i })).toBeInTheDocument();
    expect(previa).toHaveBeenCalledWith(5, archivo);
    expect(screen.getByText('Apaza Condori, Miguel')).toBeInTheDocument();
    expect(screen.getByText('88')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Observadas \(2\)/i }));
    expect(screen.getByText('999999999999999')).toBeInTheDocument();
    expect(screen.getByText('El estudiante no existe en este curso')).toBeInTheDocument();
  });

  it('debe mostrar el error de la API si el archivo no es una planilla válida', async () => {
    vi.spyOn(api, 'vistaPreviaImportacion').mockRejectedValue(
      new api.ErrorApi(400, 'El archivo no es una planilla Excel (.xlsx) válida'),
    );
    await subirArchivo();
    expect(
      await screen.findByText('El archivo no es una planilla Excel (.xlsx) válida'),
    ).toBeInTheDocument();
  });

  it('debe confirmar la importación enviando el mismo archivo a la API (US-05, criterio 3)', async () => {
    vi.spyOn(api, 'vistaPreviaImportacion').mockResolvedValue(vista);
    const confirmar = vi
      .spyOn(api, 'confirmarImportacion')
      .mockResolvedValue({ guardadas: 1, rechazadas: 2 });
    await subirArchivo();

    fireEvent.click(await screen.findByRole('button', { name: /Confirmar e Importar/i }));
    await waitFor(() => expect(confirmar).toHaveBeenCalledWith(5, archivo));
  });
});

describe('Registro de asistencia por clase (US-19, T-037)', () => {
  const claseMock: api.AsistenciaClase = {
    materia: 'Matemática',
    fecha: '2026-04-15',
    filas: [
      { estudianteId: 1, estudiante: 'Apaza Condori, Miguel', estado: null },
      { estudianteId: 2, estudiante: 'Choque Huanca, Rosa', estado: null },
    ],
  };

  const porcentajesMock: api.PorcentajeAsistenciaEstudiante[] = [
    {
      estudianteId: 1,
      estudiante: 'Apaza Condori, Miguel',
      presentes: 8,
      licencias: 1,
      ausentes: 1,
      clases: 10,
      porcentaje: 90.0,
    },
    {
      estudianteId: 2,
      estudiante: 'Choque Huanca, Rosa',
      presentes: 6,
      licencias: 0,
      ausentes: 4,
      clases: 10,
      porcentaje: 60.0,
    },
  ];

  beforeEach(() => {
    vi.spyOn(api, 'obtenerMateria').mockResolvedValue(MATERIA);
    vi.spyOn(api, 'obtenerAsistenciaClase').mockResolvedValue(claseMock);
    vi.spyOn(api, 'obtenerPorcentajesAsistencia').mockResolvedValue(porcentajesMock);
  });

  it('debe mostrar la lista de la clase y permitir marcar asistencia individual o masiva (US-19, criterio 1)', async () => {
    abrir('/profesor/materias/7/asistencia', 'PROFESOR');
    expect(
      await screen.findByRole('heading', { name: /Control de Asistencia · Matemática/i }),
    ).toBeInTheDocument();
    expect(screen.getByText('Apaza Condori, Miguel')).toBeInTheDocument();
    expect(screen.getByText('Choque Huanca, Rosa')).toBeInTheDocument();

    // Marcar a todos como presentes con el botón rápido
    fireEvent.click(screen.getByRole('button', { name: /Marcar todos Presentes/i }));
    expect(screen.getByTestId('resumen-marcados')).toHaveTextContent(
      /Marcados:\s*2\s*presentes\s*·\s*0\s*licencias\s*·\s*0\s*ausentes/i,
    );

    // Cambiar a Rosa a Licencia
    fireEvent.click(screen.getByTestId('btn-licencia-2'));
    expect(screen.getByTestId('resumen-marcados')).toHaveTextContent(
      /Marcados:\s*1\s*presentes\s*·\s*1\s*licencias\s*·\s*0\s*ausentes/i,
    );
  });

  it('debe guardar la asistencia de la fecha cuando la lista está completa (US-19, criterio 1)', async () => {
    const guardarSpy = vi.spyOn(api, 'guardarAsistenciaClase').mockResolvedValue({
      fecha: '2026-04-15',
      guardados: 2,
    });

    abrir('/profesor/materias/7/asistencia', 'PROFESOR');
    await screen.findByRole('heading', { name: /Control de Asistencia · Matemática/i });

    // Marcar todos presentes
    fireEvent.click(screen.getByRole('button', { name: /Marcar todos Presentes/i }));

    // Guardar
    const btnGuardar = screen.getByRole('button', {
      name: /Guardar Asistencia de la Fecha/i,
    });
    fireEvent.click(btnGuardar);

    await waitFor(() => {
      expect(guardarSpy).toHaveBeenCalledWith(7, expect.any(String), {
        registros: [
          { estudianteId: 1, estado: 'PRESENTE' },
          { estudianteId: 2, estado: 'PRESENTE' },
        ],
      });
    });
    expect(await screen.findByText(/Se guardó correctamente la asistencia/i)).toBeInTheDocument();
  });

  it('debe impedir registrar asistencia de una fecha futura mostrando advertencia (US-19, criterio 3)', async () => {
    abrir('/profesor/materias/7/asistencia', 'PROFESOR');
    await screen.findByRole('heading', { name: /Control de Asistencia · Matemática/i });

    // Cambiar selector a fecha futura lejana (2099-12-31)
    const inputFecha = screen.getByLabelText(/Fecha de la clase/i);
    fireEvent.change(inputFecha, { target: { value: '2099-12-31' } });

    expect(
      await screen.findByText(/No se puede registrar asistencia de una fecha futura/i),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /Guardar Asistencia de la Fecha/i }),
    ).not.toBeInTheDocument();
  });

  it('debe mostrar los porcentajes acumulados calculados según D5 (US-19, criterio 2)', async () => {
    abrir('/profesor/materias/7/asistencia', 'PROFESOR');
    await screen.findByRole('heading', { name: /Control de Asistencia · Matemática/i });

    // Cambiar a pestaña de porcentajes
    fireEvent.click(screen.getByRole('button', { name: /Porcentajes acumulados/i }));

    expect(await screen.findByText('90,0 %')).toBeInTheDocument();
    expect(screen.getByText('Regular (≥80%)')).toBeInTheDocument();

    expect(screen.getByText('60,0 %')).toBeInTheDocument();
    expect(screen.getByText('En riesgo (<70%)')).toBeInTheDocument();
  });
});

describe('Entrega de notas por materia (US-10, criterio 2)', () => {
  const notasIncompletas: api.NotaTrimestral[] = [
    {
      estudianteId: 1,
      estudiante: 'Apaza Condori, Miguel',
      dimensiones: [{ codigo: 'SER', puntos: 8.0 }],
      nota: 74,
      aprobado: true,
      pendientes: [],
    },
    {
      estudianteId: 2,
      estudiante: 'Choque Huanca, Rosa',
      dimensiones: [],
      nota: null,
      aprobado: null,
      pendientes: ['SABER', 'HACER'],
    },
  ];

  const notasCompletas: api.NotaTrimestral[] = [
    {
      estudianteId: 1,
      estudiante: 'Apaza Condori, Miguel',
      dimensiones: [{ codigo: 'SER', puntos: 8.0 }],
      nota: 74,
      aprobado: true,
      pendientes: [],
    },
    {
      estudianteId: 2,
      estudiante: 'Choque Huanca, Rosa',
      dimensiones: [{ codigo: 'SER', puntos: 9.0 }],
      nota: 85,
      aprobado: true,
      pendientes: [],
    },
  ];

  beforeEach(() => {
    vi.spyOn(api, 'obtenerMateria').mockResolvedValue(MATERIA);
    vi.spyOn(api, 'listarTrimestres').mockResolvedValue(TRIMESTRES);
    vi.spyOn(api, 'listarDimensiones').mockResolvedValue(DIMENSIONES);
    vi.spyOn(api, 'obtenerEstadoEntregaMateria').mockResolvedValue({
      materiaId: 7,
      materia: 'Matemática',
      cursoId: 1,
      curso: 'Secundaria 4.º «A»',
      profesorId: 3,
      profesor: 'Rosa Mamani Condori',
      trimestreId: 21,
      trimestreNumero: 1,
      estado: 'PENDIENTE',
      fechaEntrega: null,
      totalActividades: 2,
      totalEstudiantes: 2,
      totalNotasRegistradas: 2,
      totalNotasRequeridas: 4,
      notasFaltantes: 2,
    });
  });

  it('debe rechazar la entrega de notas si faltan estudiantes por calificar (US-10, criterio 2)', async () => {
    vi.spyOn(api, 'notasTrimestrales').mockResolvedValue(notasIncompletas);
    const marcarSpy = vi.spyOn(api, 'marcarEntregaMateria');

    abrir('/profesor/materias/7/notas?trimestre=21', 'PROFESOR');
    expect(
      await screen.findByRole('heading', { name: /Notas del Trimestre/i }),
    ).toBeInTheDocument();
    expect(await screen.findByText('Apaza Condori, Miguel')).toBeInTheDocument();
    expect(screen.getByText(/Entrega Pendiente/i)).toBeInTheDocument();

    const btnEntregar = screen.getByRole('button', { name: /Marcar trimestre como entregado/i });
    fireEvent.click(btnEntregar);

    expect(
      await screen.findByText(
        /No se puede marcar como entregada: faltan notas por registrar. Todos los estudiantes deben tener nota en todas las actividades./i,
      ),
    ).toBeInTheDocument();
    expect(marcarSpy).not.toHaveBeenCalled();
  });

  it('debe aceptar la entrega y actualizar el estado cuando todas las notas están completas (US-10, criterio 2)', async () => {
    vi.spyOn(api, 'notasTrimestrales').mockResolvedValue(notasCompletas);
    const marcarSpy = vi.spyOn(api, 'marcarEntregaMateria').mockResolvedValue({
      exito: true,
      mensaje: 'Se marcaron y entregaron correctamente las notas del trimestre.',
      entrega: {
        materiaId: 7,
        materia: 'Matemática',
        cursoId: 1,
        curso: 'Secundaria 4.º «A»',
        profesorId: 3,
        profesor: 'Rosa Mamani Condori',
        trimestreId: 21,
        trimestreNumero: 1,
        estado: 'ENTREGADO',
        fechaEntrega: '2026-04-15T15:00:00Z',
        totalActividades: 2,
        totalEstudiantes: 2,
        totalNotasRegistradas: 4,
        totalNotasRequeridas: 4,
        notasFaltantes: 0,
      },
    });

    abrir('/profesor/materias/7/notas?trimestre=21', 'PROFESOR');
    expect(
      await screen.findByRole('heading', { name: /Notas del Trimestre/i }),
    ).toBeInTheDocument();
    expect(await screen.findByText('Apaza Condori, Miguel')).toBeInTheDocument();

    const btnEntregar = screen.getByRole('button', { name: /Marcar trimestre como entregado/i });
    fireEvent.click(btnEntregar);

    await waitFor(() => {
      expect(marcarSpy).toHaveBeenCalledWith(7, 21);
    });

    expect(
      await screen.findByText(/Se marcaron y entregaron correctamente las notas del trimestre./i),
    ).toBeInTheDocument();
    expect(await screen.findByText(/Trimestre Entregado/i)).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /Marcar trimestre como entregado/i }),
    ).not.toBeInTheDocument();
  });
});

describe('Panel de Riesgo Académico (US-06, T-044)', () => {
  const PANEL_MOCK: riesgoLib.PanelRiesgoData = {
    materia: { id: 7, nombre: 'Matemática' },
    curso: { id: 1, nombre: 'Secundaria 4.º «A»' },
    trimestre: { id: 21, numero: 1 },
    umbralAsistencia: 80.0,
    umbralNotaMinima: 51,
    resumen: {
      totalEstudiantes: 3,
      enRiesgoTotal: 2,
      enRiesgoPromedio: 1,
      enRiesgoAsistencia: 0,
      enRiesgoAmbos: 1,
      regulares: 1,
      pendientes: 0,
      promedioGeneral: 56.7,
      asistenciaGeneral: 82.3,
    },
    estudiantes: [
      {
        estudianteId: 101,
        codigoRude: '90000000001',
        ci: '10203040',
        estudiante: 'Condori Ramos, Lucia',
        promedio: 45.0,
        porcentajeAsistencia: 90.0,
        clasesDictadas: 10,
        asistencias: 9,
        enRiesgo: true,
        motivoRiesgo: 'PROMEDIO',
        estado: 'EN_RIESGO',
      },
      {
        estudianteId: 102,
        codigoRude: '90000000002',
        ci: null,
        estudiante: 'Flores Choque, Maria',
        promedio: 40.0,
        porcentajeAsistencia: 62.0,
        clasesDictadas: 10,
        asistencias: 6,
        enRiesgo: true,
        motivoRiesgo: 'AMBOS',
        estado: 'EN_RIESGO',
      },
      {
        estudianteId: 103,
        codigoRude: '90000000003',
        ci: '8899001',
        estudiante: 'Mamani Quispe, Rodrigo',
        promedio: 85.0,
        porcentajeAsistencia: 95.0,
        clasesDictadas: 10,
        asistencias: 10,
        enRiesgo: false,
        motivoRiesgo: null,
        estado: 'REGULAR',
      },
    ],
  };

  beforeEach(() => {
    vi.spyOn(api, 'obtenerMateria').mockResolvedValue(MATERIA);
    vi.spyOn(api, 'listarTrimestres').mockResolvedValue(TRIMESTRES);
    vi.spyOn(riesgoLib, 'obtenerPanelRiesgoMateria').mockResolvedValue(PANEL_MOCK);
  });

  it('debe mostrar el listado de estudiantes con su promedio y asistencia (US-06, criterio 1)', async () => {
    abrir('/profesor/materias/7/riesgo', 'PROFESOR');

    expect(
      await screen.findByRole('heading', { name: /Panel de Riesgo Académico/i }),
    ).toBeInTheDocument();
    expect(await screen.findByText('Condori Ramos, Lucia')).toBeInTheDocument();
    expect(screen.getByText('Flores Choque, Maria')).toBeInTheDocument();
    expect(screen.getByText('Mamani Quispe, Rodrigo')).toBeInTheDocument();

    // Promedios y asistencias
    expect(screen.getByText('45')).toBeInTheDocument();
    expect(screen.getByText('90,0 %')).toBeInTheDocument();
    expect(screen.getByText('62,0 %')).toBeInTheDocument();
    expect(screen.getByText('85')).toBeInTheDocument();
  });

  it('debe marcar como "en riesgo" a los estudiantes con promedio < 51 o asistencia < 80 % (US-06, criterio 2, D6)', async () => {
    abrir('/profesor/materias/7/riesgo', 'PROFESOR');

    expect(await screen.findByText('Condori Ramos, Lucia')).toBeInTheDocument();

    // Insignias descriptivas de riesgo
    expect(screen.getByText(/En riesgo \(Promedio < 51 pts\)/i)).toBeInTheDocument();
    expect(
      screen.getByText(/En riesgo crítico \(Notas < 51 y Asistencia < 80%\)/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/Regular \(Sin riesgo\)/i)).toBeInTheDocument();

    // Métricas del Hero
    expect(screen.getByText('En riesgo académico')).toBeInTheDocument();
  });

  it('debe permitir filtrar estudiantes por condición de riesgo y buscar por nombre', async () => {
    abrir('/profesor/materias/7/riesgo', 'PROFESOR');

    expect(await screen.findByText('Condori Ramos, Lucia')).toBeInTheDocument();

    // Filtrar por regulares
    fireEvent.click(screen.getByRole('button', { name: /Regulares \(1\)/i }));
    expect(screen.getByText('Mamani Quispe, Rodrigo')).toBeInTheDocument();
    expect(screen.queryByText('Condori Ramos, Lucia')).not.toBeInTheDocument();

    // Filtrar por todos y buscar
    fireEvent.click(screen.getByRole('button', { name: /Todos \(3\)/i }));
    const inputBusqueda = screen.getByPlaceholderText(/Buscar por nombre, RUDE o CI…/i);
    fireEvent.change(inputBusqueda, { target: { value: 'Flores' } });

    expect(screen.getByText('Flores Choque, Maria')).toBeInTheDocument();
    expect(screen.queryByText('Condori Ramos, Lucia')).not.toBeInTheDocument();
  });
});

describe('Generación de Boletines en PDF (US-07, T-047)', () => {
  const RESUMEN_BOLETINES_MOCK: boletinLib.ResumenBoletinesCurso = {
    cursoId: 1,
    cursoNombre: 'Secundaria 4.º «A»',
    materiaId: 7,
    materiaNombre: 'Matemática',
    totalEstudiantes: 2,
    requiereCola: false,
    boletinesListos: 1,
    estudiantes: [
      {
        estudianteId: 101,
        codigoRude: '90000000001',
        ci: '10203040',
        estudiante: 'Perez Ramos, Alejandro',
        promedioAnual: 84.0,
        porcentajeAsistencia: 95.0,
        clasesDictadas: 20,
        asistencias: 19,
        estadoBoletin: 'LISTO',
        trimestres: [
          { numero: 1, nota: 80 },
          { numero: 2, nota: 88 },
          { numero: 3, nota: 84 },
        ],
      },
      {
        estudianteId: 102,
        codigoRude: '90000000002',
        ci: null,
        estudiante: 'Morales Soliz, Mateo',
        promedioAnual: null,
        porcentajeAsistencia: null,
        clasesDictadas: 0,
        asistencias: 0,
        estadoBoletin: 'PENDIENTE_NOTAS',
        trimestres: [
          { numero: 1, nota: null },
          { numero: 2, nota: null },
          { numero: 3, nota: null },
        ],
      },
    ],
  };

  const RESUMEN_CURSO_NUMEROSO_MOCK: boletinLib.ResumenBoletinesCurso = {
    ...RESUMEN_BOLETINES_MOCK,
    totalEstudiantes: 60,
    requiereCola: true,
  };

  beforeEach(() => {
    vi.spyOn(boletinLib, 'obtenerResumenBoletinesCurso').mockResolvedValue(RESUMEN_BOLETINES_MOCK);
  });

  it('debe mostrar el listado de boletines con notas y asistencia (US-07, criterio 1)', async () => {
    abrir('/profesor/materias/7/boletines', 'PROFESOR');

    expect(
      await screen.findByRole('heading', {
        name: /Generación de Boletines Centralizados en PDF/i,
      }),
    ).toBeInTheDocument();
    expect(await screen.findByText('Perez Ramos, Alejandro')).toBeInTheDocument();
    expect(screen.getByText('Morales Soliz, Mateo')).toBeInTheDocument();

    // Notas y asistencia
    expect(screen.getAllByText('84')[0]).toBeInTheDocument();
    expect(screen.getByText('95,0 %')).toBeInTheDocument();
    expect(screen.getByText(/Listo para emitir/i)).toBeInTheDocument();
    expect(screen.getByText(/Pendiente de notas/i)).toBeInTheDocument();
  });

  it('debe detectar cursos con más de 50 estudiantes y advertir sobre la cola BullMQ (US-07, criterio 3, R05 / CAL-001)', async () => {
    vi.spyOn(boletinLib, 'obtenerResumenBoletinesCurso').mockResolvedValue(
      RESUMEN_CURSO_NUMEROSO_MOCK,
    );
    abrir('/profesor/materias/7/boletines', 'PROFESOR');

    expect(
      await screen.findByText(/Curso numeroso detectado \(60 estudiantes > 50\)/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Generar todos en cola \(BullMQ\)/i }),
    ).toBeInTheDocument();
  });

  it('debe permitir descargar el boletín en PDF individualmente (US-07, criterio 1)', async () => {
    const descargarSpy = vi
      .spyOn(boletinLib, 'descargarBoletinEstudiante')
      .mockResolvedValue(undefined);

    abrir('/profesor/materias/7/boletines', 'PROFESOR');
    expect(await screen.findByText('Perez Ramos, Alejandro')).toBeInTheDocument();

    const btnPdf = screen.getAllByRole('button', { name: /PDF/i })[0];
    fireEvent.click(btnPdf);

    await waitFor(() => {
      expect(descargarSpy).toHaveBeenCalledWith(101, expect.stringContaining('Perez_Ramos'));
    });
  });

  it('debe filtrar estudiantes por estado de boletín', async () => {
    abrir('/profesor/materias/7/boletines', 'PROFESOR');
    expect(await screen.findByText('Perez Ramos, Alejandro')).toBeInTheDocument();

    // Filtrar por pendientes
    fireEvent.click(screen.getByRole('button', { name: /Sin notas \(1\)/i }));
    expect(screen.getByText('Morales Soliz, Mateo')).toBeInTheDocument();
    expect(screen.queryByText('Perez Ramos, Alejandro')).not.toBeInTheDocument();
  });
});
