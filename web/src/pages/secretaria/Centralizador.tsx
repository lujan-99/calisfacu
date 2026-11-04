import { useMemo, useState } from 'react';
import { Cargando, ErrorCarga, Vacio } from '../../componentes/Estados';
import { Icono } from '../../componentes/Icono';
import {
  listarCursos,
  listarGestiones,
  listarTrimestres,
  type Curso,
  type Trimestre,
} from '../../lib/api';
import {
  descargarCentralizadorCsv,
  descargarCentralizadorExcel,
  descargarCentralizadorPdf,
  ejecutarCentralizacionCurso,
  filtrarFilasCentralizador,
  obtenerCentralizadorCurso,
  type CentralizadorCursoData,
} from '../../lib/centralizador';
import { nombreTrimestre } from '../../lib/formato';
import { useCarga } from '../../lib/useCarga';
import { trimestrePorDefecto } from '../profesor/MateriaActividades';

/**
 * Pantalla de Centralización de Notas para Secretaría (US-09).
 * Criterio 1: Planilla consolidada del curso con todas sus materias al cierre de trimestre.
 * Criterio 2: Exportación oficial a PDF y Excel con firmas reglamentarias.
 * Criterio 3: Bloqueo de centralización y listado detallado si existen materias pendientes.
 */
export function Centralizador() {
  const [cursoIdSeleccionado, setCursoIdSeleccionado] = useState<number | null>(null);
  const [trimestreIdSeleccionado, setTrimestreIdSeleccionado] = useState<number | null>(null);
  const [filtroEstado, setFiltroEstado] = useState<'TODOS' | 'APROBADO' | 'REPROBADO'>('TODOS');
  const [busqueda, setBusqueda] = useState<string>('');
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);
  const [errorAccion, setErrorAccion] = useState<string | null>(null);
  const [procesando, setProcesando] = useState<boolean>(false);

  // Carga base de gestiones, cursos y trimestres
  const { carga: cargaBase, recargar: recargarBase } = useCarga(async () => {
    const gestiones = await listarGestiones();
    const gestionActiva = gestiones[0] ?? null;
    if (!gestionActiva) {
      return { gestionActiva: null, cursos: [], trimestres: [] };
    }
    const [cursos, trimestres] = await Promise.all([
      listarCursos({ gestionId: gestionActiva.id }),
      listarTrimestres(gestionActiva.id),
    ]);
    return { gestionActiva, cursos, trimestres };
  }, []);

  const baseDatos = cargaBase.estado === 'datos' ? cargaBase.datos : null;
  const cursos = baseDatos?.cursos ?? [];
  const trimestres = baseDatos?.trimestres ?? [];
  const gestionActiva = baseDatos?.gestionActiva ?? null;

  // Selección por defecto del curso y trimestre
  const cursoActivoId = cursoIdSeleccionado ?? cursos[0]?.id ?? null;
  const trimestreActivoId =
    trimestreIdSeleccionado ?? trimestrePorDefecto(trimestres)?.id ?? trimestres[0]?.id ?? null;

  // Carga de la planilla centralizadora reactiva a la selección
  const { carga: cargaCentralizador, recargar: recargarCentralizador } = useCarga(async () => {
    if (!cursoActivoId || !trimestreActivoId) {
      return null;
    }
    return await obtenerCentralizadorCurso(cursoActivoId, trimestreActivoId);
  }, [cursoActivoId, trimestreActivoId]);

  const datos: CentralizadorCursoData | null =
    cargaCentralizador.estado === 'datos' ? cargaCentralizador.datos : null;

  const filasFiltradas = useMemo(() => {
    if (!datos) return [];
    return filtrarFilasCentralizador(datos.filas, busqueda, filtroEstado);
  }, [datos, busqueda, filtroEstado]);

  const handleEjecutarCentralizacion = async () => {
    if (!cursoActivoId || !trimestreActivoId || !datos) return;
    setErrorAccion(null);
    setMensajeExito(null);

    if (!datos.todasEntregadas) {
      setErrorAccion(
        `No se puede centralizar el trimestre: existen ${datos.materiasPendientes.length} materia(s) pendientes de entrega.`,
      );
      return;
    }

    try {
      setProcesando(true);
      const resultado = await ejecutarCentralizacionCurso(cursoActivoId, trimestreActivoId, false);
      setMensajeExito(resultado.mensaje);
      recargarCentralizador();
    } catch (err) {
      setErrorAccion(err instanceof Error ? err.message : 'Error al ejecutar centralización.');
    } finally {
      setProcesando(false);
    }
  };

  const handleExportarPdf = async () => {
    if (!cursoActivoId || !trimestreActivoId) return;
    try {
      setProcesando(true);
      await descargarCentralizadorPdf(cursoActivoId, trimestreActivoId);
    } catch (err) {
      setErrorAccion(err instanceof Error ? err.message : 'Error al exportar PDF.');
    } finally {
      setProcesando(false);
    }
  };

  const handleExportarExcel = async () => {
    if (!cursoActivoId || !trimestreActivoId || !datos) return;
    try {
      setProcesando(true);
      await descargarCentralizadorExcel(cursoActivoId, trimestreActivoId);
    } catch (err) {
      setErrorAccion(err instanceof Error ? err.message : 'Error al exportar Excel.');
    } finally {
      setProcesando(false);
    }
  };

  const handleExportarCsvLocal = () => {
    if (!datos) return;
    descargarCentralizadorCsv(datos);
  };

  if (cargaBase.estado === 'cargando') {
    return <Cargando texto="Cargando configuración institucional…" filas={4} alto={48} />;
  }

  if (cargaBase.estado === 'error') {
    return (
      <ErrorCarga
        mensaje="No se pudo cargar la información de cursos y trimestres."
        reintentar={recargarBase}
      />
    );
  }

  return (
    <div className="espacio-y" data-cy="pagina-centralizador">
      <header className="cabecera">
        <div>
          <h1>Centralizador Oficial de Notas</h1>
          <p className="texto-secundario">
            Consolidación y centralización automática de calificaciones trimestrales por curso
            (US-09 · RM 001/2026) · Gestión {gestionActiva?.anio ?? 2026}.
          </p>
        </div>
      </header>

      {/* Selectores de Curso y Trimestre */}
      <section className="tarjeta espacio-y">
        <div className="fila-filtros">
          <div className="campo">
            <label htmlFor="selector-curso">Curso / Paralelo</label>
            <select
              id="selector-curso"
              data-cy="selector-curso"
              value={cursoActivoId ?? ''}
              onChange={(e) => setCursoIdSeleccionado(Number(e.target.value))}
            >
              {cursos.map((c: Curso) => (
                <option key={c.id} value={c.id}>
                  {c.nombre} ({c.nivel})
                </option>
              ))}
            </select>
          </div>

          <div className="campo">
            <label htmlFor="selector-trimestre">Trimestre</label>
            <select
              id="selector-trimestre"
              data-cy="selector-trimestre"
              value={trimestreActivoId ?? ''}
              onChange={(e) => setTrimestreIdSeleccionado(Number(e.target.value))}
            >
              {trimestres.map((t: Trimestre) => (
                <option key={t.id} value={t.id}>
                  {nombreTrimestre(t.numero)} {t.cerrado ? '(Cerrado)' : '(En curso)'}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {/* Avisos y Mensajes */}
      {mensajeExito && (
        <div className="alerta alerta-exito" role="status" data-cy="alerta-exito">
          <Icono nombre="check" />
          <div>{mensajeExito}</div>
        </div>
      )}

      {errorAccion && (
        <div className="alerta alerta-error" role="alert" data-cy="alerta-error">
          <Icono nombre="alerta" />
          <div>{errorAccion}</div>
        </div>
      )}

      {/* Estado de carga del centralizador */}
      {cargaCentralizador.estado === 'cargando' && (
        <Cargando
          texto="Consolidando calificaciones de todas las materias del curso…"
          filas={6}
          alto={48}
        />
      )}

      {cargaCentralizador.estado === 'error' && (
        <ErrorCarga
          mensaje="No se pudo consolidar la planilla del curso seleccionado."
          reintentar={recargarCentralizador}
        />
      )}

      {datos && (
        <>
          {/* Banner de Estado de Entregas (Criterio 1 y Criterio 3) */}
          {!datos.todasEntregadas ? (
            <div className="alerta alerta-advertencia" data-cy="alerta-materias-pendientes">
              <Icono nombre="alerta" />
              <div className="espacio-y-pequeno">
                <strong>
                  Centralización Bloqueada: {datos.materiasPendientes.length} materia(s) pendientes
                  de entrega
                </strong>
                <p>
                  Según la normativa reglamentaria (US-09 CA 3 y US-10), no se puede centralizar ni
                  cerrar el trimestre hasta que todos los docentes hayan entregado sus planillas.
                </p>
                <ul className="lista-pendientes" data-cy="lista-pendientes">
                  {datos.materiasPendientes.map((m) => (
                    <li key={m.materiaId}>
                      <strong>{m.materia}</strong> — Prof. {m.profesor}{' '}
                      {m.notasFaltantes !== undefined && `(${m.notasFaltantes} notas faltantes)`}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ) : (
            <div className="alerta alerta-exito" data-cy="alerta-todas-entregadas">
              <Icono nombre="check" />
              <div>
                <strong>Todas las materias han sido entregadas</strong>
                <p>
                  El curso cuenta con el 100 % de notas entregadas para este trimestre. Puede
                  ejecutar la centralización oficial o exportar la planilla consolidada.
                </p>
              </div>
            </div>
          )}

          {/* Barra de Acciones y Métricas Resumen */}
          <div className="hero-metricas">
            <div className="hero-metrica-tarjeta">
              <span className="hero-metrica-numero">{datos.resumen.totalEstudiantes}</span>
              <span className="hero-metrica-etiqueta">Total Estudiantes</span>
            </div>
            <div className="hero-metrica-tarjeta">
              <span className="hero-metrica-numero" style={{ color: '#16a34a' }}>
                {datos.resumen.aprobados}
              </span>
              <span className="hero-metrica-etiqueta">Aprobados (≥ 51)</span>
            </div>
            <div className="hero-metrica-tarjeta">
              <span className="hero-metrica-numero" style={{ color: '#dc2626' }}>
                {datos.resumen.reprobados}
              </span>
              <span className="hero-metrica-etiqueta">Reprobados (&lt; 51)</span>
            </div>
            <div className="hero-metrica-tarjeta">
              <span className="hero-metrica-numero">
                {datos.resumen.promedioGeneral !== null
                  ? `${datos.resumen.promedioGeneral} pts`
                  : '—'}
              </span>
              <span className="hero-metrica-etiqueta">Promedio General</span>
            </div>
            <div className="hero-metrica-tarjeta">
              <span className="hero-metrica-numero">
                {datos.resumen.tasaAprobacion !== null ? `${datos.resumen.tasaAprobacion} %` : '—'}
              </span>
              <span className="hero-metrica-etiqueta">Tasa de Aprobación</span>
            </div>
          </div>

          {/* Botonera de Centralización y Exportación Oficial (CA 1 y CA 2) */}
          <div className="tarjeta fila-acciones-centralizador">
            <div className="botones-principales">
              <button
                type="button"
                className="boton boton-primario"
                data-cy="boton-ejecutar-centralizacion"
                disabled={!datos.todasEntregadas || datos.centralizado || procesando}
                onClick={() => {
                  void handleEjecutarCentralizacion();
                }}
              >
                <Icono nombre="tabla" />
                <span>
                  {datos.centralizado
                    ? `Centralizado el ${new Date(datos.fechaCentralizacion ?? '').toLocaleDateString('es-BO')}`
                    : 'Ejecutar Centralización Oficial'}
                </span>
              </button>

              <button
                type="button"
                className="boton boton-secundario"
                data-cy="boton-exportar-pdf"
                disabled={!datos.centralizado || procesando}
                title={datos.centralizado ? undefined : 'Primero ejecute la centralización'}
                onClick={() => {
                  void handleExportarPdf();
                }}
              >
                <Icono nombre="documento" />
                <span>Exportar Planilla PDF</span>
              </button>

              <button
                type="button"
                className="boton boton-secundario"
                data-cy="boton-exportar-excel"
                disabled={!datos.centralizado || procesando}
                title={datos.centralizado ? undefined : 'Primero ejecute la centralización'}
                onClick={() => {
                  void handleExportarExcel();
                }}
              >
                <Icono nombre="portapapeles" />
                <span>Exportar Excel (.xlsx)</span>
              </button>

              <button
                type="button"
                className="boton boton-plano"
                data-cy="boton-exportar-csv"
                onClick={handleExportarCsvLocal}
                title="Descargar copia CSV local para compatibilidad"
              >
                <span>Descargar CSV</span>
              </button>
            </div>
          </div>

          {/* Filtros de la Tabla Consolidada */}
          <div className="tarjeta espacio-y">
            <div className="fila-filtros">
              <div className="campo">
                <label htmlFor="busqueda-estudiante">Buscar estudiante o RUDE</label>
                <input
                  id="busqueda-estudiante"
                  data-cy="input-busqueda-centralizador"
                  type="text"
                  placeholder="Ej: Mamani o 80980001"
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                />
              </div>

              <div className="campo">
                <label htmlFor="filtro-observacion">Estado Académico</label>
                <select
                  id="filtro-observacion"
                  data-cy="filtro-observacion"
                  value={filtroEstado}
                  onChange={(e) =>
                    setFiltroEstado(e.target.value as 'TODOS' | 'APROBADO' | 'REPROBADO')
                  }
                >
                  <option value="TODOS">Todos los estudiantes</option>
                  <option value="APROBADO">Solo Aprobados (≥ 51)</option>
                  <option value="REPROBADO">Solo Reprobados (&lt; 51)</option>
                </select>
              </div>
            </div>

            {/* Planilla Consolidada Oficial */}
            <div
              className="tabla-contenedor"
              tabIndex={0}
              role="region"
              aria-label="Planilla centralizadora"
            >
              <table className="tabla tabla-compacta" data-cy="tabla-centralizador">
                <thead>
                  <tr>
                    <th scope="col" style={{ width: '40px' }}>
                      N.º
                    </th>
                    <th scope="col">Código RUDE</th>
                    <th scope="col">CI</th>
                    <th scope="col" style={{ minWidth: '180px' }}>
                      Estudiante
                    </th>
                    {datos.materias.map((m) => (
                      <th
                        key={m.id}
                        scope="col"
                        title={m.profesor ? `Prof: ${m.profesor}` : m.nombre}
                        style={{ textAlign: 'center' }}
                      >
                        {m.nombre}
                      </th>
                    ))}
                    <th scope="col" style={{ textAlign: 'center', minWidth: '90px' }}>
                      Promedio
                    </th>
                    <th scope="col" style={{ textAlign: 'center' }}>
                      Observaciones
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filasFiltradas.length === 0 ? (
                    <tr>
                      <td
                        colSpan={datos.materias.length + 6}
                        style={{ textAlign: 'center', padding: '2rem' }}
                      >
                        <Vacio
                          titulo="Sin coincidencias"
                          texto="No se encontraron estudiantes que coincidan con los filtros aplicados."
                        />
                      </td>
                    </tr>
                  ) : (
                    filasFiltradas.map((f) => (
                      <tr key={f.estudianteId}>
                        <td>{f.numero}</td>
                        <td>
                          <code>{f.codigoRude}</code>
                        </td>
                        <td>{f.ci ?? '—'}</td>
                        <td>
                          <strong>{f.estudiante}</strong>
                        </td>
                        {datos.materias.map((m) => {
                          const nota = f.notas[m.id];
                          const notaBaja = nota !== null && nota < 51;
                          return (
                            <td
                              key={m.id}
                              style={{
                                textAlign: 'center',
                                color: notaBaja ? 'var(--color-peligro)' : undefined,
                                fontWeight: notaBaja ? 600 : undefined,
                              }}
                            >
                              {nota !== null ? nota : '—'}
                            </td>
                          );
                        })}
                        <td
                          style={{
                            textAlign: 'center',
                            fontWeight: 700,
                            color:
                              f.promedioTrimestral !== null && f.promedioTrimestral < 51
                                ? 'var(--color-peligro)'
                                : undefined,
                          }}
                        >
                          {f.promedioTrimestral !== null ? f.promedioTrimestral : '—'}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <span
                            className={`insignia ${
                              f.observacion === 'APROBADO'
                                ? 'insignia-exito'
                                : f.observacion === 'REPROBADO'
                                  ? 'insignia-peligro'
                                  : 'insignia-aviso'
                            }`}
                          >
                            {f.observacion}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pie Oficial con Información Institucional y Espacio para Firmas (CA 2) */}
            <div className="pie-centralizador-oficial" data-cy="pie-centralizador-oficial">
              <div className="espacio-firmas">
                <div className="linea-firma">
                  <div className="trazo-firma" />
                  <span>Firma del Director(a)</span>
                  <small>Sello Institucional</small>
                </div>
                <div className="linea-firma">
                  <div className="trazo-firma" />
                  <span>Firma del Maestro(a)</span>
                  <small>Asesor(a) de Curso</small>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
