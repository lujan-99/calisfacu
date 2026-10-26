import type { PadreTutor, VinculoFamiliar } from './api';

export type ParentescoTipo = 'PADRE' | 'MADRE' | 'TUTOR_LEGAL' | 'APODERADO' | 'OTRO';

export const ETIQUETAS_PARENTESCO: Record<string, string> = {
  PADRE: 'Padre',
  MADRE: 'Madre',
  TUTOR_LEGAL: 'Tutor Legal',
  APODERADO: 'Apoderado',
  OTRO: 'Familiar / Tutor',
};

export interface ResumenEstadisticasVinculos {
  totalVinculos: number;
  totalPadres: number;
  estudiantesConTutor: number;
  estudiantesSinTutor: number;
  porcentajeCobertura: number;
}

/**
 * Valida los datos para crear un nuevo vínculo padre-estudiante (US-20, T-049).
 * - padreId y estudianteId deben ser números positivos válidos.
 * - No debe existir previamente la misma tupla (padreId, estudianteId).
 */
export function validarVinculo(
  padreId: number,
  estudianteId: number,
  vinculosExistentes: VinculoFamiliar[] = [],
): { valido: boolean; error?: string } {
  if (!padreId || padreId <= 0) {
    return { valido: false, error: 'Debe seleccionar un padre de familia o tutor.' };
  }
  if (!estudianteId || estudianteId <= 0) {
    return { valido: false, error: 'Debe seleccionar un estudiante.' };
  }

  const duplicado = vinculosExistentes.some(
    (v) => v.padreId === padreId && v.estudianteId === estudianteId,
  );

  if (duplicado) {
    return {
      valido: false,
      error: 'El estudiante ya se encuentra vinculado a este padre de familia o tutor.',
    };
  }

  return { valido: true };
}

/**
 * Filtra los vínculos familiares por curso y por término de búsqueda (nombre padre, email, nombre estudiante, RUDE).
 */
export function filtrarVinculos(
  vinculos: VinculoFamiliar[],
  terminoBusqueda: string,
  cursoIdFiltro?: number | '',
): VinculoFamiliar[] {
  const termino = terminoBusqueda.trim().toLowerCase();

  return vinculos.filter((v) => {
    // Filtro por curso si está especificado
    if (cursoIdFiltro) {
      if (v.estudiante?.curso?.id !== Number(cursoIdFiltro)) {
        return false;
      }
    }

    if (!termino) return true;

    const nombrePadre = (v.padre?.nombre ?? '').toLowerCase();
    const emailPadre = (v.padre?.email ?? '').toLowerCase();
    const ciPadre = (v.padre?.ci ?? '').toLowerCase();

    const nombresEst = (v.estudiante?.nombres ?? '').toLowerCase();
    const apellidosEst = (v.estudiante?.apellidos ?? '').toLowerCase();
    const rudeEst = (v.estudiante?.codigoRude ?? '').toLowerCase();
    const ciEst = (v.estudiante?.ci ?? '').toLowerCase();
    const cursoNombre = (v.estudiante?.curso?.nombre ?? '').toLowerCase();

    return (
      nombrePadre.includes(termino) ||
      emailPadre.includes(termino) ||
      ciPadre.includes(termino) ||
      nombresEst.includes(termino) ||
      apellidosEst.includes(termino) ||
      rudeEst.includes(termino) ||
      ciEst.includes(termino) ||
      cursoNombre.includes(termino)
    );
  });
}

/**
 * Calcula las estadísticas globales de vinculación para el panel de secretaría.
 */
export function calcularEstadisticasVinculos(
  vinculos: VinculoFamiliar[],
  totalEstudiantes: number,
  listaPadres: PadreTutor[] = [],
): ResumenEstadisticasVinculos {
  const idsEstudiantesVinculados = new Set(vinculos.map((v) => v.estudianteId));
  const estudiantesConTutor = idsEstudiantesVinculados.size;
  const estudiantesSinTutor = Math.max(0, totalEstudiantes - estudiantesConTutor);

  const totalPadres =
    listaPadres.length > 0 ? listaPadres.length : new Set(vinculos.map((v) => v.padreId)).size;

  const porcentajeCobertura =
    totalEstudiantes > 0 ? Math.round((estudiantesConTutor / totalEstudiantes) * 1000) / 10 : 0;

  return {
    totalVinculos: vinculos.length,
    totalPadres,
    estudiantesConTutor,
    estudiantesSinTutor,
    porcentajeCobertura,
  };
}
