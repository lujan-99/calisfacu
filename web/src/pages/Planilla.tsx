import { useEffect, useState } from 'react';
import { guardarPlanilla, obtenerPlanilla, type Planilla as TPlanilla } from '../lib/api';
import { validarNota } from '../lib/notas';

interface Props {
  token: string;
  actividadId: number;
}

// US-01: planilla de registro de notas de una actividad (se guardan todas o ninguna).
export function Planilla({ token, actividadId }: Props) {
  const [planilla, setPlanilla] = useState<TPlanilla | null>(null);
  const [valores, setValores] = useState<Record<number, string>>({});
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [errores, setErrores] = useState<Record<number, string>>({});

  useEffect(() => {
    // Si cambia la actividad antes de que llegue la respuesta, la respuesta vieja se descarta.
    let vigente = true;
    obtenerPlanilla(actividadId, token)
      .then((p) => {
        if (!vigente) return;
        setPlanilla(p);
        setValores(
          Object.fromEntries(p.filas.map((f) => [f.estudianteId, f.valor?.toString() ?? ''])),
        );
      })
      .catch((e: Error) => {
        if (vigente) setMensaje(e.message);
      });
    return () => {
      vigente = false;
    };
  }, [actividadId, token]);

  async function guardar() {
    if (!planilla) return;
    const nuevosErrores: Record<number, string> = {};
    const notas: { estudianteId: number; valor: number }[] = [];
    for (const fila of planilla.filas.filter((f) => f.valor === null)) {
      const r = validarNota(valores[fila.estudianteId] ?? '');
      if (r.valida) notas.push({ estudianteId: fila.estudianteId, valor: r.valor });
      else nuevosErrores[fila.estudianteId] = r.error;
    }
    setErrores(nuevosErrores);
    if (Object.keys(nuevosErrores).length > 0) return;
    try {
      const r = await guardarPlanilla(actividadId, notas, token);
      setMensaje(`Se guardaron ${r.guardadas} notas`);
    } catch (e) {
      setMensaje(e instanceof Error ? e.message : 'No se pudo guardar');
    }
  }

  if (!planilla) return <p>{mensaje ?? 'Cargando…'}</p>;
  return (
    <main>
      <h2>
        {planilla.actividad.materia} · {planilla.actividad.dimension} · {planilla.actividad.nombre}
      </h2>
      <table>
        <thead>
          <tr>
            <th>Estudiante</th>
            <th>Nota (1 a 100)</th>
          </tr>
        </thead>
        <tbody>
          {planilla.filas.map((f) => (
            <tr key={f.estudianteId}>
              <td>{f.estudiante}</td>
              <td>
                <input
                  aria-label={`Nota de ${f.estudiante}`}
                  value={valores[f.estudianteId] ?? ''}
                  disabled={f.valor !== null}
                  onChange={(e) => setValores({ ...valores, [f.estudianteId]: e.target.value })}
                  data-cy={`nota-${f.estudianteId}`}
                />
                {errores[f.estudianteId] && (
                  <span className="error">{errores[f.estudianteId]}</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <button onClick={() => void guardar()} data-cy="guardar-planilla">
        Guardar planilla
      </button>
      {mensaje && <p role="status">{mensaje}</p>}
    </main>
  );
}
