import { useEffect, useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Aviso, Cargando, ErrorCarga, Vacio } from '../../componentes/Estados';
import { Icono } from '../../componentes/Icono';
import {
  guardarAsistenciaClase,
  obtenerAsistenciaClase,
  obtenerMateria,
  obtenerPorcentajesAsistencia,
  type EstadoAsistencia,
  type PorcentajeAsistenciaEstudiante,
} from '../../lib/api';
import {
  calcularPorcentajeAsistencia,
  esFechaFutura,
  formatoPorcentaje,
  hoyEnBolivia,
  nivelAsistencia,
} from '../../lib/asistencia';
import { useCarga } from '../../lib/useCarga';

/**
 * Pantalla de Toma de Asistencia por Clase y Resumen de Porcentajes (US-19, T-037).
 * Permite al profesor marcar a cada estudiante como PRESENTE, AUSENTE o LICENCIA en una fecha válida (sin fechas futuras),
 * y consultar el porcentaje de asistencia acumulado por estudiante conforme a la decisión ministerial D5.
 */
export function AsistenciaMateria() {
  const materiaId = Number(useParams().materiaId);
  const fechaHoy = hoyEnBolivia();

  const [tabActiva, setTabActiva] = useState<'clase' | 'porcentajes'>('clase');
  const [fechaSeleccionada, setFechaSeleccionada] = useState(fechaHoy);
  const [estados, setEstados] = useState<Record<number, EstadoAsistencia>>({});
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState<{
    tipo: 'exito' | 'error' | 'advertencia';
    texto: string;
  } | null>(null);

  // Filtros de fecha para la pestaña de porcentajes
  const [filtroDesde, setFiltroDesde] = useState('');
  const [filtroHasta, setFiltroHasta] = useState('');
  const [porcentajes, setPorcentajes] = useState<PorcentajeAsistenciaEstudiante[] | null>(null);
  const [cargandoPorcentajes, setCargandoPorcentajes] = useState(false);

  // Carga de información de la materia
  const { carga: materiaCarga, recargar: recargarMateria } = useCarga(
    () => obtenerMateria(materiaId),
    [materiaId],
  );

  // Carga de la lista de asistencia para la fecha seleccionada
  const {
    carga: asistenciaCarga,
    recargar: recargarAsistencia,
    setCarga: setAsistenciaCarga,
  } = useCarga(() => {
    if (esFechaFutura(fechaSeleccionada)) {
      return Promise.reject(new Error('No se puede registrar asistencia de una fecha futura'));
    }
    return obtenerAsistenciaClase(materiaId, fechaSeleccionada);
  }, [materiaId, fechaSeleccionada]);

  // Limpiar mensajes al cambiar la fecha seleccionada
  useEffect(() => {
    setMensaje(null);
  }, [fechaSeleccionada]);

  // Sincronizar el estado de los estudiantes cuando se cargan los datos de la fecha
  useEffect(() => {
    if (asistenciaCarga.estado === 'datos') {
      const mapaInicial: Record<number, EstadoAsistencia> = {};
      for (const fila of asistenciaCarga.datos.filas) {
        if (fila.estado) {
          mapaInicial[fila.estudianteId] = fila.estado;
        }
      }
      setEstados(mapaInicial);
    } else if (asistenciaCarga.estado === 'error') {
      setEstados({});
    }
  }, [asistenciaCarga]);

  // Cargar porcentajes al cambiar a la pestaña de porcentajes
  const cargarResumenPorcentajes = async () => {
    setCargandoPorcentajes(true);
    try {
      const datos = await obtenerPorcentajesAsistencia(
        materiaId,
        filtroDesde || undefined,
        filtroHasta || undefined,
      );
      setPorcentajes(datos);
    } catch (e) {
      setMensaje({
        tipo: 'error',
        texto:
          e instanceof Error ? e.message : 'No se pudieron cargar los porcentajes de asistencia.',
      });
    } finally {
      setCargandoPorcentajes(false);
    }
  };

  useEffect(() => {
    if (tabActiva === 'porcentajes') {
      void cargarResumenPorcentajes();
    }
  }, [tabActiva, materiaId]);

  if (materiaCarga.estado === 'cargando') {
    return <Cargando texto="Cargando materia…" filas={6} alto={48} />;
  }

  if (materiaCarga.estado === 'error') {
    return <ErrorCarga mensaje={materiaCarga.mensaje} reintentar={recargarMateria} />;
  }

  const materia = materiaCarga.datos;
  const esFutura = esFechaFutura(fechaSeleccionada);

  // Métricas de la clase actual
  const filasEstudiantes = asistenciaCarga.estado === 'datos' ? asistenciaCarga.datos.filas : [];
  const conteoClase = {
    presentes: filasEstudiantes.filter((f) => estados[f.estudianteId] === 'PRESENTE').length,
    licencias: filasEstudiantes.filter((f) => estados[f.estudianteId] === 'LICENCIA').length,
    ausentes: filasEstudiantes.filter((f) => estados[f.estudianteId] === 'AUSENTE').length,
  };
  const pendientesMarcado = filasEstudiantes.filter((f) => !estados[f.estudianteId]).length;
  const porcentajeClase = calcularPorcentajeAsistencia(conteoClase);

  // Acciones rápidas de marcado
  const marcarTodos = (estado: EstadoAsistencia) => {
    const nuevoMapa: Record<number, EstadoAsistencia> = {};
    for (const fila of filasEstudiantes) {
      nuevoMapa[fila.estudianteId] = estado;
    }
    setEstados(nuevoMapa);
  };

  const cambiarEstado = (estudianteId: number, estado: EstadoAsistencia) => {
    setEstados((prev) => ({ ...prev, [estudianteId]: estado }));
  };

  // Guardar asistencia (US-19, criterio 1 y 3)
  const alGuardar = async (e: FormEvent) => {
    e.preventDefault();
    if (esFutura) {
      setMensaje({
        tipo: 'error',
        texto: 'No se puede registrar asistencia de una fecha futura.',
      });
      return;
    }

    if (pendientesMarcado > 0) {
      setMensaje({
        tipo: 'advertencia',
        texto: `Falta marcar la asistencia de ${pendientesMarcado} estudiante(s). La lista debe ser completa.`,
      });
      return;
    }

    setGuardando(true);
    setMensaje(null);

    const payload = {
      registros: filasEstudiantes.map((f) => ({
        estudianteId: f.estudianteId,
        estado: estados[f.estudianteId],
      })),
    };

    try {
      await guardarAsistenciaClase(materiaId, fechaSeleccionada, payload);
      setMensaje({
        tipo: 'exito',
        texto: `Se guardó correctamente la asistencia de la clase (${fechaSeleccionada}).`,
      });
      // Actualizar datos de la carga
      setAsistenciaCarga({
        estado: 'datos',
        datos: {
          materia: materia.nombre,
          fecha: fechaSeleccionada,
          filas: filasEstudiantes.map((f) => ({
            ...f,
            estado: estados[f.estudianteId],
          })),
        },
      });
    } catch (err) {
      setMensaje({
        tipo: 'error',
        texto: err instanceof Error ? err.message : 'No se pudo guardar la asistencia.',
      });
    } finally {
      setGuardando(false);
    }
  };

  return (
    <>
      {/* Banner Hero Institucional (US-19) */}
      <section className="hero-rol hero-profesor" aria-label="Control de asistencia">
        <div className="hero-rol-contenido">
          <div className="hero-rol-insignia">
            <Icono nombre="personas" tam={16} />
            <span>Asistencia por Clase · RM 001/2026 · US-19</span>
          </div>
          <h2>Control de Asistencia · {materia.nombre}</h2>
          <p>
            Registro ágil de asistencia diaria de la clase (Presente, Ausente, Licencia). El
            porcentaje se calcula automáticamente según la decisión D5: (Presentes + Licencias) /
            Clases dictadas × 100.
          </p>
        </div>
        <div className="hero-rol-metricas">
          <div className="hero-metrica-tarjeta">
            <span className="hero-metrica-numero">{filasEstudiantes.length || '—'}</span>
            <span className="hero-metrica-etiqueta">Estudiantes</span>
          </div>
          <div className="hero-metrica-tarjeta">
            <span className="hero-metrica-numero">
              {conteoClase.presentes + conteoClase.licencias}
            </span>
            <span className="hero-metrica-etiqueta">Asistieron hoy</span>
          </div>
          <div className="hero-metrica-tarjeta">
            <span className="hero-metrica-numero">
              {porcentajeClase !== null ? formatoPorcentaje(porcentajeClase) : '—'}
            </span>
            <span className="hero-metrica-etiqueta">Asistencia de la fecha</span>
          </div>
        </div>
      </section>

      {/* Cabecera y Navegación */}
      <div className="titulo-pagina">
        <div>
          <Link
            to={`/profesor/materias/${materiaId}`}
            className="volver"
            data-cy="link-volver-materia"
          >
            <Icono nombre="flechaIzq" tam={16} />
            Volver a actividades de {materia.nombre}
          </Link>
          <h1 data-cy="asistencia-titulo">Asistencia: {materia.nombre}</h1>
          <span className="subtitulo">
            {materia.curso.nombre} · Gestión {materia.gestion.anio}
          </span>
        </div>

        {/* Pestañas de modo */}
        <div className="segmentos" role="group" aria-label="Vistas de asistencia">
          <button
            type="button"
            className="segmento"
            data-cy="tab-toma-asistencia"
            aria-pressed={tabActiva === 'clase'}
            onClick={() => setTabActiva('clase')}
          >
            <Icono nombre="lapiz" tam={16} />
            Toma de asistencia diaria
          </button>
          <button
            type="button"
            className="segmento"
            data-cy="tab-porcentajes"
            aria-pressed={tabActiva === 'porcentajes'}
            onClick={() => setTabActiva('porcentajes')}
          >
            <Icono nombre="grafico" tam={16} />
            Porcentajes acumulados (D5)
          </button>
        </div>
      </div>

      {mensaje && (
        <Aviso tipo={mensaje.tipo} cy={`aviso-${mensaje.tipo}`}>
          {mensaje.texto}
        </Aviso>
      )}

      {/* PESTAÑA 1: TOMA DE ASISTENCIA DIARIA */}
      {tabActiva === 'clase' && (
        <>
          <div
            className="tarjeta"
            style={{
              padding: '16px 20px',
              marginBottom: 20,
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 16,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <label htmlFor="selector-fecha-asistencia" style={{ fontWeight: 600, fontSize: 14 }}>
                Fecha de la clase:
              </label>
              <input
                id="selector-fecha-asistencia"
                type="date"
                data-cy="input-fecha-asistencia"
                className="campo-input"
                style={{ width: 'auto', padding: '6px 12px' }}
                value={fechaSeleccionada}
                max={fechaHoy}
                onChange={(e) => setFechaSeleccionada(e.target.value)}
              />
              {fechaSeleccionada === fechaHoy && (
                <span className="insignia insignia-trimestre" style={{ fontSize: 12 }}>
                  Hoy en Bolivia
                </span>
              )}
            </div>

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button
                type="button"
                className="boton boton-secundario"
                data-cy="btn-todos-presentes"
                disabled={esFutura || filasEstudiantes.length === 0}
                onClick={() => marcarTodos('PRESENTE')}
                style={{ fontSize: 12 }}
              >
                Marcar todos Presentes
              </button>
              <button
                type="button"
                className="boton boton-secundario"
                data-cy="btn-todos-ausentes"
                disabled={esFutura || filasEstudiantes.length === 0}
                onClick={() => marcarTodos('AUSENTE')}
                style={{ fontSize: 12 }}
              >
                Marcar todos Ausentes
              </button>
            </div>
          </div>

          {esFutura && (
            <Aviso tipo="error" cy="aviso-fecha-futura">
              <strong>Fecha no permitida.</strong> No se puede registrar asistencia de una fecha
              futura (US-19, criterio 3). Seleccione hoy o una fecha anterior.
            </Aviso>
          )}

          {!esFutura && asistenciaCarga.estado === 'cargando' && (
            <Cargando texto="Cargando asistencia de la clase…" filas={8} alto={40} />
          )}

          {!esFutura && asistenciaCarga.estado === 'error' && (
            <ErrorCarga mensaje={asistenciaCarga.mensaje} reintentar={recargarAsistencia} />
          )}

          {!esFutura && asistenciaCarga.estado === 'datos' && (
            <form
              onSubmit={(e) => {
                void alGuardar(e);
              }}
            >
              <div className="tabla-marco" style={{ marginBottom: 20 }}>
                <table className="tabla" data-cy="tabla-toma-asistencia">
                  <thead>
                    <tr>
                      <th className="col-n">N.º</th>
                      <th>Estudiante</th>
                      <th style={{ textAlign: 'center', width: 280 }}>Estado de Asistencia</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filasEstudiantes.map((fila, index) => {
                      const actual = estados[fila.estudianteId];
                      return (
                        <tr key={fila.estudianteId} data-cy="fila-asistencia-estudiante">
                          <td className="col-n">{index + 1}</td>
                          <td>
                            <strong>{fila.estudiante}</strong>
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <div
                              role="radiogroup"
                              aria-label={`Asistencia de ${fila.estudiante}`}
                              style={{ display: 'inline-flex', gap: 6 }}
                            >
                              <button
                                type="button"
                                className={
                                  actual === 'PRESENTE'
                                    ? 'boton boton-primario'
                                    : 'boton boton-secundario'
                                }
                                data-cy={`btn-presente-${fila.estudianteId}`}
                                data-testid={`btn-presente-${fila.estudianteId}`}
                                aria-checked={actual === 'PRESENTE'}
                                role="radio"
                                onClick={() => cambiarEstado(fila.estudianteId, 'PRESENTE')}
                                style={{
                                  padding: '4px 10px',
                                  fontSize: 12,
                                  backgroundColor: actual === 'PRESENTE' ? '#166534' : undefined,
                                  borderColor: actual === 'PRESENTE' ? '#166534' : undefined,
                                }}
                              >
                                Presente (P)
                              </button>
                              <button
                                type="button"
                                className={
                                  actual === 'LICENCIA'
                                    ? 'boton boton-primario'
                                    : 'boton boton-secundario'
                                }
                                data-cy={`btn-licencia-${fila.estudianteId}`}
                                data-testid={`btn-licencia-${fila.estudianteId}`}
                                aria-checked={actual === 'LICENCIA'}
                                role="radio"
                                onClick={() => cambiarEstado(fila.estudianteId, 'LICENCIA')}
                                style={{
                                  padding: '4px 10px',
                                  fontSize: 12,
                                  backgroundColor: actual === 'LICENCIA' ? '#854d0e' : undefined,
                                  borderColor: actual === 'LICENCIA' ? '#854d0e' : undefined,
                                }}
                              >
                                Licencia (L)
                              </button>
                              <button
                                type="button"
                                className={
                                  actual === 'AUSENTE'
                                    ? 'boton boton-primario'
                                    : 'boton boton-secundario'
                                }
                                data-cy={`btn-ausente-${fila.estudianteId}`}
                                data-testid={`btn-ausente-${fila.estudianteId}`}
                                aria-checked={actual === 'AUSENTE'}
                                role="radio"
                                onClick={() => cambiarEstado(fila.estudianteId, 'AUSENTE')}
                                style={{
                                  padding: '4px 10px',
                                  fontSize: 12,
                                  backgroundColor: actual === 'AUSENTE' ? '#991b1b' : undefined,
                                  borderColor: actual === 'AUSENTE' ? '#991b1b' : undefined,
                                }}
                              >
                                Ausente (A)
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Barra de acción inferior */}
              <div
                className="tarjeta"
                style={{
                  padding: '16px 20px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: 12,
                }}
              >
                <div
                  data-cy="resumen-marcados"
                  data-testid="resumen-marcados"
                  style={{ fontSize: 13, color: 'var(--texto-2)' }}
                >
                  Marcados: <strong>{conteoClase.presentes}</strong> presentes ·{' '}
                  <strong>{conteoClase.licencias}</strong> licencias ·{' '}
                  <strong>{conteoClase.ausentes}</strong> ausentes
                  {pendientesMarcado > 0 && (
                    <span style={{ color: '#b91c1c', marginLeft: 8, fontWeight: 600 }}>
                      ({pendientesMarcado} pendientes de marcado)
                    </span>
                  )}
                </div>
                <button
                  type="submit"
                  className="boton boton-primario"
                  data-cy="btn-guardar-asistencia"
                  disabled={guardando || pendientesMarcado > 0 || esFutura}
                >
                  {guardando ? 'Guardando asistencia…' : 'Guardar Asistencia de la Fecha'}
                </button>
              </div>
            </form>
          )}
        </>
      )}

      {/* PESTAÑA 2: RESUMEN ACUMULADO Y PORCENTAJES (US-19 Criterio 2) */}
      {tabActiva === 'porcentajes' && (
        <section aria-label="Porcentajes acumulados de asistencia">
          <div
            className="tarjeta"
            style={{
              padding: '16px 20px',
              marginBottom: 20,
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
            }}
          >
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ fontWeight: 600, fontSize: 14 }}>Filtrar período:</span>
              <label style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
                Desde:
                <input
                  type="date"
                  data-cy="filtro-desde"
                  className="campo-input"
                  style={{ width: 'auto', padding: '4px 8px' }}
                  value={filtroDesde}
                  onChange={(e) => setFiltroDesde(e.target.value)}
                />
              </label>
              <label style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
                Hasta:
                <input
                  type="date"
                  data-cy="filtro-hasta"
                  className="campo-input"
                  style={{ width: 'auto', padding: '4px 8px' }}
                  value={filtroHasta}
                  onChange={(e) => setFiltroHasta(e.target.value)}
                />
              </label>
              <button
                type="button"
                className="boton boton-secundario"
                data-cy="btn-aplicar-filtro"
                onClick={() => void cargarResumenPorcentajes()}
                style={{ fontSize: 12 }}
              >
                Aplicar filtro
              </button>
            </div>
            <span style={{ fontSize: 12, color: 'var(--texto-2)' }}>
              Fórmula ministerial D5: (Presentes + Licencias) / Clases × 100
            </span>
          </div>

          {cargandoPorcentajes && (
            <Cargando texto="Calculando porcentajes de asistencia…" filas={6} alto={40} />
          )}

          {!cargandoPorcentajes && (!porcentajes || porcentajes.length === 0) && (
            <Vacio
              icono="personas"
              titulo="No hay registros de asistencia"
              texto="Tome la asistencia de la clase para que el sistema calcule los porcentajes acumulados."
            />
          )}

          {!cargandoPorcentajes && porcentajes && porcentajes.length > 0 && (
            <div className="tabla-marco">
              <table className="tabla" data-cy="tabla-porcentajes-asistencia">
                <thead>
                  <tr>
                    <th className="col-n">N.º</th>
                    <th>Estudiante</th>
                    <th style={{ textAlign: 'center' }}>Presentes</th>
                    <th style={{ textAlign: 'center' }}>Licencias</th>
                    <th style={{ textAlign: 'center' }}>Ausentes</th>
                    <th style={{ textAlign: 'center' }}>Clases dictadas</th>
                    <th style={{ textAlign: 'right' }}>Porcentaje de asistencia (D5)</th>
                    <th style={{ textAlign: 'center' }}>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {porcentajes.map((fila, index) => {
                    const nivel = nivelAsistencia(fila.porcentaje);
                    return (
                      <tr key={fila.estudianteId} data-cy="fila-porcentaje-estudiante">
                        <td className="col-n">{index + 1}</td>
                        <td>
                          <strong>{fila.estudiante}</strong>
                        </td>
                        <td style={{ textAlign: 'center' }}>{fila.presentes}</td>
                        <td style={{ textAlign: 'center' }}>{fila.licencias}</td>
                        <td style={{ textAlign: 'center' }}>{fila.ausentes}</td>
                        <td style={{ textAlign: 'center' }}>{fila.clases}</td>
                        <td style={{ textAlign: 'right', fontWeight: 700, fontSize: 15 }}>
                          {formatoPorcentaje(fila.porcentaje)}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          {nivel === 'optimo' && (
                            <span className="insignia insignia-aprobado">Regular (≥80%)</span>
                          )}
                          {nivel === 'advertencia' && (
                            <span className="insignia insignia-advertencia">Atención (70-79%)</span>
                          )}
                          {nivel === 'riesgo' && (
                            <span className="insignia insignia-error">En riesgo (&lt;70%)</span>
                          )}
                          {nivel === 'sin-datos' && (
                            <span
                              className="insignia"
                              style={{ backgroundColor: '#f1f5f9', color: '#64748b' }}
                            >
                              Sin clases
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
    </>
  );
}
