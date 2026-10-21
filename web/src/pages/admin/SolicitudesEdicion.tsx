import { useEffect, useState } from 'react';
import { Dialogo } from '../../componentes/Dialogo';
import { Aviso, Vacio } from '../../componentes/Estados';
import { Icono } from '../../componentes/Icono';
import {
  aprobarSolicitud,
  escucharCambiosSolicitudes,
  obtenerSolicitudes,
  rechazarSolicitud,
  type EstadoSolicitud,
  type SolicitudEdicion,
} from '../../lib/solicitudesEdicion';

export function SolicitudesEdicion() {
  const [solicitudes, setSolicitudes] = useState<SolicitudEdicion[]>([]);
  const [filtro, setFiltro] = useState<EstadoSolicitud | 'TODAS'>('TODAS');
  const [seleccionada, setSeleccionada] = useState<SolicitudEdicion | null>(null);
  const [modalRechazo, setModalRechazo] = useState<SolicitudEdicion | null>(null);
  const [motivoRechazo, setMotivoRechazo] = useState('');
  const [errorRechazo, setErrorRechazo] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);

  const cargar = () => {
    setSolicitudes(obtenerSolicitudes());
  };

  useEffect(() => {
    cargar();
    return escucharCambiosSolicitudes(cargar);
  }, []);

  const totalPendientes = solicitudes.filter((s) => s.estado === 'PENDIENTE').length;
  const totalAprobadas = solicitudes.filter((s) => s.estado === 'APROBADA').length;
  const totalRechazadas = solicitudes.filter((s) => s.estado === 'RECHAZADA').length;

  const filtradas = solicitudes.filter((s) => {
    if (filtro === 'TODAS') return true;
    return s.estado === filtro;
  });

  const handleAprobar = (id: string) => {
    aprobarSolicitud(id, 'Habilitación de edición aprobada por Dirección');
    setMensaje(`Ticket #${id} aprobado. Se habilitó la edición de notas.`);
    cargar();
  };

  const handleAbrirRechazo = (sol: SolicitudEdicion) => {
    setModalRechazo(sol);
    setMotivoRechazo('');
    setErrorRechazo(null);
  };

  const handleConfirmarRechazo = () => {
    if (!modalRechazo) return;
    if (!motivoRechazo.trim()) {
      setErrorRechazo('Debe ingresar un motivo para denegar la habilitación.');
      return;
    }
    rechazarSolicitud(modalRechazo.id, motivoRechazo.trim());
    setMensaje(`Ticket #${modalRechazo.id} denegado.`);
    setModalRechazo(null);
    cargar();
  };

  return (
    <>
      <section className="hero-rol hero-admin" aria-label="Resumen de solicitudes de edición">
        <div className="hero-rol-contenido">
          <div className="hero-rol-insignia">
            <Icono nombre="portapapeles" tam={16} />
            <span>Auditoría Académica · Control de Cambios</span>
          </div>
          <h2>Bandeja de Solicitudes de Edición de Notas</h2>
          <p>
            Revisión y autorización formal de tickets remitidos por el profesorado para habilitar la
            edición de calificaciones ya consolidadas.
          </p>
        </div>
        <div className="hero-rol-metricas">
          <div className="hero-metrica-tarjeta">
            <span className="hero-metrica-numero">{totalPendientes}</span>
            <span className="hero-metrica-etiqueta">Pendientes de Aprobación</span>
          </div>
          <div className="hero-metrica-tarjeta">
            <span className="hero-metrica-numero">{totalAprobadas}</span>
            <span className="hero-metrica-etiqueta">Aprobadas</span>
          </div>
          <div className="hero-metrica-tarjeta">
            <span className="hero-metrica-numero">{totalRechazadas}</span>
            <span className="hero-metrica-etiqueta">Rechazadas</span>
          </div>
        </div>
      </section>

      <div className="titulo-pagina">
        <div>
          <h1>Tickets de Corrección de Notas</h1>
          <span className="subtitulo">
            Flujo de control previo a la modificación auditable (US-04).
          </span>
        </div>
        <div className="filtros" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <label htmlFor="filtro-estado" style={{ fontSize: 14, fontWeight: 500 }}>
            Estado:
          </label>
          <select
            id="filtro-estado"
            value={filtro}
            onChange={(e) => setFiltro(e.target.value as EstadoSolicitud | 'TODAS')}
            style={{
              padding: '6px 12px',
              borderRadius: 6,
              border: '1px solid var(--borde)',
              fontSize: 14,
            }}
          >
            <option value="TODAS">Todos los tickets ({solicitudes.length})</option>
            <option value="PENDIENTE">Pendientes ({totalPendientes})</option>
            <option value="APROBADA">Aprobadas ({totalAprobadas})</option>
            <option value="RECHAZADA">Rechazadas ({totalRechazadas})</option>
          </select>
        </div>
      </div>

      {mensaje && (
        <Aviso tipo="exito" cy="mensaje-exito">
          {mensaje}
        </Aviso>
      )}

      {filtradas.length === 0 ? (
        <Vacio
          titulo={
            filtro === 'PENDIENTE'
              ? 'No hay solicitudes pendientes'
              : 'No hay tickets en esta categoría'
          }
          texto="Cuando un profesor solicite habilitar la edición de notas bloqueadas, aparecerá en esta bandeja."
        />
      ) : (
        <div className="tabla-marco">
          <table className="tabla" data-cy="tabla-solicitudes-edicion">
            <thead>
              <tr>
                <th scope="col">Ticket</th>
                <th scope="col">Profesor</th>
                <th scope="col">Materia y Actividad</th>
                <th scope="col">Estudiantes</th>
                <th scope="col">Motivo Justificado</th>
                <th scope="col">Estado</th>
                <th scope="col" className="acciones">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody>
              {filtradas.map((sol) => (
                <tr key={sol.id}>
                  <td>
                    <strong>{sol.id}</strong>
                    <div style={{ fontSize: 12, color: 'var(--texto-2)' }}>
                      {new Date(sol.fechaSolicitud).toLocaleDateString()}
                    </div>
                  </td>
                  <td>
                    <strong>{sol.profesorNombre}</strong>
                    <div style={{ fontSize: 12, color: 'var(--texto-2)' }}>{sol.cursoNombre}</div>
                  </td>
                  <td>
                    <strong>{sol.materiaNombre}</strong>
                    <div style={{ fontSize: 12, color: 'var(--texto-2)' }}>
                      {sol.actividadNombre} ({sol.dimension})
                    </div>
                  </td>
                  <td>
                    <span className="insignia insignia-plomo">
                      {sol.estudiantes.length} estudiante(s)
                    </span>
                    <button
                      type="button"
                      onClick={() => setSeleccionada(sol)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--color-primario, #78192a)',
                        cursor: 'pointer',
                        display: 'block',
                        fontSize: 12,
                        marginTop: 4,
                        padding: 0,
                        textDecoration: 'underline',
                      }}
                    >
                      Ver lista
                    </button>
                  </td>
                  <td>
                    <div
                      style={{
                        maxWidth: 260,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                      title={sol.motivo}
                    >
                      {sol.motivo}
                    </div>
                    {sol.observacionAdmin && (
                      <div
                        style={{
                          fontSize: 12,
                          color: sol.estado === 'APROBADA' ? '#166534' : '#991b1b',
                          marginTop: 2,
                        }}
                      >
                        Resp: {sol.observacionAdmin}
                      </div>
                    )}
                  </td>
                  <td>
                    {sol.estado === 'PENDIENTE' && (
                      <span className="insignia insignia-neutra">Pendiente</span>
                    )}
                    {sol.estado === 'APROBADA' && (
                      <span className="insignia insignia-exito">Aprobada</span>
                    )}
                    {sol.estado === 'RECHAZADA' && (
                      <span className="insignia insignia-error">Rechazada</span>
                    )}
                  </td>
                  <td className="acciones">
                    {sol.estado === 'PENDIENTE' ? (
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          type="button"
                          className="boton boton-primario"
                          style={{ padding: '4px 10px', fontSize: 13 }}
                          onClick={() => handleAprobar(sol.id)}
                          title="Aprobar y desbloquear edición de notas"
                        >
                          Aprobar
                        </button>
                        <button
                          type="button"
                          className="boton boton-secundario"
                          style={{ padding: '4px 10px', fontSize: 13, color: '#991b1b' }}
                          onClick={() => handleAbrirRechazo(sol)}
                          title="Denegar solicitud"
                        >
                          Rechazar
                        </button>
                      </div>
                    ) : (
                      <span style={{ fontSize: 12, color: 'var(--texto-2)' }}>Resuelto</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal de Detalle de Estudiantes */}
      {seleccionada && (
        <Dialogo
          titulo={`Estudiantes en Ticket #${seleccionada.id}`}
          alCerrar={() => setSeleccionada(null)}
        >
          <div style={{ padding: '8px 0' }}>
            <p style={{ margin: '0 0 12px', fontSize: 14 }}>
              <strong>Materia:</strong> {seleccionada.materiaNombre} · <strong>Actividad:</strong>{' '}
              {seleccionada.actividadNombre}
            </p>
            <p style={{ margin: '0 0 12px', fontSize: 14 }}>
              <strong>Motivo:</strong> {seleccionada.motivo}
            </p>
            <table className="tabla" style={{ marginTop: 8 }}>
              <thead>
                <tr>
                  <th>Estudiante</th>
                  <th style={{ textAlign: 'right' }}>Nota Actual</th>
                </tr>
              </thead>
              <tbody>
                {seleccionada.estudiantes.map((e) => (
                  <tr key={e.estudianteId}>
                    <td>{e.estudianteNombre}</td>
                    <td style={{ textAlign: 'right' }}>
                      <strong>{e.notaActual}</strong> / 100
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="dialogo-acciones">
            <button
              type="button"
              className="boton boton-secundario"
              onClick={() => setSeleccionada(null)}
            >
              Cerrar
            </button>
          </div>
        </Dialogo>
      )}

      {/* Modal de Rechazo de Solicitud */}
      {modalRechazo && (
        <Dialogo
          titulo={`Denegar Solicitud #${modalRechazo.id}`}
          alCerrar={() => setModalRechazo(null)}
        >
          <div style={{ padding: '8px 0' }}>
            <p style={{ margin: '0 0 12px', fontSize: 14, color: 'var(--texto-2)' }}>
              Indique la observación u objeción para no autorizar la habilitación de edición de
              notas para el profesor {modalRechazo.profesorNombre}:
            </p>
            <textarea
              style={{
                width: '100%',
                minHeight: 90,
                padding: 10,
                borderRadius: 6,
                border: '1px solid var(--borde)',
                fontSize: 14,
              }}
              placeholder="Ej. Plazo reglamentario de revisión vencido o justificación insuficiente..."
              value={motivoRechazo}
              onChange={(e) => setMotivoRechazo(e.target.value)}
            />
            {errorRechazo && (
              <span className="campo-error" style={{ display: 'block', marginTop: 6 }}>
                {errorRechazo}
              </span>
            )}
          </div>
          <div className="dialogo-acciones">
            <button
              type="button"
              className="boton boton-secundario"
              onClick={() => setModalRechazo(null)}
            >
              Cancelar
            </button>
            <button
              type="button"
              className="boton boton-primario"
              style={{ backgroundColor: '#991b1b', borderColor: '#991b1b' }}
              onClick={handleConfirmarRechazo}
            >
              Confirmar Rechazo
            </button>
          </div>
        </Dialogo>
      )}
    </>
  );
}
