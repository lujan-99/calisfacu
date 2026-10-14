import { useState, type FormEvent } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Aviso } from '../componentes/Estados';
import { Icono } from '../componentes/Icono';
import { Logo } from '../componentes/Marco';
import { INICIO_POR_ROL } from '../lib/formato';
import { useInstitucion } from '../lib/institucion';
import { useSesion } from '../lib/sesion';

/** Cuentas de demostración rápida para facilitar la revisión del sistema por rol */
const CUENTAS_DEMO = [
  { rol: 'Profesor', email: 'profesor@calisfacu.test', pass: 'Calis2026!' },
  { rol: 'Secretaria', email: 'secretaria@calisfacu.test', pass: 'Calis2026!' },
  { rol: 'Administrador', email: 'admin@calisfacu.test', pass: 'Calis2026!' },
  { rol: 'Padre', email: 'padre@calisfacu.test', pass: 'Calis2026!' },
];

/** Pantalla de ingreso profesional (US-17, criterio 1; T-012). */
export function Login() {
  const { usuario, motivoSalida, ingresar } = useSesion();
  const { nombre, codigoSie } = useInstitucion();
  const navegar = useNavigate();
  const desde = (useLocation().state as { desde?: string } | null)?.desde;
  const [email, setEmail] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [mostrarPass, setMostrarPass] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  if (usuario) return <Navigate to={INICIO_POR_ROL[usuario.rol]} replace />;

  async function enviar(evento: FormEvent) {
    evento.preventDefault();
    setError(null);
    setEnviando(true);
    try {
      const u = await ingresar(email, contrasena);
      // Vuelve a la pantalla que pedía, si es de su rol; si no, a su inicio (RutaProtegida corrige el resto).
      void navegar(desde && desde !== '/ingresar' ? desde : INICIO_POR_ROL[u.rol], {
        replace: true,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo iniciar sesión');
      setEnviando(false);
    }
  }

  function cargarDemo(demoEmail: string, demoPass: string) {
    setEmail(demoEmail);
    setContrasena(demoPass);
    setError(null);
  }

  return (
    <div className="ingreso">
      {/* Panel Institucional Izquierdo con Identidad Guindo */}
      <section className="ingreso-institucion" aria-label="Institución">
        <div className="ingreso-institucion-cabecera">
          <div className="ingreso-marca-bloque">
            <Logo tam={52} />
            <div className="ingreso-marca-textos">
              <span className="ingreso-institucion-nombre">{nombre ?? 'Unidad Educativa'}</span>
              <div className="ingreso-insignias-fila">
                {codigoSie && <span className="ingreso-tenue">Código SIE {codigoSie}</span>}
                <span className="ingreso-badge-gestion">Gestión 2026</span>
              </div>
            </div>
          </div>
        </div>

        <div className="ingreso-institucion-cuerpo">
          <div className="ingreso-pildora-normativa">
            <Icono nombre="escudo" tam={16} />
            <span>Subsistema de Educación Regular · Bolivia</span>
          </div>

          <h1>Sistema de calificaciones</h1>
          <p>Registro de notas por materia, trimestre y dimensión de evaluación.</p>

          <div className="ingreso-caracteristicas">
            <div className="ingreso-caracteristica-item">
              <div className="ingreso-caracteristica-icono">
                <Icono nombre="check" tam={16} />
              </div>
              <div className="ingreso-caracteristica-texto">
                <strong>Resolución Ministerial 001/2026</strong>
                <span>
                  Cálculo ponderado en dimensiones Ser (10), Saber (35), Hacer (35) y Autoevaluación
                  (10).
                </span>
              </div>
            </div>

            <div className="ingreso-caracteristica-item">
              <div className="ingreso-caracteristica-icono">
                <Icono nombre="grafico" tam={16} />
              </div>
              <div className="ingreso-caracteristica-texto">
                <strong>Precisión Decimal y Centralización</strong>
                <span>
                  Procesamiento exacto sin redondeos prematuros y emisión centralizada de boletines.
                </span>
              </div>
            </div>

            <div className="ingreso-caracteristica-item">
              <div className="ingreso-caracteristica-icono">
                <Icono nombre="candado" tam={16} />
              </div>
              <div className="ingreso-caracteristica-texto">
                <strong>Auditoría Inmutable</strong>
                <span>
                  Trazabilidad integral de cada registro y corrección de calificación por materia.
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="ingreso-institucion-pie">
          <span className="ingreso-tenue ocultar-celular">CalisFacu</span>
          <span className="ingreso-pie-norma">RM 001/2026 · Ministerio de Educación</span>
        </div>
      </section>

      {/* Formulario de Acceso a la Derecha */}
      <main className="ingreso-formulario">
        <div className="ingreso-tarjeta-contenedor">
          <div className="ingreso-tarjeta-encabezado">
            <div className="ingreso-badge-seguro">
              <Icono nombre="candado" tam={14} />
              <span>Portal Oficial de Acceso</span>
            </div>
            <h2 id="titulo-ingreso">Iniciar sesión</h2>
            <p className="ingreso-subtitulo-formulario">
              Ingrese sus credenciales autorizadas para acceder a su espacio de trabajo
              institucional.
            </p>
          </div>

          <form aria-labelledby="titulo-ingreso" onSubmit={(e) => void enviar(e)} noValidate>
            {motivoSalida === 'expirada' && !error && (
              <Aviso tipo="info" cy="login-sesion-expirada">
                Su sesión expiró; vuelva a ingresar
              </Aviso>
            )}
            {error && (
              <Aviso tipo="error" cy="login-error">
                {error}
              </Aviso>
            )}

            <label className="campo campo-icono">
              <span className="campo-etiqueta-texto">Correo electrónico</span>
              <div className="entrada-con-icono">
                <span className="icono-prefijo" aria-hidden="true">
                  <Icono nombre="correo" tam={18} />
                </span>
                <input
                  type="email"
                  data-cy="login-correo"
                  autoComplete="username"
                  placeholder="ejemplo@calisfacu.test"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={enviando}
                  required
                />
              </div>
            </label>

            <label className="campo campo-icono">
              <span className="campo-etiqueta-texto">Contraseña</span>
              <div className="entrada-con-icono">
                <span className="icono-prefijo" aria-hidden="true">
                  <Icono nombre="candado" tam={18} />
                </span>
                <input
                  type={mostrarPass ? 'text' : 'password'}
                  data-cy="login-contrasena"
                  autoComplete="current-password"
                  placeholder="••••••••••••"
                  value={contrasena}
                  onChange={(e) => setContrasena(e.target.value)}
                  disabled={enviando}
                  required
                />
                <button
                  type="button"
                  className="boton-mostrar-pass"
                  onClick={() => setMostrarPass((v) => !v)}
                  title={mostrarPass ? 'Ocultar contraseña' : 'Ver contraseña'}
                  aria-label={mostrarPass ? 'Ocultar contraseña' : 'Ver contraseña'}
                  tabIndex={-1}
                >
                  <Icono nombre={mostrarPass ? 'ojoTachado' : 'ojo'} tam={18} />
                </button>
              </div>
            </label>

            <button
              type="submit"
              className="boton boton-primario boton-ingresar-completo"
              data-cy="login-ingresar"
              disabled={enviando}
              aria-busy={enviando}
            >
              {enviando && <span className="girando" aria-hidden="true" />}
              <span>{enviando ? 'Ingresando…' : 'Ingresar'}</span>
              {!enviando && <Icono nombre="flechaDer" tam={18} />}
            </button>

            {/* Selector rápido para pruebas por rol */}
            <div className="ingreso-demos">
              <span className="ingreso-demos-titulo">Acceso rápido de prueba por rol:</span>
              <div className="ingreso-demos-botones">
                {CUENTAS_DEMO.map((c) => (
                  <button
                    key={c.rol}
                    type="button"
                    className="boton-demo-chip"
                    onClick={() => cargarDemo(c.email, c.pass)}
                    title={`Cargar credenciales de ${c.rol}`}
                  >
                    {c.rol}
                  </button>
                ))}
              </div>
            </div>

            <p className="ayuda ingreso-nota-seguridad">
              <Icono nombre="escudo" tam={14} />
              <span>
                Conexión protegida. Las sesiones se autentican con tokens firmados
                criptográficamente.
              </span>
            </p>
          </form>
        </div>
      </main>
    </div>
  );
}
