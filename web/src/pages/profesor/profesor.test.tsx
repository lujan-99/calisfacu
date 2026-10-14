import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as api from '../../lib/api';
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
    vi.spyOn(api, 'obtenerPlanilla').mockResolvedValue(planilla());
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
