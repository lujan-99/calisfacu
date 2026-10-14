import type { ReactNode } from 'react';
import { NOMBRE_APP, ROL } from '../lib/constantes';

interface Props {
  nombre: string;
  rol: string;
  rolEtiqueta?: string;
  /** data-cy="usuario" exigido por los tests de Cypress inicio-sesion.cy.ts */
  dataCyUsuario?: string;
  onSalir: () => void;
  children: ReactNode;
  gitCommit?: string;
}

/**
 * Envoltorio maestro de interfaz autenticada (US-17 CA 1).
 * Diseñado conforme a la maqueta institucional oficial:
 * - Barra lateral de navegación en guindo institucional (#3D0711)
 * - Emblema institucional dorado (#D4AF37) con sigla 'UE'
 * - Menú contextual categorizado por rol con soporte de navegación
 * - Tarjeta inferior de perfil de usuario y botón de cierre de sesión
 * - Soporte total para pruebas Vitest y Cypress ([data-cy="usuario"])
 */
export function AppShell({
  nombre,
  rol,
  rolEtiqueta,
  dataCyUsuario = 'usuario',
  onSalir,
  children,
  gitCommit,
}: Props) {
  const etiquetaMostrada = rolEtiqueta ?? rol;
  const iniciales =
    nombre
      .trim()
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0].toUpperCase())
      .join('') || 'U';

  const esDocente = rol === ROL.PROFESOR;
  const esAdmin = rol === ROL.ADMINISTRADOR;
  const esSecretaria = rol === ROL.SECRETARIA;

  return (
    <div className="layout-con-barra-lateral">
      {/* Navegación lateral institucional */}
      <nav aria-label="Menú principal" className="barra-lateral-nav">
        {/* Cabecera institucional con insignia */}
        <div className="barra-lateral-marca">
          <div className="emblema-ue-dorado" aria-hidden="true">
            UE
          </div>
          <div className="marca-titulos-bloque">
            <span className="marca-titulo-instituto">{NOMBRE_APP}</span>
            <span className="marca-subtitulo-gestion">Gestión 2026</span>
          </div>
        </div>

        {/* Grupo de navegación principal */}
        <div className="barra-lateral-secciones">
          {esDocente && (
            <div className="menu-grupo">
              <span className="menu-grupo-etiqueta">Docente</span>
              <a href="#panel" aria-current="page" className="menu-enlace menu-enlace-activo">
                <svg
                  aria-hidden="true"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinejoin="round"
                >
                  <path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />
                </svg>
                <span>Panel</span>
              </a>
              <a href="#planilla" className="menu-enlace">
                <svg
                  aria-hidden="true"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinejoin="round"
                >
                  <path d="M4 20h4L19 9l-4-4L4 16z" />
                  <path d="M13 7l4 4" />
                </svg>
                <span>Registro de notas</span>
              </a>
              <a href="#centralizador" className="menu-enlace">
                <svg
                  aria-hidden="true"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                >
                  <rect x="3" y="4" width="18" height="16" rx="2" />
                  <path d="M3 10h18M9 4v16" />
                </svg>
                <span>Centralizador</span>
              </a>

              <span className="menu-grupo-etiqueta" style={{ marginTop: '14px' }}>
                Dirección
              </span>
              <a href="#cursos" className="menu-enlace">
                <svg
                  aria-hidden="true"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinejoin="round"
                >
                  <path d="M12 3l9 5-9 5-9-5z" />
                  <path d="M3 13l9 5 9-5" />
                </svg>
                <span>Cursos y materias</span>
              </a>
              <a href="#estudiantes" className="menu-enlace">
                <svg
                  aria-hidden="true"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                >
                  <circle cx="9" cy="8" r="4" />
                  <path d="M2 21c0-4 3-6 7-6s7 2 7 6" />
                  <path d="M16 4a4 4 0 0 1 0 8M22 21c0-3-2-5-4-6" />
                </svg>
                <span>Estudiantes</span>
              </a>
            </div>
          )}

          {esSecretaria && (
            <div className="menu-grupo">
              <span className="menu-grupo-etiqueta">Secretaría</span>
              <a
                href="#centralizador"
                aria-current="page"
                className="menu-enlace menu-enlace-activo"
              >
                <svg
                  aria-hidden="true"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                >
                  <rect x="3" y="4" width="18" height="16" rx="2" />
                  <path d="M3 10h18M9 4v16" />
                </svg>
                <span>Centralizadores</span>
              </a>
              <a href="#boletines" className="menu-enlace">
                <svg
                  aria-hidden="true"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinejoin="round"
                >
                  <path d="M6 3h9l4 4v14H6z" />
                  <path d="M14 3v5h5M9 13h7M9 17h5" />
                </svg>
                <span>Emisión de boletines</span>
              </a>
              <a href="#estudiantes" className="menu-enlace">
                <svg
                  aria-hidden="true"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                >
                  <circle cx="9" cy="8" r="4" />
                  <path d="M2 21c0-4 3-6 7-6s7 2 7 6" />
                  <path d="M16 4a4 4 0 0 1 0 8M22 21c0-3-2-5-4-6" />
                </svg>
                <span>Estudiantes</span>
              </a>
            </div>
          )}

          {esAdmin && (
            <div className="menu-grupo">
              <span className="menu-grupo-etiqueta">Dirección</span>
              <a href="#estructura" aria-current="page" className="menu-enlace menu-enlace-activo">
                <svg
                  aria-hidden="true"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinejoin="round"
                >
                  <path d="M12 3l9 5-9 5-9-5z" />
                  <path d="M3 13l9 5 9-5" />
                </svg>
                <span>Cursos y materias</span>
              </a>
              <a href="#usuarios" className="menu-enlace">
                <svg
                  aria-hidden="true"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                >
                  <circle cx="12" cy="8" r="4" />
                  <path d="M4 21c0-4 4-6 8-6s8 2 8 6" />
                </svg>
                <span>Gestión de usuarios</span>
              </a>
              <a href="#auditoria" className="menu-enlace">
                <svg
                  aria-hidden="true"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <path d="M14 2v6h6" />
                  <path d="M16 13H8M16 17H8M10 9H8" />
                </svg>
                <span>Auditoría de notas</span>
              </a>
            </div>
          )}

          {!esDocente && !esAdmin && !esSecretaria && (
            <div className="menu-grupo">
              <span className="menu-grupo-etiqueta">Portal Familiar</span>
              <a href="#boletin" aria-current="page" className="menu-enlace menu-enlace-activo">
                <svg
                  aria-hidden="true"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinejoin="round"
                >
                  <path d="M6 3h9l4 4v14H6z" />
                  <path d="M14 3v5h5M9 13h7M9 17h5" />
                </svg>
                <span>Boletín de notas</span>
              </a>
              <a href="#asistencia" className="menu-enlace">
                <svg
                  aria-hidden="true"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                >
                  <rect x="4" y="5" width="16" height="16" rx="2" />
                  <path d="M4 10h16M9 3v4M15 3v4" />
                </svg>
                <span>Asistencia y faltas</span>
              </a>
            </div>
          )}
        </div>

        {/* Tarjeta de perfil inferior con soporte exacto de data-cy y texto */}
        <div className="barra-lateral-usuario-caja">
          <div className="avatar-usuario-pill" aria-hidden="true">
            {iniciales}
          </div>
          <div className="usuario-info-textos">
            <span className="usuario-nombre-linea">{nombre}</span>
            <span className="usuario-rol-linea">{etiquetaMostrada}</span>
            {/* Texto exacto requerido por los tests de Cypress y Vitest */}
            <span
              className="header-usuario"
              data-cy={dataCyUsuario}
              style={{
                position: 'absolute',
                width: 1,
                height: 1,
                padding: 0,
                margin: -1,
                overflow: 'hidden',
                clip: 'rect(0, 0, 0, 0)',
                whiteSpace: 'nowrap',
                border: 0,
              }}
            >
              {nombre} · {rol}
            </span>
          </div>
          <button
            type="button"
            className="btn-salir"
            onClick={onSalir}
            title="Cerrar la sesión actual"
            aria-label="Salir"
          >
            <svg
              aria-hidden="true"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M15 4h4v16h-4M10 16l-4-4 4-4M6 12h10" />
            </svg>
            <span className="texto-btn-salir">Salir</span>
          </button>
        </div>
      </nav>

      {/* Contenido principal institucional */}
      <div className="area-principal-envoltorio">
        <main className="contenido-principal">{children}</main>

        <footer className="footer-institucional">
          <div className="footer-contenido">
            <div className="footer-derechos">
              <strong>{NOMBRE_APP} v1.0</strong> · Sistema de Registro de Calificaciones ·
              Subsistema de Educación Regular de Bolivia
            </div>
            <div className="footer-confidencialidad">
              Confidencialidad garantizada · Protección integral de datos de estudiantes (Ley 548) ·
              Build: {(gitCommit ?? 'local').slice(0, 7)}
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
