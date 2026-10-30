import { useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { Cargando, ErrorCarga, Vacio } from '../../componentes/Estados';
import { Icono } from '../../componentes/Icono';
import { listarTrimestres, obtenerMateria, type Trimestre } from '../../lib/api';
import { formatoPorcentaje } from '../../lib/asistencia';
import { formatoNumero, nombreTrimestre } from '../../lib/formato';
import {
  filtrarEstudiantesRiesgo,
  obtenerPanelRiesgoMateria,
  UMBRAL_ASISTENCIA_DEFECTO,
  UMBRAL_NOTA_MINIMA,
  type FiltroRiesgo,
} from '../../lib/riesgo';
import { useCarga } from '../../lib/useCarga';

/**
 * Panel de Riesgo Académico (US-06, T-044).
 * Permite al profesor identificar de un vistazo qué estudiantes están en riesgo antes del cierre de periodo:
 * - Criterio 1: Cada estudiante con su promedio actual y su porcentaje de asistencia.
 * - Criterio 2: Marcado como "en riesgo" si el promedio es menor a 51 o asistencia menor a 80 % (Decisión D6).
 */
export function PanelRiesgo() {
  const materiaId = Number(useParams().materiaId);
  const [parametros, setParametros] = useSearchParams();

  // 1. Carga de metadatos de la materia y trimestres de la gestión
  const { carga: base, recargar: recargarBase } = useCarga(async () => {
    const materia = await obtenerMateria(materiaId);
    const trimestres = await listarTrimestres(materia.gestion.id);
    return { materia, trimestres };
  }, [materiaId]);

  const datosBase = base.estado === 'datos' ? base.datos : null;
  const trimestreActivo: Trimestre | undefined =
    datosBase?.trimestres.find((t) => t.id === Number(parametros.get('trimestre'))) ??
    datosBase?.trimestres.find((t) => !t.cerrado) ??
    datosBase?.trimestres[0];

  // 2. Carga de los datos consolidados de riesgo
  const { carga: panel, recargar: recargarPanel } = useCarga(
    () => obtenerPanelRiesgoMateria(materiaId, trimestreActivo?.id),
    [materiaId, trimestreActivo?.id],
  );

  // Estados de interfaz local para filtrado rápido y búsqueda
  const [filtro, setFiltro] = useState<FiltroRiesgo>('TODOS');
  const [busqueda, setBusqueda] = useState('');

  const estudiantesFiltrados = useMemo(() => {
    if (panel.estado !== 'datos') return [];
    return filtrarEstudiantesRiesgo(panel.datos.estudiantes, filtro, busqueda);
  }, [panel, filtro, busqueda]);

  if (base.estado === 'cargando' || panel.estado === 'cargando') {
    return <Cargando texto="Calculando indicadores de riesgo académico…" filas={8} alto={48} />;
  }

  if (base.estado === 'error') {
    return (
      <ErrorCarga
        mensaje={`No se pudo cargar la materia. ${base.mensaje}`}
        reintentar={recargarBase}
      />
    );
  }

  if (panel.estado === 'error') {
    return (
      <ErrorCarga
        mensaje={`No se pudieron cargar los datos de riesgo. ${panel.mensaje}`}
        reintentar={recargarPanel}
      />
    );
  }

  const { materia, trimestres } = base.datos;
  const datos = panel.datos;
  const resumen = datos.resumen;
  const umbralAsist = datos.umbralAsistencia ?? UMBRAL_ASISTENCIA_DEFECTO;
  const umbralNota = datos.umbralNotaMinima ?? UMBRAL_NOTA_MINIMA;

  return (
    <>
      {/* Banner Hero Institucional del Panel de Riesgo (US-06) */}
      <section
        className="hero-rol hero-profesor"
        aria-label="Panel de Riesgo Académico"
        data-cy="hero-panel-riesgo"
      >
        <div className="hero-rol-contenido">
          <div className="hero-rol-insignia">
            <Icono nombre="alerta" tam={16} />
            <span>Monitoreo Preventivo · US-06</span>
          </div>
          <h2>Panel de Riesgo Académico</h2>
          <p>
            Identificación temprana de estudiantes con dificultades de rendimiento o inasistencias
            recurrentes antes del cierre del trimestre (RM 001/2026 y Decisión D6).
          </p>
        </div>
        <div className="hero-rol-metricas">
          <div className="hero-metrica-tarjeta">
            <span className="hero-metrica-numero">{resumen.totalEstudiantes}</span>
            <span className="hero-metrica-etiqueta">Total estudiantes</span>
          </div>
          <div
            className="hero-metrica-tarjeta"
            style={{
              backgroundColor: resumen.enRiesgoTotal > 0 ? '#fef2f2' : undefined,
              borderColor: resumen.enRiesgoTotal > 0 ? '#fca5a5' : undefined,
            }}
          >
            <span
              className="hero-metrica-numero"
              style={{ color: resumen.enRiesgoTotal > 0 ? '#991b1b' : undefined }}
              data-cy="metrica-total-riesgo"
            >
              {resumen.enRiesgoTotal}
            </span>
            <span
              className="hero-metrica-etiqueta"
              style={{ color: resumen.enRiesgoTotal > 0 ? '#991b1b' : undefined }}
            >
              En riesgo académico
            </span>
          </div>
          <div className="hero-metrica-tarjeta">
            <span className="hero-metrica-numero">
              {resumen.promedioGeneral !== null ? formatoNumero(resumen.promedioGeneral) : '—'}
            </span>
            <span className="hero-metrica-etiqueta">Promedio general</span>
          </div>
          <div className="hero-metrica-tarjeta">
            <span className="hero-metrica-numero">
              {resumen.asistenciaGeneral !== null
                ? formatoPorcentaje(resumen.asistenciaGeneral)
                : '—'}
            </span>
            <span className="hero-metrica-etiqueta">Asistencia promedio</span>
          </div>
        </div>
      </section>

      {/* Encabezado con navegación */}
      <div className="titulo-pagina">
        <div>
          <Link
            to={`/profesor/materias/${materiaId}`}
            className="volver"
            data-cy="link-volver-materia"
          >
            <Icono nombre="flechaIzq" tam={16} />
            Volver a la materia
          </Link>
          <h1 data-cy="titulo-panel-riesgo">{materia.nombre}</h1>
          <span className="subtitulo">
            {materia.curso.nombre} · Gestión {materia.gestion.anio} ·{' '}
            {trimestreActivo ? nombreTrimestre(trimestreActivo.numero) : ''}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <Link
            to={`/profesor/materias/${materiaId}/asistencia`}
            className="boton boton-secundario"
            data-cy="link-ir-asistencia"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            <Icono nombre="personas" tam={18} />
            Control de asistencia
          </Link>
          <Link
            to={`/profesor/materias/${materiaId}/notas?trimestre=${trimestreActivo?.id ?? ''}`}
            className="boton boton-secundario"
            data-cy="link-ir-notas"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            <Icono nombre="tabla" tam={18} />
            Ver planilla trimestral
          </Link>
        </div>
      </div>

      {/* Selector de Trimestres */}
      {trimestres.length > 1 && (
        <div
          className="segmentos"
          role="group"
          aria-label="Selector de Trimestre"
          style={{ marginBottom: 20 }}
        >
          {trimestres.map((t) => (
            <button
              key={t.id}
              type="button"
              className={trimestreActivo?.id === t.id ? 'activo' : ''}
              data-cy={`trimestre-${t.numero}`}
              onClick={() => {
                setParametros({ trimestre: String(t.id) }, { replace: true });
              }}
            >
              {nombreTrimestre(t.numero)}
              {t.cerrado && ' (Cerrado)'}
            </button>
          ))}
        </div>
      )}

      {/* Tarjeta explicativa de umbrales del Ministerio (Decisión D6 y RM 001/2026) */}
      <div
        className="tarjeta"
        style={{
          padding: 16,
          marginBottom: 20,
          backgroundColor: '#f8fafc',
          borderLeft: '4px solid var(--color-primario, #78192a)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <Icono nombre="portapapeles" tam={18} />
          <strong style={{ fontSize: 14 }}>Criterios de Riesgo Académico (Decisión D6)</strong>
        </div>
        <p style={{ fontSize: 13, color: 'var(--texto-2)', margin: 0 }}>
          Un estudiante se clasifica como <strong>«en riesgo»</strong> si presenta un promedio
          actual inferior a <strong>{umbralNota} pts</strong> (nota mínima de aprobación) o un
          porcentaje de asistencia inferior a <strong>{umbralAsist} %</strong> (umbral configurable
          por gestión). Permite coordinar apoyo pedagógico previo a la entrega oficial de notas.
        </p>
      </div>

      {/* Barra de Filtros Rápidos y Búsqueda */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12,
          marginBottom: 16,
        }}
      >
        <div className="segmentos" role="group" aria-label="Filtro de riesgo">
          <button
            type="button"
            className={filtro === 'TODOS' ? 'activo' : ''}
            data-cy="filtro-todos"
            onClick={() => setFiltro('TODOS')}
          >
            Todos ({resumen.totalEstudiantes})
          </button>
          <button
            type="button"
            className={filtro === 'RIESGO' ? 'activo' : ''}
            data-cy="filtro-riesgo"
            onClick={() => setFiltro('RIESGO')}
          >
            En riesgo ({resumen.enRiesgoTotal})
          </button>
          <button
            type="button"
            className={filtro === 'PROMEDIO' ? 'activo' : ''}
            data-cy="filtro-promedio"
            onClick={() => setFiltro('PROMEDIO')}
          >
            Notas &lt; {umbralNota} ({resumen.enRiesgoPromedio + resumen.enRiesgoAmbos})
          </button>
          <button
            type="button"
            className={filtro === 'ASISTENCIA' ? 'activo' : ''}
            data-cy="filtro-asistencia"
            onClick={() => setFiltro('ASISTENCIA')}
          >
            Asistencia &lt; {umbralAsist}% ({resumen.enRiesgoAsistencia + resumen.enRiesgoAmbos})
          </button>
          <button
            type="button"
            className={filtro === 'REGULAR' ? 'activo' : ''}
            data-cy="filtro-regular"
            onClick={() => setFiltro('REGULAR')}
          >
            Regulares ({resumen.regulares})
          </button>
        </div>

        <div style={{ minWidth: 260 }}>
          <input
            type="search"
            className="campo"
            placeholder="Buscar por nombre, RUDE o CI…"
            aria-label="Buscar estudiante"
            data-cy="input-busqueda-estudiante"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            style={{ width: '100%', fontSize: 13 }}
          />
        </div>
      </div>

      {/* Tabla del Panel de Riesgo (US-06, Criterios 1 y 2) */}
      <section className="tabla-marco" data-cy="seccion-panel-riesgo">
        {estudiantesFiltrados.length === 0 ? (
          <div style={{ padding: 24 }}>
            <Vacio
              icono="personas"
              titulo="No se encontraron estudiantes con el filtro seleccionado"
              texto="Modifique el filtro de estado o limpie el término de búsqueda."
            />
          </div>
        ) : (
          <table className="tabla" data-cy="tabla-panel-riesgo">
            <thead>
              <tr>
                <th className="col-n">N.º</th>
                <th>Estudiante</th>
                <th className="numero">Promedio actual</th>
                <th className="numero">Asistencia</th>
                <th>Diagnóstico y Estado</th>
                <th style={{ textAlign: 'center' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {estudiantesFiltrados.map((e, index) => {
                const reprueba = e.promedio !== null && e.promedio < umbralNota;
                const inasistencia =
                  e.porcentajeAsistencia !== null && e.porcentajeAsistencia < umbralAsist;

                return (
                  <tr
                    key={e.estudianteId}
                    data-cy="fila-estudiante-riesgo"
                    style={{
                      backgroundColor: e.enRiesgo ? '#fff5f5' : undefined,
                    }}
                  >
                    <td className="col-n">
                      <span className="insignia-plomo">{index + 1}</span>
                    </td>
                    <td>
                      <div>
                        <strong>{e.estudiante}</strong>
                        <div
                          style={{
                            fontSize: 11,
                            color: 'var(--texto-3)',
                            display: 'flex',
                            gap: 8,
                            marginTop: 2,
                          }}
                        >
                          <span>RUDE: {e.codigoRude}</span>
                          {e.ci && <span>CI: {e.ci}</span>}
                        </div>
                      </div>
                    </td>
                    <td className="numero" data-cy="celda-promedio">
                      {e.promedio !== null ? (
                        <strong
                          style={{
                            color: reprueba ? '#991b1b' : 'var(--color-primario, #78192a)',
                            fontSize: 15,
                          }}
                          data-cy="promedio-estudiante"
                        >
                          {formatoNumero(e.promedio)}
                        </strong>
                      ) : (
                        <span style={{ color: 'var(--texto-3)' }}>Pendiente</span>
                      )}
                    </td>
                    <td className="numero" data-cy="celda-asistencia">
                      {e.porcentajeAsistencia !== null ? (
                        <div>
                          <strong
                            style={{
                              color: inasistencia ? '#b45309' : '#166534',
                              fontSize: 14,
                            }}
                            data-cy="asistencia-estudiante"
                          >
                            {formatoPorcentaje(e.porcentajeAsistencia)}
                          </strong>
                          <div style={{ fontSize: 11, color: 'var(--texto-3)' }}>
                            {e.asistencias} de {e.clasesDictadas} clases
                          </div>
                        </div>
                      ) : (
                        <span style={{ color: 'var(--texto-3)' }}>Sin clases</span>
                      )}
                    </td>
                    <td>
                      {e.estado === 'PENDIENTE' && (
                        <span className="insignia insignia-plomo" data-cy="insignia-pendiente">
                          Sin notas registradas
                        </span>
                      )}

                      {e.enRiesgo && e.motivoRiesgo === 'AMBOS' && (
                        <span
                          className="insignia insignia-error"
                          data-cy="insignia-riesgo-critico"
                          style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
                        >
                          <Icono nombre="alerta" tam={12} />
                          En riesgo crítico (Notas &lt; {umbralNota} y Asistencia &lt; {umbralAsist}
                          %)
                        </span>
                      )}

                      {e.enRiesgo && e.motivoRiesgo === 'PROMEDIO' && (
                        <span
                          className="insignia insignia-error"
                          data-cy="insignia-riesgo-promedio"
                          style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
                        >
                          <Icono nombre="alerta" tam={12} />
                          En riesgo (Promedio &lt; {umbralNota} pts)
                        </span>
                      )}

                      {e.enRiesgo && e.motivoRiesgo === 'ASISTENCIA' && (
                        <span
                          className="insignia insignia-alerta"
                          data-cy="insignia-riesgo-asistencia"
                          style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
                        >
                          <Icono nombre="alerta" tam={12} />
                          En riesgo (Asistencia &lt; {umbralAsist}%)
                        </span>
                      )}

                      {e.estado === 'REGULAR' && (
                        <span
                          className="insignia insignia-exito"
                          data-cy="insignia-regular"
                          style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
                        >
                          <Icono nombre="check" tam={12} />
                          Regular (Sin riesgo)
                        </span>
                      )}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <Link
                        to={`/profesor/estudiantes/${e.estudianteId}/historial`}
                        className="boton boton-secundario"
                        data-cy="btn-ver-historial"
                        style={{ padding: '4px 8px', fontSize: 12 }}
                        title="Consultar historial académico completo del estudiante"
                      >
                        Historial
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>
    </>
  );
}
