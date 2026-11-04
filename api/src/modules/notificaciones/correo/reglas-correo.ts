/** Intentos de envío antes de dar el correo por fallido (ADR-0011). */
export const MAX_INTENTOS_CORREO = 5;

/**
 * Espera antes del siguiente intento: 1, 2, 4 y 8 minutos. Con el primer intento inmediato, el correo sale en 5
 * minutos o menos aunque fallen los dos primeros (US-08, criterio 1) y en 15 aunque fallen tres (US-12, criterio 1).
 */
export function esperaReintentoMinutos(intentosHechos: number): number {
  return 2 ** Math.max(0, intentosHechos - 1);
}

/** El texto del usuario va escapado en el HTML del correo. */
export function escaparHtml(texto: string): string {
  return texto
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
