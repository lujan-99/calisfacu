import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { ReactNode } from 'react';
import { configurarSesion, iniciarSesion, renovarSesion, type Sesion, type Usuario } from './api';

/** El token dura 30 minutos (US-17, criterio 4). Se renueva si el usuario trabajó desde la última renovación. */
export const DURACION_TOKEN_MS = 30 * 60_000;
export const RENOVAR_DESPUES_MS = 10 * 60_000;
const REVISAR_CADA_MS = 60_000;

export type MotivoSalida = 'manual' | 'expirada';

interface ContextoSesion {
  usuario: Usuario | null;
  motivoSalida: MotivoSalida | null;
  ingresar: (email: string, contrasena: string) => Promise<Usuario>;
  salir: (motivo?: MotivoSalida) => void;
}

const Contexto = createContext<ContextoSesion | null>(null);

export const CLAVE_SESION_STORAGE = 'calisfacu_sesion_v1';

export interface SesionGuardada extends Sesion {
  emitido: number;
  ultimaActividad: number;
}

export function guardarSesion(sesion: Sesion, emitido: number, ultimaActividad: number) {
  try {
    const datos: SesionGuardada = { ...sesion, emitido, ultimaActividad };
    window.localStorage.setItem(CLAVE_SESION_STORAGE, JSON.stringify(datos));
  } catch {
    // Si localStorage no está disponible (modo privado estricto), se mantiene en memoria
  }
}

export function borrarSesionGuardada() {
  try {
    window.localStorage.removeItem(CLAVE_SESION_STORAGE);
  } catch {
    // ignorar
  }
}

export function cargarSesionGuardada(ahora: () => number): SesionGuardada | null {
  try {
    const raw = window.localStorage.getItem(CLAVE_SESION_STORAGE);
    if (!raw) return null;
    const datos = JSON.parse(raw) as SesionGuardada;
    if (!datos?.token || !datos?.usuario?.id || !datos?.usuario?.rol) {
      borrarSesionGuardada();
      return null;
    }
    const t = ahora();
    // Vence a los 30 minutos desde la emisión (US-17, criterio 4)
    if (t - datos.emitido >= DURACION_TOKEN_MS) {
      borrarSesionGuardada();
      return null;
    }
    return datos;
  } catch {
    borrarSesionGuardada();
    return null;
  }
}

/**
 * Sesión con persistencia local de 30 minutos (US-17). Decisión D11: la sesión vence a los 30 minutos sin actividad.
 * Mientras el usuario toca o escribe, el token se renueva cada 10 minutos; si se recarga la página dentro de los 30 min,
 * la sesión se restaura automáticamente. Si no hubo actividad, se deja vencer y la API lleva al ingreso con "Su sesión expiró".
 */
export function SesionProvider({
  children,
  ahora = Date.now,
  inicial,
}: {
  children: ReactNode;
  ahora?: () => number;
  /** Solo para pruebas: una sesión ya iniciada (o null para forzar sin sesión). */
  inicial?: Sesion | null;
}) {
  const [sesion, setSesion] = useState<Sesion | null>(() => {
    if (inicial !== undefined) {
      if (inicial) configurarSesion(inicial.token);
      return inicial;
    }
    const guardada = cargarSesionGuardada(ahora);
    if (guardada) {
      configurarSesion(guardada.token, () => salir('expirada'));
      return { token: guardada.token, usuario: guardada.usuario };
    }
    return null;
  });

  const [motivoSalida, setMotivoSalida] = useState<MotivoSalida | null>(null);

  const emitido = useRef<number>(0);
  const ultimaActividad = useRef<number>(0);
  const renovando = useRef(false);

  // Inicializar timestamps en el primer render
  if (emitido.current === 0) {
    if (inicial !== undefined) {
      emitido.current = inicial ? ahora() : 0;
      ultimaActividad.current = emitido.current;
    } else {
      const guardada = cargarSesionGuardada(ahora);
      if (guardada) {
        emitido.current = guardada.emitido;
        ultimaActividad.current = guardada.ultimaActividad;
      }
    }
  }

  const salir = useCallback((motivo: MotivoSalida = 'manual') => {
    borrarSesionGuardada();
    configurarSesion(null);
    setSesion(null);
    setMotivoSalida(motivo);
  }, []);

  const abrir = useCallback(
    (nueva: Sesion) => {
      emitido.current = ahora();
      ultimaActividad.current = emitido.current;
      guardarSesion(nueva, emitido.current, ultimaActividad.current);
      configurarSesion(nueva.token, () => salir('expirada'));
      setSesion(nueva);
      setMotivoSalida(null);
    },
    [ahora, salir],
  );

  const ingresar = useCallback(
    async (email: string, contrasena: string) => {
      const nueva = await iniciarSesion(email, contrasena);
      abrir(nueva);
      return nueva.usuario;
    },
    [abrir],
  );

  useEffect(() => {
    if (!sesion) return;

    const marcar = () => {
      ultimaActividad.current = ahora();
      guardarSesion(sesion, emitido.current, ultimaActividad.current);
    };
    const revisar = () => {
      const t = ahora();
      if (t - emitido.current >= DURACION_TOKEN_MS) {
        salir('expirada');
      } else if (
        !renovando.current &&
        t - emitido.current >= RENOVAR_DESPUES_MS &&
        ultimaActividad.current > emitido.current
      ) {
        // Una renovación a la vez: si la respuesta tarda, la siguiente revisión no pide otra.
        renovando.current = true;
        renovarSesion()
          .then(abrir, () => salir('expirada'))
          .finally(() => {
            renovando.current = false;
          });
      }
    };
    window.addEventListener('pointerdown', marcar);
    window.addEventListener('keydown', marcar);
    const intervalo = window.setInterval(revisar, REVISAR_CADA_MS);
    return () => {
      window.removeEventListener('pointerdown', marcar);
      window.removeEventListener('keydown', marcar);
      window.clearInterval(intervalo);
    };
  }, [sesion, ahora, abrir, salir]);

  const valor = useMemo(
    () => ({ usuario: sesion?.usuario ?? null, motivoSalida, ingresar, salir }),
    [sesion, motivoSalida, ingresar, salir],
  );
  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useSesion(): ContextoSesion {
  const c = useContext(Contexto);
  if (!c) throw new Error('useSesion debe usarse dentro de SesionProvider');
  return c;
}
