// Reglas de presentación de notas en la web. El cálculo oficial lo hace la API (módulo calculo);
// aquí solo se valida la entrada y se muestra el estado, con los mismos límites (RNF-01).
export const ESCALA_MIN = 1;
export const ESCALA_MAX = 100;
export const NOTA_MINIMA_APROBACION = 51;

export type ResultadoValidacion =
  { valida: true; valor: number } | { valida: false; error: string };

export function validarNota(entrada: string): ResultadoValidacion {
  const texto = entrada.trim().replace(',', '.');
  if (texto === '') return { valida: false, error: 'Ingrese una nota' };
  const valor = Number(texto);
  if (!Number.isFinite(valor)) return { valida: false, error: 'La nota debe ser un número' };
  if (valor < ESCALA_MIN || valor > ESCALA_MAX) {
    return { valida: false, error: `La nota debe estar entre ${ESCALA_MIN} y ${ESCALA_MAX}` };
  }
  if (Math.round(valor * 100) !== valor * 100) {
    return { valida: false, error: 'Use como máximo dos decimales' };
  }
  return { valida: true, valor };
}

export function estadoAprobacion(nota: number): 'Aprueba' | 'Reprueba' {
  return nota >= NOTA_MINIMA_APROBACION ? 'Aprueba' : 'Reprueba';
}
