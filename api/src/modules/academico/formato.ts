import type { Curso, Gestion, Usuario } from '../../database/entities';
import { Nivel } from '../../database/entities';

const NIVELES: Record<Nivel, string> = {
  [Nivel.INICIAL]: 'Inicial',
  [Nivel.PRIMARIA]: 'Primaria',
  [Nivel.SECUNDARIA]: 'Secundaria',
};

/** Años de escolaridad de cada nivel del Subsistema de Educación Regular. */
export const ANIOS_POR_NIVEL: Record<Nivel, number> = {
  [Nivel.INICIAL]: 2,
  [Nivel.PRIMARIA]: 6,
  [Nivel.SECUNDARIA]: 6,
};

/** Nombre del curso como lo usan la secretaria y los boletines: "Secundaria 4.º «A»". */
export function nombreCurso(c: Pick<Curso, 'nivel' | 'anioEscolaridad' | 'paralelo'>): string {
  return `${NIVELES[c.nivel]} ${c.anioEscolaridad}.º «${c.paralelo}»`;
}

export const resumenCurso = (c: Curso) => ({ id: c.id, nombre: nombreCurso(c) });
export const resumenGestion = (g: Gestion) => ({ id: g.id, anio: g.anio });
export const resumenUsuario = (u: Usuario) => ({ id: u.id, nombre: u.nombre });
