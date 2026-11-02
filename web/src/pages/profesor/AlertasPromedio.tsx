import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Dialogo } from '../../componentes/Dialogo';
import { Cargando, ErrorCarga, Vacio } from '../../componentes/Estados';
import { Icono } from '../../componentes/Icono';
import { misMaterias, type Materia } from '../../lib/api';
import {
  calcularResumenAlertas,
  filtrarAlertasPromedio,
  listarAlertasProfesorApi,
  marcarAlertaAtendidaApi,
  marcarAlertaLeidaApi,
  type AlertaPromedioBajo,
  type FiltroEstadoAlerta,
} from '../../lib/alertas';
import { useCarga } from '../../lib/useCarga';

/**
 * Pantalla de Alertas Automáticas de Promedio Bajo para Profesores (US-08).
 * Criterio 1: Aviso en el sistema y notificación por correo cuando el promedio cae por debajo de 51.
 * Criterio 2: Regla de histéresis: no se repite la alerta si continúa < 51 hasta superar el mínimo.
 * Decisión D7: Facilita la comunicación temprana con el tutor.
 */
export function AlertasPromedio() {
  const [filtroEstado, setFiltroEstado] = useState<FiltroEstadoAlerta>('TODAS');
  const [materiaIdSeleccionada, setMateriaIdSeleccionada] = useState<number | null>(null);
  const [busqueda, setBusqueda] = useState<string>('');
  const [alertaParaAtender, setAlertaParaAtender] = useState<AlertaPromedioBajo | null>(null);
  const [notaAtencion, setNotaAtencion] = useState<string>('');
  const [guardandoAtencion, setGuardandoAtencion] = useState<boolean>(false);
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);

  // Carga paralela de materias del profesor y alertas automáticas
  const { carga, recargar } = useCarga(async () => {
    const [materias, alertas] = await Promise.all([
      misMaterias(),
      listarAlertasProfesorApi(materiaIdSeleccionada ?? undefined),
    ]);
    return { materias, alertas };
  }, [materiaIdSeleccionada]);

  const datos = carga.estado === 'datos' ? carga.datos : null;
  const materias = datos?.materias ?? [];
  const alertas = datos?.alertas ?? [];

  const alertasFiltradas = useMemo(() => {
    return filtrarAlertasPromedio(alertas, filtroEstado, materiaIdSeleccionada, busqueda);
  }, [alertas, filtroEstado, materiaIdSeleccionada, busqueda]);

  const resumen = useMemo(() => calcularResumenAlertas(alertas), [alertas]);

  const handleMarcarLeida = async (alerta: AlertaPromedioBajo) => {
    if (alerta.leida) return;
    await marcarAlertaLeidaApi(alerta.id);
    recargar();
  };

  const abrirModalAtencion = (alerta: AlertaPromedioBajo) => {
    setAlertaParaAtender(alerta);
    setNotaAtencion('');
  };

  const handleGuardarAtencion = async () => {
    if (!alertaParaAtender) return;
    try {
      setGuardandoAtencion(true);
      const res = await marcarAlertaAtendidaApi(
        alertaParaAtender.id,
        notaAtencion.trim() || 'Contacto realizado con el tutor.',
      );
      setMensajeExito(res.mensaje);
      setAlertaParaAtender(null);
      recargar();
    } finally {
      setGuardandoAtencion(false);
    }
  };

  if (carga.estado === 'cargando') {
    return <Cargando texto="Cargando alertas de promedio y tutores…" filas={5} alto={56} />;
  }

  if (carga.estado === 'error') {
    return (
      <ErrorCarga
        mensaje="No se pudieron cargar las alertas de promedio bajo."
        reintentar={recargar}
      />
    );
  }

  return (
    <div className="espacio-y" data-cy="pagina-alertas-promedio">
      <header className="cabecera">
        <div>
          <h1>Alertas de Promedio Bajo</h1>
          <p className="texto-secundario">
            Notificaciones tempranas cuando el promedio de un estudiante cae por debajo de 51 pts
            (US-08 · Decisión D7).
          </p>
        </div>
      </header>

      {/* Resumen Cuantitativo de Alertas */}
      <section className="hero-metricas" aria-label="Métricas de alertas">
        <div className="hero-metrica-tarjeta">
          <span className="hero-metrica-numero" style={{ color: '#dc2626' }}>
            {resumen.alertasActivas}
          </span>
          <span className="hero-metrica-etiqueta">Alertas Activas (&lt; 51)</span>
        </div>
        <div className="hero-metrica-tarjeta">
          <span className="hero-metrica-numero" style={{ color: '#16a34a' }}>
            {resumen.alertasAtendidas}
          </span>
          <span className="hero-metrica-etiqueta">Alertas Atendidas</span>
        </div>
        <div className="hero-metrica-tarjeta">
          <span className="hero-metrica-numero" style={{ color: '#ca8a04' }}>
            {resumen.noLeidas}
          </span>
          <span className="hero-metrica-etiqueta">Sin Leer</span>
        </div>
        <div className="hero-metrica-tarjeta">
          <span className="hero-metrica-numero">
            {resumen.promedioCriticoMinimo !== null ? `${resumen.promedioCriticoMinimo} pts` : '—'}
          </span>
          <span className="hero-metrica-etiqueta">Promedio Más Crítico</span>
        </div>
        <div className="hero-metrica-tarjeta">
          <span className="hero-metrica-numero">{resumen.correosEnviados}</span>
          <span className="hero-metrica-etiqueta">Correos Enviados (&lt; 5 min)</span>
        </div>
      </section>

      {/* Mensaje de Éxito */}
      {mensajeExito && (
        <div className="alerta alerta-exito" role="status" data-cy="alerta-exito">
          <Icono nombre="check" />
          <div>{mensajeExito}</div>
        </div>
      )}

      {/* Tarjeta de Filtros */}
      <section className="tarjeta espacio-y">
        <div className="fila-filtros">
          <div className="campo">
            <label htmlFor="filtro-materia">Materia Asignada</label>
            <select
              id="filtro-materia"
              data-cy="filtro-materia-alertas"
              value={materiaIdSeleccionada ?? ''}
              onChange={(e) =>
                setMateriaIdSeleccionada(e.target.value === '' ? null : Number(e.target.value))
              }
            >
              <option value="">Todas mis materias</option>
              {materias.map((m: Materia) => (
                <option key={m.id} value={m.id}>
                  {m.nombre} — {m.curso.nombre}
                </option>
              ))}
            </select>
          </div>

          <div className="campo">
            <label htmlFor="filtro-estado-alerta">Estado de Alerta</label>
            <select
              id="filtro-estado-alerta"
              data-cy="filtro-estado-alerta"
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value as FiltroEstadoAlerta)}
            >
              <option value="TODAS">Todas las alertas ({alertas.length})</option>
              <option value="ACTIVAS">Solo Activas ({resumen.alertasActivas})</option>
              <option value="ATENDIDAS">Solo Atendidas ({resumen.alertasAtendidas})</option>
              <option value="NO_LEIDAS">Sin Leer ({resumen.noLeidas})</option>
            </select>
          </div>

          <div className="campo" style={{ flexGrow: 1.5 }}>
            <label htmlFor="busqueda-alerta">Buscar estudiante, RUDE o tutor</label>
            <input
              id="busqueda-alerta"
              data-cy="input-busqueda-alerta"
              type="text"
              placeholder="Ej: Mamani, 80980001 o Elena Ramos"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
          </div>
        </div>
      </section>

      {/* Listado de Alertas */}
      {alertasFiltradas.length === 0 ? (
        <Vacio
          titulo="No hay alertas con los filtros seleccionados"
          texto="Todos los estudiantes evaluados se encuentran por encima del mínimo aprobatorio o no coinciden con la búsqueda."
        />
      ) : (
        <div className="espacio-y" data-cy="lista-alertas-promedio">
          {alertasFiltradas.map((alerta) => {
            const diferencia =
              alerta.promedioAnterior !== null
                ? alerta.promedioNuevo - alerta.promedioAnterior
                : null;

            return (
              <article
                key={alerta.id}
                className={`tarjeta ${!alerta.leida ? 'tarjeta-alerta-no-leida' : ''}`}
                data-cy={`item-alerta-${alerta.id}`}
                style={{
                  borderLeft:
                    alerta.estado === 'ACTIVA'
                      ? '5px solid var(--color-peligro)'
                      : '5px solid var(--color-exito, #16a34a)',
                }}
              >
                <div className="cabecera-tarjeta-alerta">
                  <div>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        flexWrap: 'wrap',
                      }}
                    >
                      <h3 style={{ margin: 0 }}>{alerta.estudianteNombre}</h3>
                      <span className="insignia insignia-neutra">
                        RUDE: <code>{alerta.codigoRude}</code>
                      </span>
                      {alerta.ci && (
                        <span className="insignia insignia-neutra">CI: {alerta.ci}</span>
                      )}
                      {!alerta.leida && (
                        <span className="insignia insignia-aviso" data-cy="badge-no-leida">
                          Nueva
                        </span>
                      )}
                      <span
                        className={`insignia ${
                          alerta.estado === 'ACTIVA' ? 'insignia-peligro' : 'insignia-exito'
                        }`}
                        data-cy={`badge-estado-${alerta.id}`}
                      >
                        {alerta.estado === 'ACTIVA' ? 'Alerta Activa' : 'Atendida'}
                      </span>
                    </div>

                    <p className="texto-secundario" style={{ margin: '4px 0 0' }}>
                      <strong>{alerta.materiaNombre}</strong> · {alerta.cursoNombre} ·{' '}
                      {alerta.trimestreNumero}.º Trimestre
                    </p>
                  </div>

                  <div className="puntaje-alerta-contenedor" style={{ textAlign: 'right' }}>
                    <div
                      style={{
                        fontSize: '24px',
                        fontWeight: 800,
                        color: 'var(--color-peligro)',
                        lineHeight: 1.1,
                      }}
                      data-cy="nota-promedio-nuevo"
                    >
                      {alerta.promedioNuevo} pts
                    </div>
                    <small className="texto-secundario">
                      {alerta.promedioAnterior !== null ? (
                        <>
                          Anterior: {alerta.promedioAnterior} pts{' '}
                          <span style={{ color: 'var(--color-peligro)', fontWeight: 600 }}>
                            ({diferencia} pts)
                          </span>
                        </>
                      ) : (
                        'Promedio inicial < 51 pts'
                      )}
                    </small>
                  </div>
                </div>

                <hr style={{ margin: '14px 0', borderColor: 'var(--borde)' }} />

                {/* Información del Tutor / Contacto Rápido (Decisión D7) */}
                <div className="seccion-tutor-contacto">
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      marginBottom: '6px',
                    }}
                  >
                    <Icono nombre="usuario" tam={16} />
                    <strong>Contacto con el Tutor Legal:</strong>
                  </div>

                  {alerta.tutor ? (
                    <div className="datos-tutor-fila" data-cy={`contacto-tutor-${alerta.id}`}>
                      <span>
                        <strong>{alerta.tutor.nombre}</strong> ({alerta.tutor.parentesco})
                      </span>
                      {alerta.tutor.telefono && (
                        <span>
                          📞 <a href={`tel:${alerta.tutor.telefono}`}>{alerta.tutor.telefono}</a>
                        </span>
                      )}
                      {alerta.tutor.email && (
                        <span>
                          ✉️ <a href={`mailto:${alerta.tutor.email}`}>{alerta.tutor.email}</a>
                        </span>
                      )}
                      {alerta.correoEnviado && (
                        <span className="texto-exito" style={{ fontSize: '12px' }}>
                          ✓ Notificación automática enviada por correo
                        </span>
                      )}
                    </div>
                  ) : (
                    <p className="texto-secundario" style={{ margin: 0 }}>
                      Sin tutor vinculado aún en Secretaría (consulte con Secretaría para registrar
                      el vínculo familiar).
                    </p>
                  )}
                </div>

                {/* Nota de Atención si ya fue atendida */}
                {alerta.estado === 'ATENDIDA' && alerta.notaAtencion && (
                  <div className="alerta alerta-exito" style={{ marginTop: '12px' }}>
                    <Icono nombre="check" />
                    <div>
                      <strong>Seguimiento Registrado:</strong> {alerta.notaAtencion}
                    </div>
                  </div>
                )}

                {/* Barra de Acciones del Profesor */}
                <div className="fila-acciones-alerta" style={{ marginTop: '16px' }}>
                  <div className="botones-principales">
                    {alerta.estado === 'ACTIVA' && (
                      <button
                        type="button"
                        className="boton boton-primario"
                        data-cy={`boton-atender-${alerta.id}`}
                        onClick={() => abrirModalAtencion(alerta)}
                      >
                        <Icono nombre="check" />
                        <span>Marcar como Atendida</span>
                      </button>
                    )}

                    {!alerta.leida && (
                      <button
                        type="button"
                        className="boton boton-secundario"
                        data-cy={`boton-leer-${alerta.id}`}
                        onClick={() => {
                          void handleMarcarLeida(alerta);
                        }}
                      >
                        <span>Marcar Leída</span>
                      </button>
                    )}

                    <Link
                      to={`/profesor/estudiantes/${alerta.estudianteId}/historial`}
                      className="boton boton-plano"
                      data-cy={`enlace-historial-${alerta.id}`}
                    >
                      <Icono nombre="portapapeles" />
                      <span>Ver Ficha / Historial</span>
                    </Link>

                    <Link
                      to={`/profesor/materias/${alerta.materiaId}/riesgo`}
                      className="boton boton-plano"
                    >
                      <Icono nombre="grafico" />
                      <span>Panel de Riesgo</span>
                    </Link>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Modal Accesible de Registro de Seguimiento / Atención */}
      {alertaParaAtender && (
        <Dialogo
          titulo={`Registrar Atención de Alerta — ${alertaParaAtender.estudianteNombre}`}
          alCerrar={() => setAlertaParaAtender(null)}
          cy="dialogo-atender-alerta"
        >
          <div className="espacio-y">
            <p>
              Registre el seguimiento o acuerdo realizado con el tutor (
              <strong>{alertaParaAtender.tutor?.nombre ?? 'Tutor legal'}</strong>) respecto a la
              baja nota en <strong>{alertaParaAtender.materiaNombre}</strong> (
              {alertaParaAtender.promedioNuevo} pts).
            </p>

            <div className="campo">
              <label htmlFor="nota-seguimiento">
                Detalle de la comunicación o acuerdo pedagógico
              </label>
              <textarea
                id="nota-seguimiento"
                data-cy="textarea-nota-seguimiento"
                rows={4}
                placeholder="Ej: Se coordinó con la madre una reunión presencial el día viernes para fijar tareas de reforzamiento."
                value={notaAtencion}
                onChange={(e) => setNotaAtencion(e.target.value)}
              />
            </div>

            <div className="fila-botones-dialogo">
              <button
                type="button"
                className="boton boton-secundario"
                onClick={() => setAlertaParaAtender(null)}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="boton boton-primario"
                data-cy="boton-confirmar-atencion"
                disabled={guardandoAtencion}
                onClick={() => {
                  void handleGuardarAtencion();
                }}
              >
                {guardandoAtencion ? 'Guardando…' : 'Confirmar Atención'}
              </button>
            </div>
          </div>
        </Dialogo>
      )}
    </div>
  );
}
