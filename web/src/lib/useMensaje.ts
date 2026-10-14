import { useCallback, useEffect, useState } from 'react';

/** Mensaje de éxito que se oculta solo a los 5 segundos ("Se guardó el curso…"). */
export function useMensaje() {
  const [mensaje, setMensaje] = useState<string | null>(null);
  useEffect(() => {
    if (!mensaje) return;
    const t = window.setTimeout(() => setMensaje(null), 5000);
    return () => window.clearTimeout(t);
  }, [mensaje]);
  return [mensaje, useCallback((m: string | null) => setMensaje(m), [])] as const;
}

/** El texto de un error de la API, o uno genérico. */
export const textoError = (e: unknown, porDefecto = 'No se pudo completar la operación') =>
  e instanceof Error ? e.message : porDefecto;
