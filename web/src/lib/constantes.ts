// Constantes de dominio de la aplicación web de CalisFacu.
// Centralizar aquí evita literales de string esparcidos (M07, M16).

/** Roles válidos del sistema según el SQAP y la entidad Usuario. */
export const ROL = {
  ADMINISTRADOR: 'ADMINISTRADOR',
  SECRETARIA: 'SECRETARIA',
  PROFESOR: 'PROFESOR',
  PADRE: 'PADRE',
} as const;

/** Etiquetas en español para mostrar en la UI. */
export const ETIQUETA_ROL: Record<string, string> = {
  [ROL.ADMINISTRADOR]: 'Administrador',
  [ROL.SECRETARIA]: 'Secretaria',
  [ROL.PROFESOR]: 'Profesor',
  [ROL.PADRE]: 'Padre de familia',
} as const;

/** Tiempo de inactividad en ms antes de cerrar la sesión (US-17 CA 4: 30 min). */
export const TIMEOUT_SESION_MS = 30 * 60 * 1_000;

/** Nombre de la institución mostrado en la UI. */
export const NOMBRE_APP = 'CalisFacu';

/** Descripción corta de la institución. */
export const DESCRIPCION_APP =
  'Sistema de registro de calificaciones — Ministerio de Educación Bolivia';
