import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Aviso, Cargando, ErrorCarga, Vacio } from '../../componentes/Estados';
import { Icono } from '../../componentes/Icono';
import {
  ErrorApi,
  obtenerHistorialAcademicoEstudiante,
  type HistorialAcademicoEstudiante,
  type TrimestreHistorial,
} from '../../lib/api';
import { formatoNumero, nombreTrimestre } from '../../lib/formato';
import { descargarBoletinEstudiante } from '../../lib/boletin';
import { useCarga } from '../../lib/useCarga';

/**
 * Historial Académico Anual del Estudiante (US-03, T-035).
 * Permite al profesor consultar en orden cronológico las notas y promedios
 * de cada trimestre a lo largo del año para evaluar su evolución académica.
 * Aplica control de acceso: si el profesor no le da clases, el backend responde 403 (criterio 2).
 */
export function HistorialEstudiante() {
  const { estudianteId } = useParams();
  const id = Number(estudianteId);
  const [es403, setEs403] = useState(false);

  const { carga, recargar } = useCarga<HistorialAcademicoEstudiante>(async () => {
    setEs403(false);
    try {
      return await obtenerHistorialAcademicoEstudiante(id);
    } catch (e) {
      if (e instanceof ErrorApi && e.estado === 403) {
        setEs403(true);
      }
      throw e;
    }
  }, [id]);

  const [trimestreSeleccionado, setTrimestreSeleccionado] = useState<number | null>(null);

  if (carga.estado === 'cargando') {
    return <Cargando texto="Cargando historial académico del estudiante…" filas={8} alto={48} />;
  }

  if (es403) {
    return (
      <div style={{ maxWidth: 720, margin: '32px auto' }} data-cy="historial-error-403">
        <Aviso tipo="error">
          <strong>Acceso Denegado (HTTP 403):</strong> No tiene autorización para consultar el
          historial de este estudiante. Solo los profesores con materias asignadas a este estudiante
          o el personal directivo pueden acceder a sus registros académicos (US-03, criterio 2).
        </Aviso>
        <div style={{ marginTop: 16 }}>
          <Link
            to="/profesor/materias"
            className="boton boton-primario"
            data-cy="btn-volver-materias"
          >
            <Icono nombre="flechaIzq" tam={16} />
            Volver a mis materias
          </Link>
        </div>
      </div>
    );
  }

  if (carga.estado === 'error') {
    return (
      <ErrorCarga
        mensaje={`No se pudo cargar el historial académico del estudiante. ${carga.mensaje}`}
        reintentar={recargar}
      />
    );
  }

  const { estudiante, trimestres, promedioAnual, tendencia, estadoAnual } = carga.datos;

  // Trimestres ordenados cronológicamente (criterio 1)
  const trimestresOrdenados = [...trimestres].sort((a, b) => a.numero - b.numero);
  const trimestreActivo: TrimestreHistorial | undefined =
    trimestresOrdenados.find((t) => t.numero === trimestreSeleccionado) ?? trimestresOrdenados[0];

  return (
    <>
      {/* Banner Hero Institucional del Historial (US-03) */}
      <section className="hero-rol hero-profesor" aria-label="Historial académico del estudiante">
        <div className="hero-rol-contenido">
          <div className="hero-rol-insignia">
            <Icono nombre="birrete" tam={16} />
            <span>Historial Académico Anual · Evolución Continua</span>
          </div>
          <h2 data-cy="historial-estudiante-titulo">
            {estudiante.apellidos}, {estudiante.nombres}
          </h2>
          <p>
            RUDE: <strong>{estudiante.codigoRude}</strong>
            {estudiante.ci && (
              <>
                {' '}
                · CI: <strong>{estudiante.ci}</strong>
              </>
            )}{' '}
            · Curso: <strong>{estudiante.curso.nombre}</strong> · Gestión{' '}
            <strong>{estudiante.gestion.anio}</strong>
          </p>
        </div>
        <div className="hero-rol-metricas">
          <div className="hero-metrica-tarjeta">
            <span className="hero-metrica-numero" data-cy="historial-promedio-anual">
              {promedioAnual !== null ? formatoNumero(promedioAnual) : '—'}
            </span>
            <span className="hero-metrica-etiqueta">Promedio Anual</span>
          </div>
          <div className="hero-metrica-tarjeta">
            <span className="hero-metrica-numero" data-cy="historial-tendencia">
              {tendencia === 'ASCENDENTE' && '📈'}
              {tendencia === 'DESCENDENTE' && '📉'}
              {tendencia === 'ESTABLE' && '⚖️'}
              {tendencia === 'PENDIENTE' && '⏳'}
            </span>
            <span className="hero-metrica-etiqueta">
              {tendencia === 'ASCENDENTE' && 'Ascendente'}
              {tendencia === 'DESCENDENTE' && 'En descenso'}
              {tendencia === 'ESTABLE' && 'Estable'}
              {tendencia === 'PENDIENTE' && 'En evaluación'}
            </span>
          </div>
          <div className="hero-metrica-tarjeta">
            <span className="hero-metrica-numero">
              {estadoAnual === 'PROMOVIDO' && 'Aprobado'}
              {estadoAnual === 'EN_RIESGO' && 'En riesgo'}
              {estadoAnual === 'PENDIENTE' && 'Regular'}
            </span>
            <span className="hero-metrica-etiqueta">Condición Anual</span>
          </div>
        </div>
      </section>

      <div className="titulo-pagina">
        <div>
          <Link to="/profesor/materias" className="volver" data-cy="link-volver">
            <Icono nombre="flechaIzq" tam={16} />
            Volver a mis materias
          </Link>
          <h1>Evolución Académica por Trimestre</h1>
          <span className="subtitulo">
            Registro cronológico oficial del estudiante conforme a la normativa ministerial RM
            001/2026
          </span>
        </div>
        <div>
          <button
            type="button"
            className="boton boton-secundario"
            data-cy="btn-descargar-boletin-pdf"
            onClick={() =>
              void descargarBoletinEstudiante(
                estudiante.id,
                `Boletin_${estudiante.apellidos}_${estudiante.nombres}.pdf`,
              )
            }
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            <Icono nombre="documento" tam={16} />
            Descargar Boletín (PDF)
          </button>
        </div>
      </div>

      {/* Tarjetas de Resumen Cronológico de Trimestres (Criterio 1) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 16,
          marginBottom: 24,
        }}
        data-cy="resumen-cronologico-trimestres"
      >
        {trimestresOrdenados.map((t) => {
          const esActivo = (trimestreActivo?.numero ?? 1) === t.numero;
          return (
            <button
              key={t.trimestreId}
              type="button"
              data-cy={`tab-trimestre-${t.numero}`}
              onClick={() => setTrimestreSeleccionado(t.numero)}
              style={{
                textAlign: 'left',
                padding: '16px 20px',
                borderRadius: 8,
                border: esActivo
                  ? '2px solid var(--color-primario, #78192a)'
                  : '1px solid var(--borde)',
                backgroundColor: esActivo ? '#fffaf8' : '#ffffff',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: esActivo ? '0 2px 8px rgba(120, 25, 42, 0.1)' : 'none',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 6,
                }}
              >
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: esActivo ? 'var(--color-primario, #78192a)' : 'var(--texto-1)',
                  }}
                >
                  {nombreTrimestre(t.numero)}
                </span>
                <span
                  className={t.cerrado ? 'insignia insignia-neutra' : 'insignia insignia-exito'}
                  style={{ fontSize: 10 }}
                >
                  {t.cerrado ? 'Cerrado' : 'Vigente'}
                </span>
              </div>
              <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--texto-1)' }}>
                {t.promedioTrimestral !== null ? formatoNumero(t.promedioTrimestral) : '—'}
                <span
                  style={{ fontSize: 12, fontWeight: 400, color: 'var(--texto-3)', marginLeft: 4 }}
                >
                  / 100
                </span>
              </div>
              <div style={{ fontSize: 12, color: 'var(--texto-2)', marginTop: 4 }}>
                {t.materias.length} materias evaluadas
              </div>
            </button>
          );
        })}
      </div>

      {/* Detalle de Calificaciones del Trimestre Seleccionado */}
      {trimestreActivo && (
        <section className="tabla-marco" aria-labelledby="titulo-materias-trimestre">
          <div
            style={{
              padding: '16px 20px',
              borderBottom: '1px solid var(--borde)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <h2 id="titulo-materias-trimestre" style={{ fontSize: 16 }}>
              Calificaciones detalladas · {nombreTrimestre(trimestreActivo.numero)}
            </h2>
            <span style={{ fontSize: 13, color: 'var(--texto-2)' }}>
              Promedio trimestral:{' '}
              <strong style={{ color: 'var(--color-primario, #78192a)' }}>
                {trimestreActivo.promedioTrimestral !== null
                  ? formatoNumero(trimestreActivo.promedioTrimestral)
                  : 'Pendiente'}
              </strong>
            </span>
          </div>

          {trimestreActivo.materias.length === 0 ? (
            <Vacio titulo="No hay notas registradas para este trimestre" />
          ) : (
            <table className="tabla" data-cy="tabla-historial-trimestre">
              <thead>
                <tr>
                  <th scope="col">Materia</th>
                  <th scope="col" className="numero">
                    Ser
                    <br />
                    <small style={{ fontWeight: 400 }}>/ 10</small>
                  </th>
                  <th scope="col" className="numero">
                    Saber
                    <br />
                    <small style={{ fontWeight: 400 }}>/ 45</small>
                  </th>
                  <th scope="col" className="numero">
                    Hacer
                    <br />
                    <small style={{ fontWeight: 400 }}>/ 40</small>
                  </th>
                  <th scope="col" className="numero">
                    Autoev.
                    <br />
                    <small style={{ fontWeight: 400 }}>/ 5</small>
                  </th>
                  <th scope="col" className="numero">
                    <strong>Nota</strong>
                    <br />
                    <small style={{ fontWeight: 400 }}>/ 100</small>
                  </th>
                  <th scope="col">Estado</th>
                </tr>
              </thead>
              <tbody>
                {trimestreActivo.materias.map((m) => {
                  const ser = m.dimensiones.find((d) => d.codigo === 'SER')?.puntos ?? null;
                  const saber = m.dimensiones.find((d) => d.codigo === 'SABER')?.puntos ?? null;
                  const hacer = m.dimensiones.find((d) => d.codigo === 'HACER')?.puntos ?? null;
                  const auto =
                    m.dimensiones.find((d) => d.codigo === 'AUTOEVALUACION')?.puntos ?? null;
                  return (
                    <tr key={m.materiaId} data-cy="fila-materia-historial">
                      <th scope="row">
                        <div>{m.materia}</div>
                        {m.profesor && (
                          <div style={{ fontSize: 11, color: 'var(--texto-3)', fontWeight: 400 }}>
                            Prof. {m.profesor}
                          </div>
                        )}
                      </th>
                      <td className="numero">{ser !== null ? formatoNumero(ser) : '—'}</td>
                      <td className="numero">{saber !== null ? formatoNumero(saber) : '—'}</td>
                      <td className="numero">{hacer !== null ? formatoNumero(hacer) : '—'}</td>
                      <td className="numero">{auto !== null ? formatoNumero(auto) : '—'}</td>
                      <td className="numero nota-celda-final">
                        <strong>{m.nota !== null ? formatoNumero(m.nota) : '—'}</strong>
                      </td>
                      <td>
                        {m.nota === null ? (
                          <span className="insignia insignia-neutra">Pendiente</span>
                        ) : m.aprobado ? (
                          <span className="insignia insignia-exito">
                            <Icono nombre="check" tam={12} /> Aprueba
                          </span>
                        ) : (
                          <span className="insignia insignia-error">
                            <Icono nombre="cruz" tam={12} /> Reprueba
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </section>
      )}
    </>
  );
}
