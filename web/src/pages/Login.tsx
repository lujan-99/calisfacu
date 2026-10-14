import { useState, type FormEvent } from 'react';
import { CampoFormulario } from '../components/CampoFormulario';
import { iniciarSesion, type Sesion } from '../lib/api';
import { DESCRIPCION_APP, NOMBRE_APP } from '../lib/constantes';

interface Props {
  alIniciar: (sesion: Sesion) => void;
}

interface CuentaDemo {
  rol: string;
  etiqueta: string;
  email: string;
  icono: string;
}

const CUENTAS_DEMO: CuentaDemo[] = [
  {
    rol: 'PROFESOR',
    etiqueta: 'Profesor',
    email: 'profesor@calisfacu.test',
    icono: '👩‍🏫',
  },
  {
    rol: 'SECRETARIA',
    etiqueta: 'Secretaría',
    email: 'secretaria@calisfacu.test',
    icono: '🏛️',
  },
  {
    rol: 'ADMINISTRADOR',
    etiqueta: 'Administrador',
    email: 'admin@calisfacu.test',
    icono: '🛡️',
  },
  {
    rol: 'PADRE',
    etiqueta: 'Padre / Tutor',
    email: 'padre@calisfacu.test',
    icono: '👨‍👩‍👦',
  },
];

/**
 * Pantalla de inicio de sesión institucional — T-012 (US-17 CA 1).
 *
 * Características profesionales:
 * - Identidad visual oficial: Guindo institucional (#6B1A2A) y Plomo (#607080).
 * - Conforme a la normativa educativa boliviana RM 001/2026.
 * - Acceso rápido para demostración y evaluación con credenciales sintéticas del seed.
 * - Soporte total para pruebas Vitest y Cypress con data-cy y roles ARIA.
 */
export function Login({ alIniciar }: Props) {
  const [email, setEmail] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function manejarEnvio(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setError(null);
    setEnviando(true);
    try {
      alIniciar(await iniciarSesion(email, contrasena));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo iniciar sesión');
    } finally {
      setEnviando(false);
    }
  }

  function autocompletar(cuenta: CuentaDemo) {
    setEmail(cuenta.email);
    setContrasena('Calis2026!');
    setError(null);
  }

  return (
    <div className="login-fondo">
      {/* Panel izquierdo: identidad institucional oficial */}
      <section className="login-panel-marca">
        <div className="marca-encabezado-oficial">
          <span className="marca-pais">ESTADO PLURINACIONAL DE BOLIVIA</span>
          <span className="marca-ministerio">MINISTERIO DE EDUCACIÓN</span>
        </div>

        <div className="login-emblema-contenedor">
          <svg
            className="login-emblema-svg"
            viewBox="0 0 100 100"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            {/* Escudo institucional estilizado */}
            <defs>
              <linearGradient id="escudoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#d4af37" />
                <stop offset="100%" stopColor="#997a15" />
              </linearGradient>
              <linearGradient id="fondoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="rgba(255,255,255,0.2)" />
                <stop offset="100%" stopColor="rgba(255,255,255,0.05)" />
              </linearGradient>
            </defs>
            <path
              d="M50 8 L85 24 C85 60 50 92 50 92 C50 92 15 60 15 24 Z"
              fill="url(#fondoGrad)"
              stroke="url(#escudoGrad)"
              strokeWidth="3"
            />
            {/* Libro abierto central */}
            <path
              d="M32 46 C38 42 45 42 50 46 C55 42 62 42 68 46 L68 66 C62 62 55 62 50 66 C45 62 38 62 32 66 Z"
              fill="#ffffff"
              opacity="0.95"
            />
            {/* Birrete superior */}
            <path d="M50 26 L66 34 L50 40 L34 34 Z" fill="url(#escudoGrad)" />
            <path d="M42 37 L42 44 C42 46 50 48 50 48 C50 48 58 46 58 44 L58 37" fill="#ffffff" />
          </svg>
        </div>

        <div className="marca-titular">
          <h1 className="login-marca-titulo">{NOMBRE_APP}</h1>
          <div className="marca-version-badge">Versión 1.0 · Gestión 2026</div>
        </div>

        <p className="login-marca-subtitulo">{DESCRIPCION_APP}</p>

        <div className="marca-caracteristicas-lista" aria-hidden="true">
          <div className="caracteristica-item">
            <span className="caracteristica-icono">⚖️</span>
            <div>
              <strong>Reglamento RM 001/2026</strong>
              <span>Cálculo ponderado en Ser, Saber, Hacer y Decidir</span>
            </div>
          </div>
          <div className="caracteristica-item">
            <span className="caracteristica-icono">🛡️</span>
            <div>
              <strong>Seguridad y Control de Acceso</strong>
              <span>Sesión en memoria y roles pedagógicos estrictos</span>
            </div>
          </div>
          <div className="caracteristica-item">
            <span className="caracteristica-icono">📋</span>
            <div>
              <strong>Auditoría Inmutable</strong>
              <span>Trazabilidad histórica completa de calificaciones</span>
            </div>
          </div>
        </div>
      </section>

      {/* Panel derecho: formulario de acceso y atajos */}
      <section className="login-panel-formulario">
        <div className="login-tarjeta">
          <div className="tarjeta-bienvenida">
            <h2 className="login-tarjeta-titulo">Portal de Acceso</h2>
            <p className="login-tarjeta-subtitulo">
              Ingrese con sus credenciales institucionales autorizadas
            </p>
          </div>

          <form onSubmit={(e) => void manejarEnvio(e)} aria-label="Inicio de sesión" noValidate>
            <CampoFormulario
              id="email"
              etiqueta="Correo electrónico institucional"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              data-cy="email"
              aria-label="Correo"
              placeholder="ejemplo@calisfacu.test"
            />

            <CampoFormulario
              id="contrasena"
              etiqueta="Contraseña"
              type="password"
              value={contrasena}
              onChange={(e) => setContrasena(e.target.value)}
              required
              autoComplete="current-password"
              data-cy="contrasena"
              aria-label="Contraseña"
              placeholder="••••••••••••"
            />

            {error !== null && (
              <div className="alerta alerta-error mb-4" role="alert">
                <span className="alerta-icono" aria-hidden="true">
                  ⚠️
                </span>
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              className="btn btn-primario btn-ingresar"
              disabled={enviando}
              data-cy="ingresar"
            >
              {enviando ? (
                <>
                  <span className="spinner" aria-hidden="true" />
                  <span>Ingresando…</span>
                </>
              ) : (
                'Ingresar'
              )}
            </button>
          </form>

          {/* Atajos de acceso para evaluación / pruebas rápidas */}
          <div className="login-demo-panel">
            <div className="demo-divisor">
              <span>Cuentas de demostración (Seed)</span>
            </div>
            <div className="demo-chips-grid">
              {CUENTAS_DEMO.map((cuenta) => (
                <button
                  key={cuenta.rol}
                  type="button"
                  className="demo-chip-boton"
                  onClick={() => autocompletar(cuenta)}
                  title={`Cargar credenciales de ${cuenta.etiqueta}`}
                >
                  <span className="chip-icono">{cuenta.icono}</span>
                  <span className="chip-texto">{cuenta.etiqueta}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
