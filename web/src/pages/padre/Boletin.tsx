import { useState } from 'react';
import { Aviso, Cargando, ErrorCarga, Vacio } from '../../componentes/Estados';
import { Icono } from '../../componentes/Icono';
import {
  descargarBoletinHijoPdfApi,
  listarHijosTutorApi,
  obtenerBoletinHijoApi,
  type BoletinPadreDetalle,
  type HijoTutor,
} from '../../lib/api';
import { descargarBlob } from '../../lib/boletin';
import {
  calcularResumenBoletin,
  determinarAprobacionMateria,
  puedeDescargarBoletin,
} from '../../lib/boletinPadre';
import { useCarga } from '../../lib/useCarga';
import { textoError, useMensaje } from '../../lib/useMensaje';

/**
 * Portal del Padre de Familia para Consulta y Descarga de Boletines (US-11, T-051).
 * Criterio 1: Dado un boletín publicado, el padre lo consulta, lo ve y puede descargarlo en PDF.
 * Criterio 2: Dado un boletín que aún no se publicó, no está disponible para descarga.
 */
export function Boletin() {
  const [hijoIdSeleccionado, setHijoIdSeleccionado] = useState<number | null>(null);
  const [descargandoPdf, setDescargandoPdf] = useState(false);
  const [mensaje, setMensaje] = useMensaje();
  const [errorDescarga, setErrorDescarga] = useState<string | null>(null);

  // Cargar lista de hijos asignados al tutor autenticado
  const { carga: hijosCarga, recargar: recargarHijos } = useCarga(() => listarHijosTutorApi(), []);

  const listaHijos: HijoTutor[] = hijosCarga.estado === 'datos' ? hijosCarga.datos : [];

  // Si no hay hijo seleccionado y la lista tiene elementos, seleccionar el primero
  const hijoActivoId = hijoIdSeleccionado ?? (listaHijos.length > 0 ? listaHijos[0].id : null);
  const hijoActivo = listaHijos.find((h) => h.id === hijoActivoId) ?? listaHijos[0] ?? null;

  // Cargar el detalle del boletín del hijo activo
  const { carga: boletinCarga, recargar: recargarBoletin } = useCarga(async () => {
    if (!hijoActivoId) return null;
    return await obtenerBoletinHijoApi(hijoActivoId);
  }, [hijoActivoId]);

  const boletin: BoletinPadreDetalle | null =
    boletinCarga.estado === 'datos' ? boletinCarga.datos : null;

  // Estadísticas calculadas si hay materias
  const resumen = boletin
    ? calcularResumenBoletin(boletin.materias, boletin.porcentajeAsistencia)
    : null;

  const estaPublicado = puedeDescargarBoletin(boletin);

  async function handleDescargarPdf() {
    if (!hijoActivo || !estaPublicado) return;
    setDescargandoPdf(true);
    setErrorDescarga(null);

    try {
      const blob = await descargarBoletinHijoPdfApi(hijoActivo.id);
      const nombreLimpio = `${hijoActivo.apellidos}_${hijoActivo.nombres}`.replace(/\s+/g, '_');
      const anio = boletin?.estudiante.gestion?.anio ?? hijoActivo.gestion?.anio ?? '';
      descargarBlob(blob, `Boletin_${nombreLimpio}${anio ? `_${anio}` : ''}.pdf`);
      setMensaje('Boletín descargado exitosamente en formato PDF oficial.');
    } catch (err) {
      setErrorDescarga(
        textoError(err, 'No se pudo descargar el boletín en PDF. Intente nuevamente.'),
      );
    } finally {
      setDescargandoPdf(false);
    }
  }

  return (
    <>
      {/* Banner hero institucional para familias */}
      <section className="hero-rol hero-padre" aria-label="Portal de familias">
        <div className="hero-rol-contenido">
          <div className="hero-rol-insignia">
            <Icono nombre="personas" tam={16} />
            <span>Portal de Familias y Tutores · US-11</span>
          </div>
          <h2>Seguimiento Formativo del Estudiante</h2>
          <p>
            Información oportuna sobre el rendimiento escolar, asistencia y notas oficiales
            reguladas por la RM 001/2026 del Ministerio de Educación.
          </p>
        </div>
        <div className="hero-rol-metricas">
          <div className="hero-metrica-tarjeta">
            <span className="hero-metrica-numero">1.er</span>
            <span className="hero-metrica-etiqueta">Trimestre en curso</span>
          </div>
          <div className="hero-metrica-tarjeta">
            <span className="hero-metrica-numero">51</span>
            <span className="hero-metrica-etiqueta">Mínimo de aprobación</span>
          </div>
          <div className="hero-metrica-tarjeta">
            <span className="hero-metrica-numero">PDF</span>
            <span className="hero-metrica-etiqueta">Boletín digital oficial</span>
          </div>
        </div>
      </section>

      <div className="titulo-pagina">
        <div>
          <h1>Boletín de mi hijo</h1>
          <span className="subtitulo">
            Reporte oficial trimestral de calificaciones y asistencia
          </span>
        </div>
      </div>

      {mensaje && (
        <Aviso tipo="exito" cy="mensaje-exito">
          {mensaje}
        </Aviso>
      )}
      {errorDescarga && <Aviso tipo="error">{errorDescarga}</Aviso>}

      {/* Selector de Hijo si el padre tiene varios estudiantes vinculados */}
      {listaHijos.length > 1 && (
        <div className="filtros" style={{ margin: '16px 0 24px' }}>
          <label className="campo" style={{ maxWidth: 420 }}>
            Estudiante (Hijo / Tutelado)
            <select
              data-cy="select-hijo"
              value={hijoActivoId ?? ''}
              onChange={(e) => setHijoIdSeleccionado(Number(e.target.value))}
            >
              {listaHijos.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.apellidos}, {h.nombres} — {h.curso?.nombre} (RUDE: {h.codigoRude})
                </option>
              ))}
            </select>
          </label>
        </div>
      )}

      {/* Manejo de estados de carga de los hijos */}
      {hijosCarga.estado === 'cargando' && <Cargando texto="Cargando información familiar…" />}

      {hijosCarga.estado === 'error' && (
        <ErrorCarga
          mensaje={`No se pudo cargar la información familiar. ${hijosCarga.mensaje}`}
          reintentar={recargarHijos}
        />
      )}

      {/* Si no tiene hijos vinculados formalmente (RNF-04) */}
      {hijosCarga.estado === 'datos' && listaHijos.length === 0 && (
        <div
          className="tarjeta panel"
          data-cy="aviso-boletin-proximamente"
          style={{ maxWidth: 640, padding: 28, margin: '20px 0' }}
        >
          <span
            style={{
              width: 48,
              height: 48,
              borderRadius: 12,
              background: '#fdf3dc',
              color: '#8a5a00',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icono nombre="reloj" tam={24} />
          </span>
          <h2 style={{ fontSize: 19, margin: '16px 0 8px' }}>
            El boletín todavía no está disponible
          </h2>
          <p className="ayuda" style={{ fontSize: 15, margin: 0 }}>
            No tiene estudiantes vinculados a su cuenta o las calificaciones todavía no han sido
            publicadas oficialmente por la unidad educativa. Para registrar formalmente la
            vinculación con sus hijos (RNF-04), comuníquese con la secretaría del colegio.
          </p>
        </div>
      )}

      {/* Si tiene hijo pero estamos cargando el boletín */}
      {hijoActivo && boletinCarga.estado === 'cargando' && (
        <Cargando texto={`Cargando boletín de ${hijoActivo.nombres}…`} />
      )}

      {hijoActivo && boletinCarga.estado === 'error' && (
        <ErrorCarga
          mensaje={`No se pudo obtener el boletín. ${boletinCarga.mensaje}`}
          reintentar={recargarBoletin}
        />
      )}

      {/* CASO 1: BOLETÍN NO PUBLICADO O EN ELABORACIÓN (US-11, CA 2) */}
      {hijoActivo && boletinCarga.estado === 'datos' && !estaPublicado && (
        <div
          className="tarjeta panel"
          data-cy="aviso-boletin-proximamente"
          style={{ maxWidth: 640, padding: 28, margin: '20px 0' }}
        >
          <span
            style={{
              width: 48,
              height: 48,
              borderRadius: 12,
              background: '#fdf3dc',
              color: '#8a5a00',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icono nombre="reloj" tam={24} />
          </span>
          <h2 style={{ fontSize: 19, margin: '16px 0 8px' }}>
            El boletín todavía no está disponible
          </h2>
          <p className="ayuda" style={{ fontSize: 15, margin: 0 }}>
            {boletin?.mensajeEstado ??
              `El boletín de calificaciones de ${hijoActivo.nombres} se encuentra en etapa de registro o elaboración por el cuerpo docente. Estará habilitado oficialmente una vez que la dirección y los profesores completen el cierre del periodo.`}
          </p>
          <div
            style={{
              marginTop: 16,
              padding: '10px 14px',
              borderRadius: 6,
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              fontSize: '0.88rem',
              color: '#64748b',
            }}
          >
            ℹ️ <strong>Criterio oficial:</strong> Las notas trimestrales se hacen públicas para
            tutores únicamente cuando todos los promedios han sido consolidados y validados por la
            Unidad Educativa.
          </div>
        </div>
      )}

      {/* CASO 2: BOLETÍN PUBLICADO OFICIALMENTE (US-11, CA 1) */}
      {hijoActivo && boletinCarga.estado === 'datos' && estaPublicado && boletin && (
        <div className="contenedor-boletin-padre" data-cy="boletin-publicado-detalle">
          {/* Tarjeta de Resumen y Botón de Descarga Oficial */}
          <div
            className="tarjeta"
            style={{
              background: '#f0fdf4',
              border: '1px solid #bbf7d0',
              padding: 24,
              borderRadius: 12,
              margin: '20px 0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 16,
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                <span
                  className="insignia"
                  style={{ background: '#16a34a', color: '#ffffff', fontWeight: 600 }}
                >
                  Boletín Oficial Publicado
                </span>
                <span className="insignia insignia-curso">{hijoActivo.curso?.nombre}</span>
              </div>
              <h2
                style={{ margin: '4px 0', fontSize: '1.4rem', color: '#166534', fontWeight: 700 }}
              >
                {hijoActivo.apellidos}, {hijoActivo.nombres}
              </h2>
              <div style={{ fontSize: '0.95rem', color: '#15803d', marginTop: 4 }}>
                <strong>Estado:</strong>{' '}
                <span
                  style={{
                    fontWeight: 700,
                    color:
                      resumen?.estadoGeneral === 'PROMOVIDO'
                        ? '#16a34a'
                        : resumen?.estadoGeneral === 'RETENIDO'
                          ? '#dc2626'
                          : '#0284c7',
                  }}
                >
                  {resumen?.estadoGeneral ?? 'EN CURSO'}
                </span>
                {resumen?.promedioGeneral !== null && (
                  <span>
                    {' '}
                    · Promedio General: <strong>{resumen?.promedioGeneral} pts</strong>
                  </span>
                )}
                {boletin.porcentajeAsistencia !== null && (
                  <span>
                    {' '}
                    · Asistencia: <strong>{boletin.porcentajeAsistencia}%</strong>
                  </span>
                )}
              </div>
            </div>

            <button
              type="button"
              className="boton boton-primario"
              data-cy="btn-descargar-boletin-padre"
              onClick={() => void handleDescargarPdf()}
              disabled={descargandoPdf}
              style={{
                fontSize: '1rem',
                padding: '12px 20px',
                background: '#15803d',
                borderColor: '#15803d',
              }}
            >
              <Icono nombre="documento" tam={20} />
              {descargandoPdf ? 'Generando PDF…' : 'Descargar Boletín Oficial (PDF)'}
            </button>
          </div>

          {/* Tabla Desglosada de Asignaturas */}
          <section aria-labelledby="titulo-calificaciones">
            <h2 id="titulo-calificaciones" style={{ fontSize: '1.25rem', margin: '20px 0 12px' }}>
              Calificaciones por Asignatura (Gestión 2026)
            </h2>

            {boletin.materias.length === 0 ? (
              <Vacio
                titulo="Sin materias registradas"
                texto="El curso no tiene materias asignadas todavía."
              />
            ) : (
              <div className="tabla-marco">
                <table className="tabla" data-cy="tabla-boletin-padre">
                  <thead>
                    <tr>
                      <th scope="col" style={{ width: 40, textAlign: 'center' }}>
                        N.º
                      </th>
                      <th scope="col">Asignatura / Campo de Saberes</th>
                      <th scope="col" style={{ textAlign: 'center' }}>
                        1.er Trimestre
                      </th>
                      <th scope="col" style={{ textAlign: 'center' }}>
                        2.º Trimestre
                      </th>
                      <th scope="col" style={{ textAlign: 'center' }}>
                        3.er Trimestre
                      </th>
                      <th scope="col" style={{ textAlign: 'center' }}>
                        Nota Final
                      </th>
                      <th scope="col" style={{ textAlign: 'center' }}>
                        Estado
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {boletin.materias.map((m, idx) => {
                      const estado = m.estado ?? determinarAprobacionMateria(m.promedioFinal);
                      const esAprobado = estado === 'APROBADO';
                      const esReprobado = estado === 'REPROBADO';

                      return (
                        <tr key={m.materiaId}>
                          <td style={{ textAlign: 'center', color: '#64748b' }}>{idx + 1}</td>
                          <td>
                            <strong>{m.nombre}</strong>
                            {m.profesorNombre && (
                              <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
                                Prof. {m.profesorNombre}
                              </div>
                            )}
                          </td>
                          <td style={{ textAlign: 'center', fontVariantNumeric: 'tabular-nums' }}>
                            {m.notaT1 !== null && m.notaT1 !== undefined ? m.notaT1 : '—'}
                          </td>
                          <td style={{ textAlign: 'center', fontVariantNumeric: 'tabular-nums' }}>
                            {m.notaT2 !== null && m.notaT2 !== undefined ? m.notaT2 : '—'}
                          </td>
                          <td style={{ textAlign: 'center', fontVariantNumeric: 'tabular-nums' }}>
                            {m.notaT3 !== null && m.notaT3 !== undefined ? m.notaT3 : '—'}
                          </td>
                          <td
                            style={{
                              textAlign: 'center',
                              fontWeight: 700,
                              fontVariantNumeric: 'tabular-nums',
                            }}
                          >
                            {m.promedioFinal !== null && m.promedioFinal !== undefined ? (
                              <span
                                style={{
                                  color: esReprobado ? '#dc2626' : 'var(--texto, #0f172a)',
                                }}
                              >
                                {m.promedioFinal}
                              </span>
                            ) : (
                              '—'
                            )}
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            {esAprobado && (
                              <span
                                className="insignia"
                                style={{ background: '#dcfce7', color: '#15803d', fontWeight: 600 }}
                              >
                                Aprobado
                              </span>
                            )}
                            {esReprobado && (
                              <span
                                className="insignia"
                                style={{ background: '#fee2e2', color: '#b91c1c', fontWeight: 600 }}
                              >
                                Reprobado
                              </span>
                            )}
                            {estado === 'EN_CURSO' && (
                              <span className="insignia insignia-plomo">En curso</span>
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

          <footer
            style={{
              marginTop: 24,
              padding: 16,
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: 8,
              fontSize: '0.88rem',
              color: '#64748b',
              lineHeight: 1.5,
            }}
          >
            🏛️ <strong>Validez Legal:</strong> Este boletín refleja el cómputo oficial de
            dimensiones conforme a la Resolución Ministerial 001/2026. La versión digital
            descargable cuenta con código SIE y espacio para firmas de la Dirección y Secretaría de
            la Unidad Educativa.
          </footer>
        </div>
      )}
    </>
  );
}
