import { useState, type FormEvent } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Aviso } from '../componentes/Estados';
import { Logo } from '../componentes/Marco';
import { INICIO_POR_ROL } from '../lib/formato';
import { useInstitucion } from '../lib/institucion';
import { useSesion } from '../lib/sesion';

/** Pantalla de ingreso (US-17, criterio 1; T-012). */
export function Login() {
  const { usuario, motivoSalida, ingresar } = useSesion();
  const { nombre, codigoSie } = useInstitucion();
  const navegar = useNavigate();
  const desde = (useLocation().state as { desde?: string } | null)?.desde;
  const [email, setEmail] = useState('');
  const [contrasena, setContrasena] = useState('');
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

  return (
    <div className="ingreso">
      <section className="ingreso-institucion" aria-label="Institución">
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <Logo tam={48} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span style={{ fontWeight: 700, fontSize: 17 }}>{nombre ?? 'Unidad Educativa'}</span>
            {codigoSie && <span className="ingreso-tenue">Código SIE {codigoSie}</span>}
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 500 }}>
          <h1>Sistema de calificaciones</h1>
          <p>Registro de notas por materia, trimestre y dimensión de evaluación.</p>
        </div>
        <span className="ingreso-tenue ocultar-celular">CalisFacu</span>
      </section>

      <main className="ingreso-formulario">
        <form aria-labelledby="titulo-ingreso" onSubmit={(e) => void enviar(e)} noValidate>
          <h2 id="titulo-ingreso">Iniciar sesión</h2>
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
          <label className="campo">
            Correo electrónico
            <input
              type="email"
              data-cy="login-correo"
              autoComplete="username"
              placeholder="nombre@colegio.edu.bo"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={enviando}
              required
            />
          </label>
          <label className="campo">
            Contraseña
            <input
              type="password"
              data-cy="login-contrasena"
              autoComplete="current-password"
              value={contrasena}
              onChange={(e) => setContrasena(e.target.value)}
              disabled={enviando}
              required
            />
          </label>
          <button
            type="submit"
            className="boton boton-primario"
            data-cy="login-ingresar"
            disabled={enviando}
            aria-busy={enviando}
          >
            {enviando && <span className="girando" aria-hidden="true" />}
            {enviando ? 'Ingresando…' : 'Ingresar'}
          </button>
          <p className="ayuda" style={{ fontSize: 13 }}>
            Por seguridad, al recargar la página debe volver a ingresar.
          </p>
        </form>
      </main>
    </div>
  );
}
