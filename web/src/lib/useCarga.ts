import { useCallback, useEffect, useState } from 'react';

export type EstadoCarga<T> =
  { estado: 'cargando' } | { estado: 'error'; mensaje: string } | { estado: 'datos'; datos: T };

/**
 * Carga datos de la API con los cuatro estados del diseño (cargando, datos, vacío, error). Si las dependencias
 * cambian antes de que llegue la respuesta, la respuesta vieja se descarta.
 */
export function useCarga<T>(cargar: () => Promise<T>, dependencias: readonly unknown[]) {
  const [carga, setCarga] = useState<EstadoCarga<T>>({ estado: 'cargando' });
  const [intento, setIntento] = useState(0);

  useEffect(() => {
    let vigente = true;
    setCarga({ estado: 'cargando' });
    cargar().then(
      (datos) => vigente && setCarga({ estado: 'datos', datos }),
      (e: unknown) =>
        vigente &&
        setCarga({
          estado: 'error',
          mensaje: e instanceof Error ? e.message : 'Error de comunicación con el servidor',
        }),
    );
    return () => {
      vigente = false;
    };
  }, [...dependencias, intento]);

  const recargar = useCallback(() => setIntento((i) => i + 1), []);
  return { carga, recargar, setCarga };
}
