import type { Nivel, Rol } from './api';

export const NOMBRE_ROL: Record<Rol, string> = {
  ADMINISTRADOR: 'Administrador',
  SECRETARIA: 'Secretaria',
  PROFESOR: 'Profesor',
  PADRE: 'Padre',
};

export const NIVELES: { valor: Nivel; nombre: string; anios: number }[] = [
  { valor: 'INICIAL', nombre: 'Inicial', anios: 2 },
  { valor: 'PRIMARIA', nombre: 'Primaria', anios: 6 },
  { valor: 'SECUNDARIA', nombre: 'Secundaria', anios: 6 },
];
export const nombreNivel = (n: Nivel) => NIVELES.find((x) => x.valor === n)?.nombre ?? n;

/** 1 → "1.er trimestre", 2 → "2.º trimestre", 3 → "3.er trimestre". */
export function nombreTrimestre(numero: number): string {
  return `${numero}${numero === 1 || numero === 3 ? '.er' : '.º'} trimestre`;
}

/** Notas y puntos con coma decimal, como se escriben en Bolivia: 85.5 → "85,5". */
export function formatoNumero(n: number): string {
  return String(n).replace('.', ',');
}

/** Formatea una fecha ISO o corta al formato legible boliviano (DD/MM/AAAA). */
export function formatoFecha(cadena: string): string {
  try {
    const d = new Date(cadena);
    return isNaN(d.getTime())
      ? cadena
      : d.toLocaleDateString('es-BO', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
        });
  } catch {
    return cadena;
  }
}

/** Pantalla de inicio de cada rol (US-17, criterio 1). */
export const INICIO_POR_ROL: Record<Rol, string> = {
  PROFESOR: '/profesor/materias',
  SECRETARIA: '/secretaria/cursos',
  ADMINISTRADOR: '/admin/dimensiones',
  PADRE: '/padre/boletin',
};
