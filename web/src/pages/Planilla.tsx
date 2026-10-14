import { useEffect, useState } from 'react';
import { guardarPlanilla, obtenerPlanilla, type Planilla as TPlanilla } from '../lib/api';
import { validarNota } from '../lib/notas';

interface Props {
  token: string;
  actividadId: number;
}

/**
 * Planilla de notas para registro de calificaciones por actividad (US-01).
 * Implementa la escala ministerial 1 a 100 con guardado transaccional.
 */
export function Planilla({ token, actividadId }: Props) {
  const [planilla, setPlanilla] = useState<TPlanilla | null>(null);
  const [valores, setValores] = useState<Record<number, string>>({});
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [errores, setErrores] = useState<Record<number, string>>({});

  useEffect(() => {
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

  if (!planilla) {
    return (
      <div className="planilla-cargando">
        <span className="spinner" aria-hidden="true" />
        <p>{mensaje ?? 'Cargando…'}</p>
      </div>
    );
  }

  return (
    <main className="planilla-principal">
      <div className="planilla-encabezado-detalle">
        <div className="planilla-titulos">
          <h2>
            {planilla.actividad.materia} · {planilla.actividad.dimension} ·{' '}
            {planilla.actividad.nombre}
          </h2>
          <span className="etiqueta-dimension">{planilla.actividad.dimension}</span>
        </div>
        <div className="planilla-meta-info">
          <span className="meta-item">
            <strong>Total estudiantes:</strong> {planilla.filas.length}
          </span>
        </div>
      </div>

      <div className="tabla-envoltorio">
        <table className="tabla-calificaciones">
          <thead>
            <tr>
              <th scope="col" style={{ width: '60%' }}>
                Estudiante
              </th>
              <th scope="col" style={{ width: '40%' }}>
                Nota (1 a 100)
              </th>
            </tr>
          </thead>
          <tbody>
            {planilla.filas.map((f) => {
              const valorActual = Number(valores[f.estudianteId]);
              const yaRegistrada = f.valor !== null;
              return (
                <tr key={f.estudianteId} className={yaRegistrada ? 'fila-registrada' : ''}>
                  <td className="celda-estudiante">
                    <span className="estudiante-icono" aria-hidden="true">
                      👤
                    </span>
                    <span className="estudiante-nombre">{f.estudiante}</span>
                  </td>
                  <td className="celda-nota">
                    <div className="nota-control-grupo">
                      <input
                        aria-label={`Nota de ${f.estudiante}`}
                        value={valores[f.estudianteId] ?? ''}
                        disabled={yaRegistrada}
                        onChange={(e) =>
                          setValores({ ...valores, [f.estudianteId]: e.target.value })
                        }
                        data-cy={`nota-${f.estudianteId}`}
                        className="campo-control-nota"
                        placeholder="1 - 100"
                      />
                      {yaRegistrada && (
                        <span className="nota-badge-estado" title="Nota guardada en sistema">
                          ✓ Registrada
                        </span>
                      )}
                      {!yaRegistrada && !Number.isNaN(valorActual) && valorActual >= 51 && (
                        <span className="nota-indicador-aprobado">Aprobado</span>
                      )}
                    </div>
                    {errores[f.estudianteId] && (
                      <span className="error">{errores[f.estudianteId]}</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="planilla-barra-acciones">
        <button
          type="button"
          onClick={() => void guardar()}
          data-cy="guardar-planilla"
          className="btn btn-guardar"
        >
          <span aria-hidden="true">💾</span> Guardar planilla
        </button>
        {mensaje && (
          <p role="status" className="alerta-estado">
            {mensaje}
          </p>
        )}
      </div>
    </main>
  );
}
