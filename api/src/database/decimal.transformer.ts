import type { ValueTransformer } from 'typeorm';

/** PostgreSQL devuelve `numeric` como texto; se convierte a número con dos decimales exactos. */
export const decimal: ValueTransformer = {
  to: (valor?: number | null) => valor,
  from: (valor?: string | null) => (valor === null || valor === undefined ? valor : Number(valor)),
};
