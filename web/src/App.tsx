import { useState } from 'react';
import type { Sesion } from './lib/api';
import { Login } from './pages/Login';
import { Planilla } from './pages/Planilla';

export function App() {
  const [sesion, setSesion] = useState<Sesion | null>(null);
  const [actividadId, setActividadId] = useState<number>(1);

  return (
    <>
      {!sesion ? (
        <Login alIniciar={setSesion} />
      ) : (
        <div>
          <header>
            <span data-cy="usuario">
              {sesion.usuario.nombre} · {sesion.usuario.rol}
            </span>
            <button onClick={() => setSesion(null)}>Salir</button>
          </header>
          {sesion.usuario.rol === 'PROFESOR' ? (
            <>
              <label>
                Actividad
                <input
                  type="number"
                  min={1}
                  value={actividadId}
                  onChange={(e) => setActividadId(Number(e.target.value))}
                />
              </label>
              <Planilla token={sesion.token} actividadId={actividadId} />
            </>
          ) : (
            <p>Las pantallas de este rol se construyen en los sprints siguientes.</p>
          )}
        </div>
      )}
      <footer>CalisFacu · versión {__GIT_COMMIT__.slice(0, 7)}</footer>
    </>
  );
}
