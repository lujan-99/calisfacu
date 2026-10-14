import { useEffect } from 'react';
import { Login } from './pages/Login';
import { PantallaRol } from './pages/PantallaRol';
import { ProfesorHome } from './pages/ProfesorHome';
import { ROL } from './lib/constantes';
import { useSesion } from './lib/sesion';

/**
 * Raíz de la aplicación — CalisFacu Web (US-17 CA 1).
 *
 * Responsabilidades:
 * - Gestionar el ciclo de vida y expiración de la sesión mediante `useSesion`.
 * - Limpiar hash residual (#auditoria, etc.) al cerrar sesión para volver a la raíz `/`.
 * - Enrutar dinámicamente al espacio de trabajo autorizado según el rol del usuario.
 * - Desacoplamiento total: cada pantalla gestiona su propio contexto sin código repetido.
 */
export function App() {
  const { sesion, iniciar, cerrar } = useSesion();

  // Si no hay sesión (pantalla de login), limpiar cualquier hash residual de la URL
  useEffect(() => {
    if (sesion === null && typeof window !== 'undefined' && window.location.hash) {
      try {
        window.history.replaceState(null, '', window.location.pathname + window.location.search);
      } catch {
        // Ignorar en entornos sin soporte de history
      }
    }
  }, [sesion]);

  if (sesion === null) {
    return <Login alIniciar={iniciar} />;
  }

  if (sesion.usuario.rol === ROL.PROFESOR) {
    return <ProfesorHome sesion={sesion} onSalir={cerrar} />;
  }

  // ADMINISTRADOR, SECRETARIA, PADRE → panel exclusivo por rol (US-17 CA 1)
  return <PantallaRol sesion={sesion} onSalir={cerrar} />;
}
