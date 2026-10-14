import { Navigate, Outlet, useLocation } from 'react-router-dom';
import type { Rol } from '../lib/api';
import { INICIO_POR_ROL } from '../lib/formato';
import { useSesion } from '../lib/sesion';

/**
 * Sin sesión, lleva al ingreso. Con otro rol, lleva a la pantalla de inicio del usuario: escribir la URL de otro rol
 * no muestra nada (la API además responde 403, M09).
 */
export function RutaProtegida({ roles }: { roles: Rol[] }) {
  const { usuario } = useSesion();
  const ubicacion = useLocation();
  if (!usuario) return <Navigate to="/ingresar" replace state={{ desde: ubicacion.pathname }} />;
  if (!roles.includes(usuario.rol)) return <Navigate to={INICIO_POR_ROL[usuario.rol]} replace />;
  return <Outlet />;
}
