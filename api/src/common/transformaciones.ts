import { Transform } from 'class-transformer';
import { QueryFailedError } from 'typeorm';

/** Quita los espacios de los extremos antes de validar (" Ana " → "Ana"). */
export const Recortar = () =>
  Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value));

/** Recorta y pasa a mayúsculas: códigos y paralelos ("rude01 " → "RUDE01"). */
export const Mayusculas = () =>
  Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  );

/** La base rechazó la fila por una restricción UNIQUE (código 23505 de PostgreSQL). */
export function esDuplicado(error: unknown): boolean {
  return (
    error instanceof QueryFailedError &&
    (error.driverError as { code?: string } | undefined)?.code === '23505'
  );
}

/** Escapa los comodines de LIKE para que la búsqueda los trate como texto. */
export function escaparLike(texto: string): string {
  return texto.replace(/[\\%_]/g, (c) => `\\${c}`);
}
