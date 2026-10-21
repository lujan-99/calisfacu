import { Navigate, NavLink, Outlet, useLocation } from 'react-router-dom';
import type { Rol } from '../lib/api';
import { NOMBRE_ROL } from '../lib/formato';
import { useInstitucion } from '../lib/institucion';
import { useSesion } from '../lib/sesion';
import { Icono, type NombreIcono } from './Icono';

interface OpcionMenu {
  a: string;
  texto: string;
  icono: NombreIcono;
  cy: string;
}

/** Cada rol ve solo sus opciones (US-17, criterio 1). */
export const MENU_POR_ROL: Record<Rol, OpcionMenu[]> = {
  PROFESOR: [
    { a: '/profesor/materias', texto: 'Mis materias', icono: 'libro', cy: 'menu-mis-materias' },
  ],
  SECRETARIA: [
    { a: '/secretaria/cursos', texto: 'Cursos', icono: 'capas', cy: 'menu-cursos' },
    {
      a: '/secretaria/estudiantes',
      texto: 'Estudiantes',
      icono: 'personas',
      cy: 'menu-estudiantes',
    },
    {
      a: '/secretaria/materias',
      texto: 'Materias y asignaciones',
      icono: 'portapapeles',
      cy: 'menu-materias',
    },
    {
      a: '/secretaria/control-entregas',
      texto: 'Control de entregas',
      icono: 'portapapeles',
      cy: 'menu-control-entregas',
    },
    {
      a: '/secretaria/unidad-educativa',
      texto: 'Unidad educativa',
      icono: 'edificio',
      cy: 'menu-unidad-educativa',
    },
  ],
  ADMINISTRADOR: [
    {
      a: '/admin/dimensiones',
      texto: 'Dimensiones de evaluación',
      icono: 'ajustes',
      cy: 'menu-dimensiones',
    },
  ],
  PADRE: [
    { a: '/padre/boletin', texto: 'Boletín de mi hijo', icono: 'documento', cy: 'menu-boletin' },
  ],
};

const NOMBRE_MENU: Record<Rol, string> = {
  PROFESOR: 'Menú del profesor',
  SECRETARIA: 'Menú de la secretaria',
  ADMINISTRADOR: 'Menú del administrador',
  PADRE: 'Menú del padre de familia',
};

/** Logo de la institución o, si no tiene, sus iniciales sobre el color de acento (ADR-0010). */
export function Logo({ tam = 36 }: { tam?: number }) {
  const { logoUrl, iniciales, nombre } = useInstitucion();
  return (
    <div
      className="logo"
      style={{ width: tam, height: tam }}
      aria-hidden={logoUrl ? undefined : 'true'}
    >
      {logoUrl ? <img src={logoUrl} alt={nombre ? `Logo de ${nombre}` : 'Logo'} /> : iniciales}
    </div>
  );
}

export function Marco() {
  const { usuario, salir } = useSesion();
  const { nombre, codigoSie } = useInstitucion();
  const ubicacion = useLocation();
  // Sin sesión (nunca inició, salió o expiró), al ingreso; después vuelve a la pantalla que pedía.
  if (!usuario) return <Navigate to="/ingresar" replace state={{ desde: ubicacion.pathname }} />;

  return (
    <div className="marco">
      {/* Panel lateral elegante a la izquierda */}
      <aside className="panel-lateral" aria-label="Panel de navegación lateral">
        <div className="panel-lateral-cabecera">
          <Logo tam={40} />
          <div className="panel-lateral-institucion">
            <span className="panel-lateral-nombre" title={nombre ?? 'Unidad Educativa'}>
              {nombre ?? 'Unidad Educativa'}
            </span>
            <span className="panel-lateral-badge">
              {codigoSie ? `SIE ${codigoSie}` : 'Gestión 2026'}
            </span>
          </div>
        </div>

        <div className="panel-lateral-perfil">
          <div className="perfil-avatar" aria-hidden="true">
            {usuario.nombre.charAt(0).toUpperCase()}
          </div>
          <div className="perfil-info">
            <span className="usuario-nombre" data-cy="usuario-nombre">
              {usuario.nombre}
            </span>
            <span className="usuario-rol" data-cy="usuario-rol">
              {NOMBRE_ROL[usuario.rol]}
            </span>
          </div>
          <span className="indicador-enlinea" title="Sesión activa" />
        </div>

        <div className="menu-etiqueta">Menú de opciones</div>

        <nav className="menu" aria-label={NOMBRE_MENU[usuario.rol]}>
          <ul className="menu-lista">
            {MENU_POR_ROL[usuario.rol].map((o) => (
              <li key={o.a}>
                <NavLink to={o.a} className="menu-enlace" data-cy={o.cy}>
                  <Icono nombre={o.icono} tam={18} />
                  {o.texto}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="panel-lateral-pie">
          <div className="panel-lateral-normativa">
            <Icono nombre="escudo" tam={14} />
            <span>RM 001/2026 MinEdu</span>
          </div>
          <button type="button" className="boton-salir" data-cy="btn-salir" onClick={() => salir()}>
            <Icono nombre="salir" tam={18} />
            Salir
          </button>
        </div>
      </aside>

      {/* Área principal de trabajo */}
      <div className="area-principal">
        <header className="barra-superior">
          <div className="barra-superior-izq">
            <span className="barra-superior-subtitulo ocultar-celular">
              Subsistema de Educación Regular · Bolivia
            </span>
          </div>
          <div className="barra-superior-der">
            <span className="insignia insignia-trimestre">
              <Icono nombre="reloj" tam={14} />
              1.er Trimestre 2026
            </span>
          </div>
        </header>

        <main className="contenido">
          <Outlet />
        </main>

        <footer className="pie">CalisFacu · versión {__GIT_COMMIT__.slice(0, 7)}</footer>
      </div>
    </div>
  );
}
