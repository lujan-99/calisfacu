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

/**
 * Sesión en memoria (US-17). Decisión D11: la sesión vence a los 30 minutos sin actividad. Mientras el usuario
 * toca o escribe, el token se renueva cada 10 minutos; si no hubo actividad, se deja vencer y la primera respuesta
 * 401 de la API lleva al ingreso con el aviso "Su sesión expiró".
 */
export function SesionProvider({
  children,
  ahora = Date.now,
  inicial = null,
}: {
  children: ReactNode;
  ahora?: () => number;
  /** Solo para pruebas: una sesión ya iniciada. */
  inicial?: Sesion | null;
}) {
  const [sesion, setSesion] = useState<Sesion | null>(() => {
    if (inicial) configurarSesion(inicial.token);
    return inicial;
  });
  const [motivoSalida, setMotivoSalida] = useState<MotivoSalida | null>(null);
  const emitido = useRef(inicial ? ahora() : 0);
  const ultimaActividad = useRef(emitido.current);
  const renovando = useRef(false);

  const salir = useCallback((motivo: MotivoSalida = 'manual') => {
    configurarSesion(null);
    setSesion(null);
    setMotivoSalida(motivo);
  }, []);

  const abrir = useCallback(
    (nueva: Sesion) => {
      emitido.current = ahora();
      ultimaActividad.current = emitido.current;
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
