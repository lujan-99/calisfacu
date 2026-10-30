import { fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as api from '../../lib/api';
import * as boletinUtils from '../../lib/boletin';
import { abrir } from '../../prueba-utils';

const HIJOS_PRUEBA: api.HijoTutor[] = [
  {
    id: 15,
    nombres: 'Alejandro',
    apellidos: 'Pérez Condori',
    codigoRude: '90000000015',
    curso: {
      id: 1,
      nombre: 'Secundaria 3.º «A»',
      nivel: 'SECUNDARIA',
      paralelo: 'A',
      anioEscolaridad: 3,
    },
    gestion: { id: 1, anio: 2026 },
  },
  {
    id: 16,
    nombres: 'Lucía',
    apellidos: 'Pérez Condori',
    codigoRude: '90000000016',
    curso: {
      id: 2,
      nombre: 'Primaria 5.º «B»',
      nivel: 'PRIMARIA',
      paralelo: 'B',
      anioEscolaridad: 5,
    },
  },
];

const BOLETIN_PUBLICADO: api.BoletinPadreDetalle = {
  estudiante: HIJOS_PRUEBA[0],
  publicado: true,
  estadoPeriodo: 'PUBLICADO',
  promedioAnual: 82.4,
  porcentajeAsistencia: 96.0,
  estadoAnual: 'PROMOVIDO',
  materias: [
    {
      materiaId: 1,
      nombre: 'Matemática',
      profesorNombre: 'Rosa Mamani Condori',
      notaT1: 85,
      notaT2: 78,
      notaT3: 90,
      promedioFinal: 84,
      estado: 'APROBADO',
    },
    {
      materiaId: 2,
      nombre: 'Física',
      profesorNombre: 'Carlos Lujan',
      notaT1: 45,
      notaT2: 50,
      notaT3: 48,
      promedioFinal: 48,
      estado: 'REPROBADO',
    },
  ],
};

const BOLETIN_NO_PUBLICADO: api.BoletinPadreDetalle = {
  estudiante: HIJOS_PRUEBA[0],
  publicado: false,
  estadoPeriodo: 'EN_ELABORACION',
  mensajeEstado: 'El boletín todavía no está disponible',
  promedioAnual: null,
  porcentajeAsistencia: 92.0,
  estadoAnual: 'EN_CURSO',
  materias: [],
};

afterEach(() => vi.restoreAllMocks());

describe('Portal del Padre de Familia (US-11, T-051)', () => {
  beforeEach(() => {
    vi.spyOn(api, 'listarHijosTutorApi').mockResolvedValue(HIJOS_PRUEBA);
  });

  it('debe avisar claramente cuando el padre aún no tiene estudiantes vinculados (RNF-04)', async () => {
    vi.spyOn(api, 'listarHijosTutorApi').mockResolvedValue([]);
    abrir('/padre/boletin', 'PADRE');

    expect(
      await screen.findByText(/No tiene estudiantes vinculados a su cuenta/i),
    ).toBeInTheDocument();
  });

  it('debe mostrar aviso y no permitir descarga cuando el boletín no está publicado (US-11, CA 2)', async () => {
    vi.spyOn(api, 'obtenerBoletinHijoApi').mockResolvedValue(BOLETIN_NO_PUBLICADO);
    abrir('/padre/boletin', 'PADRE');

    expect(await screen.findByText('El boletín todavía no está disponible')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /Descargar Boletín Oficial \(PDF\)/i }),
    ).not.toBeInTheDocument();
  });

  it('debe mostrar las calificaciones y permitir la descarga en PDF del boletín publicado (US-11, CA 1)', async () => {
    vi.spyOn(api, 'obtenerBoletinHijoApi').mockResolvedValue(BOLETIN_PUBLICADO);
    const descargarBlobSpy = vi.spyOn(boletinUtils, 'descargarBlob').mockImplementation(() => {});
    const descargarApiSpy = vi
      .spyOn(api, 'descargarBoletinHijoPdfApi')
      .mockResolvedValue(new Blob(['pdf-simulado'], { type: 'application/pdf' }));

    abrir('/padre/boletin', 'PADRE');

    // Verificar encabezado y estudiante
    expect(await screen.findByText('Boletín Oficial Publicado')).toBeInTheDocument();
    expect(screen.getByText('Pérez Condori, Alejandro')).toBeInTheDocument();
    expect(screen.getByText('PROMOVIDO')).toBeInTheDocument();

    // Verificar materias en la tabla
    expect(screen.getByText('Matemática')).toBeInTheDocument();
    expect(screen.getByText('Prof. Rosa Mamani Condori')).toBeInTheDocument();
    expect(screen.getByText('Física')).toBeInTheDocument();
    expect(screen.getByText('Aprobado')).toBeInTheDocument();
    expect(screen.getByText('Reprobado')).toBeInTheDocument();

    // Descargar PDF
    const btnDescargar = screen.getByRole('button', {
      name: /Descargar Boletín Oficial \(PDF\)/i,
    });
    expect(btnDescargar).toBeInTheDocument();
    fireEvent.click(btnDescargar);

    await waitFor(() => {
      expect(descargarApiSpy).toHaveBeenCalledWith(15);
      expect(descargarBlobSpy).toHaveBeenCalledWith(
        expect.any(Blob),
        'Boletin_Pérez_Condori_Alejandro_2026.pdf',
      );
    });

    expect(
      await screen.findByText(/Boletín descargado exitosamente en formato PDF oficial/i),
    ).toBeInTheDocument();
  });

  it('debe permitir cambiar de hijo cuando el padre tiene múltiples estudiantes vinculados', async () => {
    const obtenerSpy = vi.spyOn(api, 'obtenerBoletinHijoApi').mockResolvedValue(BOLETIN_PUBLICADO);
    abrir('/padre/boletin', 'PADRE');

    const selectHijo = await screen.findByLabelText(/Estudiante \(Hijo \/ Tutelado\)/i);
    expect(selectHijo).toBeInTheDocument();

    // Cambiar al segundo hijo
    fireEvent.change(selectHijo, { target: { value: '16' } });

    await waitFor(() => {
      expect(obtenerSpy).toHaveBeenCalledWith(16);
    });
  });
});
