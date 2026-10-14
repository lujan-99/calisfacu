import { useCallback, useEffect, useRef, useState } from 'react';
import type { Sesion } from './api';
import { TIMEOUT_SESION_MS } from './constantes';

export interface EstadoSesion {
  sesion: Sesion | null;
  iniciar: (s: Sesion) => void;
  cerrar: () => void;
}

const CLAVE_STORAGE = 'calisfacu_sesion';

interface SesionPersistida {
  sesion: Sesion;
  ultimoAcceso: number;
}

function leerSesionInicial(): Sesion | null {
  try {
    const raw = sessionStorage.getItem(CLAVE_STORAGE);
    if (!raw) return null;
    const datos = JSON.parse(raw) as SesionPersistida;
    if (!datos?.sesion || !datos?.ultimoAcceso) return null;

    // Verificar si ya expiró por inactividad de 30 min (US-17 CA 4)
    if (Date.now() - datos.ultimoAcceso > TIMEOUT_SESION_MS) {
      sessionStorage.removeItem(CLAVE_STORAGE);
      return null;
    }

    return datos.sesion;
  } catch {
    return null;
  }
}

function guardarSesion(s: Sesion): void {
  try {
    const datos: SesionPersistida = {
      sesion: s,
      ultimoAcceso: Date.now(),
    };
    sessionStorage.setItem(CLAVE_STORAGE, JSON.stringify(datos));
  } catch {
    // Modo incógnito o sin permisos de storage
  }
}

function actualizarUltimoAcceso(): void {
  try {
    const raw = sessionStorage.getItem(CLAVE_STORAGE);
    if (!raw) return;
    const datos = JSON.parse(raw) as SesionPersistida;
    datos.ultimoAcceso = Date.now();
    sessionStorage.setItem(CLAVE_STORAGE, JSON.stringify(datos));
  } catch {
    // Ignorar errores de storage
  }
}

function limpiarSesion(): void {
  try {
    sessionStorage.removeItem(CLAVE_STORAGE);
  } catch {
    // Ignorar errores de storage
  }
}

function limpiarHashUrl(): void {
  if (typeof window !== 'undefined' && window.location.hash) {
    try {
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
    } catch {
      // Ignorar en entornos de prueba sin soporte de history
    }
  }
}

/**
 * Hook centralizado para gestionar la sesión del usuario.
 *
 * — Persistencia en `sessionStorage` para soportar recargas de página (F5) en la pestaña actual.
 * — Implementa el cierre automático por inactividad de 30 min (US-17 CA 4).
 * — Limpieza automática de la URL (hash #auditoria, etc.) al cerrar sesión.
 * — Los eventos de "actividad" reinician el temporizador y actualizan la marca temporal.
 */
export function useSesion(): EstadoSesion {
  const [sesion, setSesion] = useState<Sesion | null>(leerSesionInicial);
  const temporizadorRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cerrar = useCallback(() => {
    setSesion(null);
    limpiarSesion();
    limpiarHashUrl();
    if (temporizadorRef.current !== null) {
      clearTimeout(temporizadorRef.current);
      temporizadorRef.current = null;
    }
  }, []);

  const reiniciarTemporizador = useCallback(() => {
    if (temporizadorRef.current !== null) {
      clearTimeout(temporizadorRef.current);
    }
    actualizarUltimoAcceso();
    temporizadorRef.current = setTimeout(cerrar, TIMEOUT_SESION_MS);
  }, [cerrar]);

  const iniciar = useCallback(
    (s: Sesion) => {
      setSesion(s);
      guardarSesion(s);
      reiniciarTemporizador();
    },
    [reiniciarTemporizador],
  );

  // Iniciar temporizador al montar si se recuperó sesión persistida
  useEffect(() => {
    if (sesion !== null && temporizadorRef.current === null) {
      reiniciarTemporizador();
    }
  }, [sesion, reiniciarTemporizador]);

  // Registrar eventos de actividad para reiniciar el temporizador (US-17 CA 4).
  useEffect(() => {
    if (sesion === null) return;

    const EVENTOS_ACTIVIDAD: ReadonlyArray<keyof WindowEventMap> = [
      'mousemove',
      'keydown',
      'pointerdown',
      'scroll',
    ];

    const manejarActividad = () => {
      reiniciarTemporizador();
    };

    EVENTOS_ACTIVIDAD.forEach((evento) => {
      window.addEventListener(evento, manejarActividad, { passive: true });
    });

    return () => {
      EVENTOS_ACTIVIDAD.forEach((evento) => {
        window.removeEventListener(evento, manejarActividad);
      });
      if (temporizadorRef.current !== null) {
        clearTimeout(temporizadorRef.current);
        temporizadorRef.current = null;
      }
    };
  }, [sesion, reiniciarTemporizador]);

  return { sesion, iniciar, cerrar };
}
