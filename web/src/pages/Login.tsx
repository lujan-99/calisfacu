import { useState, type FormEvent } from 'react';
import { iniciarSesion, type Sesion } from '../lib/api';

interface Props {
  alIniciar: (sesion: Sesion) => void;
}

export function Login({ alIniciar }: Props) {
  const [email, setEmail] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function enviar(evento: FormEvent) {
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

  return (
    <main className="tarjeta">
      <h1>CalisFacu</h1>
      <form onSubmit={(e) => void enviar(e)} aria-label="Inicio de sesión">
        <label>
          Correo
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            data-cy="email"
          />
        </label>
        <label>
          Contraseña
          <input
            type="password"
            value={contrasena}
            onChange={(e) => setContrasena(e.target.value)}
            required
            data-cy="contrasena"
          />
        </label>
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
        <button type="submit" disabled={enviando} data-cy="ingresar">
          {enviando ? 'Ingresando…' : 'Ingresar'}
        </button>
      </form>
    </main>
  );
}
