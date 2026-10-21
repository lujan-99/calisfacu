import { useEffect, useState, type KeyboardEvent } from 'react';
import { Link, useBlocker, useParams } from 'react-router-dom';
import { Dialogo } from '../../componentes/Dialogo';
import { Aviso, Cargando, ErrorCarga } from '../../componentes/Estados';
import { Icono } from '../../componentes/Icono';
import { guardarPlanilla, obtenerPlanilla, type Planilla as TPlanilla } from '../../lib/api';
import { formatoNumero, nombreTrimestre } from '../../lib/formato';
import { validarNota } from '../../lib/notas';
import { useSesion } from '../../lib/sesion';
import {
  crearSolicitud,
  escucharCambiosSolicitudes,
  marcarEdicionConsumida,
  obtenerEstadoEdicionEstudiante,
  obtenerSolicitudes,
} from '../../lib/solicitudesEdicion';
import { useCarga } from '../../lib/useCarga';

type Mensaje = { tipo: 'exito' | 'error'; texto: string } | null;

/**
 * Planilla de una actividad (US-01, criterios 1 a 3; T-020). Se guardan todas las notas pendientes o ninguna: si una
 * está vacía o fuera de 1 a 100, se marca junto a su campo y no se envía nada.
 * Permite solicitar tickets de desbloqueo al administrador para corregir notas ya registradas (US-04).
 */
export function Planilla() {
  const { materiaId, actividadId } = useParams();
  const id = Number(actividadId);
  const { usuario } = useSesion();
  const { carga, recargar, setCarga } = useCarga(() => obtenerPlanilla(id), [id]);
  const [valores, setValores] = useState<Record<number, string>>({});
  const [tocados, setTocados] = useState<Record<number, boolean>>({});
  const [intento, setIntento] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState<Mensaje>(null);

  // Estados de solicitudes / tickets de edición
  const [, setRevisionTickets] = useState(0);
  const [modalTicket, setModalTicket] = useState(false);
  const [modalHistorial, setModalHistorial] = useState(false);
  const [estudiantesSeleccionados, setEstudiantesSeleccionados] = useState<number[]>([]);
  const [motivoTicket, setMotivoTicket] = useState('');
  const [errorTicket, setErrorTicket] = useState<string | null>(null);

  useEffect(() => {
    return escucharCambiosSolicitudes(() => setRevisionTickets((v) => v + 1));
  }, []);

  const planilla = carga.estado === 'datos' ? carga.datos : null;
  const pendientes = planilla?.filas.filter((f) => f.valor === null) ?? [];
  const habilitados =
    planilla?.filas.filter(
      (f) => f.valor !== null && obtenerEstadoEdicionEstudiante(id, f.estudianteId).habilitada,
    ) ?? [];
  const editables = [...pendientes, ...habilitados];
  const escritas = editables.filter((f) => (valores[f.estudianteId] ?? '').trim() !== '');
  const hayCambios = escritas.length > 0 && !guardando;
  const cerrado = planilla?.actividad.trimestre.cerrado ?? false;

  // Avisa antes de salir con notas escritas sin guardar: por el menú, el botón Volver o cerrando la pestaña.
  const bloqueo = useBlocker(
    ({ currentLocation, nextLocation }) =>
      hayCambios && currentLocation.pathname !== nextLocation.pathname,
  );
  useEffect(() => {
    if (!hayCambios) return;
    const avisar = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', avisar);
    return () => window.removeEventListener('beforeunload', avisar);
  }, [hayCambios]);

  const errorDe = (estudianteId: number) => {
    if (!intento && !tocados[estudianteId]) return null;
    const r = validarNota(valores[estudianteId] ?? '');
    return r.valida ? null : r.error;
  };

  function alTeclear(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    const campos = Array.from(
      e.currentTarget.closest('tbody')?.querySelectorAll<HTMLInputElement>('input') ?? [],
    );
    campos[campos.indexOf(e.currentTarget) + 1]?.focus();
  }

  async function guardar() {
    if (!planilla) return;
    const notas: { estudianteId: number; valor: number }[] = [];
    let errores = 0;
    for (const f of editables) {
      const v = valores[f.estudianteId];
      if (f.valor !== null && (v === undefined || v.trim() === '')) {
        continue;
      }
      const r = validarNota(v ?? '');
      if (r.valida) notas.push({ estudianteId: f.estudianteId, valor: r.valor });
      else errores++;
    }
    if (errores > 0) {
      setIntento(true);
      setMensaje({
        tipo: 'error',
        texto: `Corrija ${errores} nota(s) marcada(s) y vuelva a guardar.`,
      });
      return;
    }
    setGuardando(true);
    setMensaje(null);
    try {
      const r = await guardarPlanilla(id, notas);
      for (const n of notas) {
        marcarEdicionConsumida(id, n.estudianteId);
      }
      const guardadas = new Map(notas.map((n) => [n.estudianteId, n.valor]));
      setCarga({
        estado: 'datos',
        datos: {
          ...planilla,
          filas: planilla.filas.map((f) => ({
            ...f,
            valor: guardadas.get(f.estudianteId) ?? f.valor,
          })),
        } satisfies TPlanilla,
      });
      setValores({});
      setTocados({});
      setIntento(false);
      setMensaje({ tipo: 'exito', texto: `Se guardaron ${r.guardadas} notas` });
    } catch (e) {
      setMensaje({ tipo: 'error', texto: e instanceof Error ? e.message : 'No se pudo guardar' });
    } finally {
      setGuardando(false);
    }
  }

  const abrirModalTicket = (estudiantesIds?: number[]) => {
    const registrados = planilla?.filas.filter((f) => f.valor !== null) ?? [];
    if (registrados.length === 0) {
      setMensaje({
        tipo: 'error',
        texto: 'No hay notas registradas para solicitar edición.',
      });
      return;
    }
    setEstudiantesSeleccionados(estudiantesIds ?? [registrados[0].estudianteId]);
    setMotivoTicket('');
    setErrorTicket(null);
    setModalTicket(true);
  };

  const enviarTicket = () => {
    if (!planilla || !usuario) return;
    if (estudiantesSeleccionados.length === 0) {
      setErrorTicket('Seleccione al menos un estudiante para la solicitud.');
      return;
    }
    if (!motivoTicket.trim()) {
      setErrorTicket('Escriba el motivo justificado de la corrección.');
      return;
    }

    const estudiantesData = planilla.filas
      .filter((f) => estudiantesSeleccionados.includes(f.estudianteId))
      .map((f) => ({
        estudianteId: f.estudianteId,
        estudianteNombre: f.estudiante,
        notaActual: f.valor ?? 0,
      }));

    const ticket = crearSolicitud({
      profesorId: usuario.id,
      profesorNombre: usuario.nombre,
      actividadId: id,
      actividadNombre: planilla.actividad.nombre,
      materiaNombre: planilla.actividad.materia,
      cursoNombre: planilla.actividad.curso,
      dimension: planilla.actividad.dimension,
      estudiantes: estudiantesData,
      motivo: motivoTicket.trim(),
    });

    setModalTicket(false);
    setMensaje({
      tipo: 'exito',
      texto: `Se creó el ticket #${ticket.id}. Ha sido remitido al Administrador para su aprobación.`,
    });
  };

  if (carga.estado === 'cargando')
    return <Cargando texto="Cargando la planilla…" filas={6} alto={48} />;
  if (carga.estado === 'error') return <ErrorCarga mensaje={carga.mensaje} reintentar={recargar} />;
  const { actividad, filas } = carga.datos;
  const volverA = `/profesor/materias/${materiaId}?trimestre=${actividad.trimestre.id}`;

  return (
    <>
      {/* Banner Hero Institucional de la Planilla (US-01) */}
      <section className="hero-rol hero-profesor" aria-label="Resumen de la planilla">
        <div className="hero-rol-contenido">
          <div className="hero-rol-insignia">
            <Icono nombre="portapapeles" tam={16} />
            <span>Planilla Central de Calificaciones · {actividad.dimension}</span>
          </div>
          <h2>{actividad.nombre}</h2>
          <p>
            Registro central de notas sobre escala 1 a 100 en una sola transacción conforme a la RM
            001/2026. Utilice la tecla Enter para navegar ágilmente entre estudiantes.
          </p>
        </div>
        <div className="hero-rol-metricas">
          <div className="hero-metrica-tarjeta">
            <span className="hero-metrica-numero">{filas.length}</span>
            <span className="hero-metrica-etiqueta">Estudiantes</span>
          </div>
          <div className="hero-metrica-tarjeta">
            <span className="hero-metrica-numero">{filas.length - pendientes.length}</span>
            <span className="hero-metrica-etiqueta">Registradas</span>
          </div>
          <div className="hero-metrica-tarjeta">
            <span className="hero-metrica-numero">{pendientes.length}</span>
            <span className="hero-metrica-etiqueta">Por registrar</span>
          </div>
        </div>
      </section>

      <div className="titulo-pagina">
        <div>
          <Link to={volverA} className="volver" data-cy="link-volver">
            <Icono nombre="flechaIzq" tam={16} />
            Volver a actividades
          </Link>
          <h1 data-cy="planilla-titulo">{actividad.nombre}</h1>
          <span className="subtitulo">
            {actividad.materia} · {actividad.curso} · {nombreTrimestre(actividad.trimestre.numero)}{' '}
            · <strong style={{ color: 'var(--color-primario)' }}>{actividad.dimension}</strong>
          </span>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <button
            type="button"
            className="boton boton-secundario"
            data-cy="btn-solicitar-edicion"
            onClick={() => abrirModalTicket()}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            <Icono nombre="candado" tam={16} />
            Solicitar edición de notas
          </button>
          <button
            type="button"
            className="boton boton-secundario"
            data-cy="btn-ver-solicitudes"
            onClick={() => setModalHistorial(true)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            <Icono nombre="portapapeles" tam={16} />
            Tickets de corrección
          </button>
        </div>
      </div>

      {mensaje?.tipo === 'exito' && (
        <Aviso tipo="exito" cy="planilla-exito">
          {mensaje.texto}
        </Aviso>
      )}
      {mensaje?.tipo === 'error' && (
        <Aviso tipo="error" cy={intento ? 'planilla-error-validacion' : 'planilla-error-api'}>
          <strong>No se guardó ninguna nota.</strong> {mensaje.texto}
        </Aviso>
      )}
      {cerrado && (
        <Aviso tipo="advertencia" cy="aviso-trimestre-cerrado">
          El {nombreTrimestre(actividad.trimestre.numero)} está cerrado: no se pueden registrar
          notas.
        </Aviso>
      )}

      <p className="ayuda">
        Notas de 1 a 100, con hasta 2 decimales. Enter pasa al siguiente estudiante. Las notas ya
        registradas requieren solicitud de ticket al administrador para su desbloqueo.
      </p>

      <section className="tabla-marco" aria-labelledby="titulo-planilla">
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 8,
            padding: '16px 20px',
            borderBottom: '1px solid var(--borde)',
          }}
        >
          <h2 id="titulo-planilla" style={{ fontSize: 16 }}>
            Estudiantes
          </h2>
          <span style={{ fontSize: 13, color: 'var(--texto-3)' }}>
            {filas.length} estudiantes · {filas.length - pendientes.length} registradas ·{' '}
            {pendientes.length} por registrar
          </span>
        </div>
        <table className="tabla tabla-planilla" data-cy="tabla-planilla">
          <thead>
            <tr>
              <th scope="col" className="col-n">
                N.º
              </th>
              <th scope="col">Estudiante</th>
              <th scope="col">Nota (1–100)</th>
            </tr>
          </thead>
          <tbody>
            {filas.map((f, i) => {
              const ticketInfo =
                f.valor !== null ? obtenerEstadoEdicionEstudiante(id, f.estudianteId) : null;
              const edicionHabilitada = ticketInfo?.habilitada ?? false;
              const error = f.valor === null || edicionHabilitada ? errorDe(f.estudianteId) : null;
              return (
                <tr key={f.estudianteId} data-cy="fila-estudiante">
                  <td className="col-n">
                    <span className="insignia-plomo">{i + 1}</span>
                  </td>
                  <th scope="row">
                    <div>{f.estudiante}</div>
                    {ticketInfo?.ticket &&
                      !edicionHabilitada &&
                      ticketInfo.ticket.estado === 'PENDIENTE' && (
                        <span
                          className="insignia insignia-neutra"
                          style={{ fontSize: 11, marginTop: 4 }}
                        >
                          Ticket #{ticketInfo.ticket.id} en revisión (Admin)
                        </span>
                      )}
                    {ticketInfo?.ticket &&
                      !edicionHabilitada &&
                      ticketInfo.ticket.estado === 'RECHAZADA' && (
                        <span
                          className="insignia insignia-error"
                          style={{ fontSize: 11, marginTop: 4 }}
                          title={ticketInfo.ticket.observacionAdmin}
                        >
                          Rechazado: {ticketInfo.ticket.observacionAdmin}
                        </span>
                      )}
                  </th>
                  <td>
                    {f.valor !== null && !edicionHabilitada ? (
                      <div className="nota-registrada" data-cy="nota-registrada">
                        <strong>{formatoNumero(f.valor)}</strong>
                        <span>
                          <Icono nombre="candado" tam={14} />
                          Registrada
                        </span>
                        {!ticketInfo?.ticket && (
                          <button
                            type="button"
                            className="boton-texto"
                            style={{
                              fontSize: 12,
                              color: 'var(--color-primario, #78192a)',
                              marginLeft: 8,
                              cursor: 'pointer',
                              border: 'none',
                              background: 'none',
                              textDecoration: 'underline',
                            }}
                            onClick={() => abrirModalTicket([f.estudianteId])}
                          >
                            Pedir corrección
                          </button>
                        )}
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {f.valor !== null && edicionHabilitada && (
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 6,
                              fontSize: 11,
                              color: '#166534',
                            }}
                          >
                            <span className="insignia insignia-exito" style={{ fontSize: 10 }}>
                              Edición habilitada
                            </span>
                            <span>Anterior: {formatoNumero(f.valor)}</span>
                          </div>
                        )}
                        <input
                          className="entrada-nota"
                          type="text"
                          inputMode="decimal"
                          autoComplete="off"
                          data-cy="nota-input"
                          aria-label={`Nota de ${f.estudiante}`}
                          aria-invalid={error !== null}
                          aria-describedby={error ? `error-${f.estudianteId}` : undefined}
                          value={valores[f.estudianteId] ?? ''}
                          disabled={guardando || cerrado}
                          onChange={(e) => {
                            setValores({ ...valores, [f.estudianteId]: e.target.value });
                            setMensaje(null);
                          }}
                          onBlur={() =>
                            (valores[f.estudianteId] ?? '') !== '' &&
                            setTocados({ ...tocados, [f.estudianteId]: true })
                          }
                          onKeyDown={alTeclear}
                        />
                        {error && (
                          <span
                            id={`error-${f.estudianteId}`}
                            className="campo-error"
                            data-cy="nota-error"
                          >
                            {error}
                          </span>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      <div className="barra-guardar">
        <span data-cy="planilla-pendientes" style={{ fontSize: 14, color: 'var(--texto-2)' }}>
          {pendientes.length
            ? `${escritas.length} de ${pendientes.length} notas escritas, sin guardar`
            : 'Todas las notas están registradas'}
        </span>
        <button
          type="button"
          className="boton boton-primario"
          data-cy="btn-guardar-notas"
          disabled={!hayCambios || cerrado}
          aria-busy={guardando}
          onClick={() => void guardar()}
        >
          {guardando && <span className="girando" aria-hidden="true" />}
          {guardando ? 'Guardando…' : 'Guardar notas'}
        </button>
      </div>

      {/* Modal para solicitar Ticket de Edición */}
      {modalTicket && (
        <Dialogo
          titulo="Solicitud de Habilitación de Edición de Notas"
          alCerrar={() => setModalTicket(false)}
        >
          <div style={{ padding: '8px 0' }}>
            <p style={{ margin: '0 0 12px', fontSize: 14, color: 'var(--texto-2)' }}>
              Seleccione los estudiantes para los que solicita autorización de corrección e indique
              el motivo justificativo para el Administrador (US-04):
            </p>

            <div style={{ marginBottom: 16 }}>
              <span style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>
                Estudiantes con nota registrada:
              </span>
              <div
                style={{
                  maxHeight: 180,
                  overflowY: 'auto',
                  border: '1px solid var(--borde)',
                  borderRadius: 6,
                  padding: 8,
                }}
              >
                {planilla?.filas
                  .filter((f) => f.valor !== null)
                  .map((f) => (
                    <label
                      key={f.estudianteId}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '4px 0',
                        fontSize: 13,
                        cursor: 'pointer',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={estudiantesSeleccionados.includes(f.estudianteId)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setEstudiantesSeleccionados([
                              ...estudiantesSeleccionados,
                              f.estudianteId,
                            ]);
                          } else {
                            setEstudiantesSeleccionados(
                              estudiantesSeleccionados.filter((id) => id !== f.estudianteId),
                            );
                          }
                        }}
                      />
                      <span>
                        <strong>{f.estudiante}</strong> — Nota actual: {formatoNumero(f.valor)}
                      </span>
                    </label>
                  ))}
              </div>
            </div>

            <div style={{ marginBottom: 12 }}>
              <label
                htmlFor="motivo-ticket"
                style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}
              >
                Motivo y justificación oficial de la corrección:
              </label>
              <textarea
                id="motivo-ticket"
                data-cy="ticket-motivo"
                style={{
                  width: '100%',
                  minHeight: 80,
                  padding: 10,
                  borderRadius: 6,
                  border: '1px solid var(--borde)',
                  fontSize: 14,
                }}
                placeholder="Ej. Error de transcripción verificado con la prueba física del estudiante..."
                value={motivoTicket}
                onChange={(e) => setMotivoTicket(e.target.value)}
              />
            </div>

            {errorTicket && (
              <span className="campo-error" style={{ display: 'block', marginBottom: 12 }}>
                {errorTicket}
              </span>
            )}

            <div
              style={{
                backgroundColor: '#f8fafc',
                border: '1px solid var(--borde)',
                borderRadius: 6,
                padding: 10,
                fontSize: 12,
                color: 'var(--texto-2)',
              }}
            >
              ℹ Al remitir el ticket, este quedará en revisión ante Dirección / Administrador. Una
              vez aprobado, el casillero se desbloqueará para que ingrese la calificación corregida.
            </div>
          </div>

          <div className="dialogo-acciones">
            <button
              type="button"
              className="boton boton-secundario"
              onClick={() => setModalTicket(false)}
            >
              Cancelar
            </button>
            <button
              type="button"
              className="boton boton-primario"
              data-cy="btn-enviar-ticket"
              onClick={enviarTicket}
            >
              Enviar solicitud al Administrador
            </button>
          </div>
        </Dialogo>
      )}

      {/* Modal de Historial de Tickets */}
      {modalHistorial && (
        <Dialogo
          titulo="Historial de Tickets de Edición (Esta Actividad)"
          alCerrar={() => setModalHistorial(false)}
        >
          <div style={{ padding: '8px 0' }}>
            {obtenerSolicitudes().filter((s) => s.actividadId === id).length === 0 ? (
              <p style={{ fontSize: 14, color: 'var(--texto-2)' }}>
                No se han emitido tickets de corrección para esta actividad.
              </p>
            ) : (
              <table className="tabla" style={{ fontSize: 13 }}>
                <thead>
                  <tr>
                    <th>Ticket</th>
                    <th>Estudiantes</th>
                    <th>Motivo</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {obtenerSolicitudes()
                    .filter((s) => s.actividadId === id)
                    .map((s) => (
                      <tr key={s.id}>
                        <td>
                          <strong>{s.id}</strong>
                          <div style={{ fontSize: 11, color: 'var(--texto-2)' }}>
                            {new Date(s.fechaSolicitud).toLocaleDateString()}
                          </div>
                        </td>
                        <td>
                          {s.estudiantes.map((e) => (
                            <div key={e.estudianteId}>{e.estudianteNombre}</div>
                          ))}
                        </td>
                        <td style={{ maxWidth: 200 }}>
                          <div>{s.motivo}</div>
                          {s.observacionAdmin && (
                            <div style={{ fontSize: 11, fontStyle: 'italic', marginTop: 2 }}>
                              Respuesta: {s.observacionAdmin}
                            </div>
                          )}
                        </td>
                        <td>
                          {s.estado === 'PENDIENTE' && (
                            <span className="insignia insignia-neutra">Pendiente</span>
                          )}
                          {s.estado === 'APROBADA' && (
                            <span className="insignia insignia-exito">Aprobada</span>
                          )}
                          {s.estado === 'RECHAZADA' && (
                            <span className="insignia insignia-error">Rechazada</span>
                          )}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            )}
          </div>
          <div className="dialogo-acciones">
            <button
              type="button"
              className="boton boton-secundario"
              onClick={() => setModalHistorial(false)}
            >
              Cerrar
            </button>
          </div>
        </Dialogo>
      )}

      {bloqueo.state === 'blocked' && (
        <Dialogo
          titulo="¿Salir sin guardar?"
          alCerrar={() => bloqueo.reset()}
          cy="dialogo-cambios-sin-guardar"
        >
          <p className="ayuda">
            Escribió notas que todavía no se guardaron. Si sale ahora, se perderán.
          </p>
          <div className="dialogo-acciones">
            <button
              type="button"
              className="boton boton-secundario"
              data-cy="btn-salir-sin-guardar"
              onClick={() => bloqueo.proceed()}
            >
              Salir sin guardar
            </button>
            <button
              type="button"
              className="boton boton-primario"
              data-cy="btn-seguir-editando"
              onClick={() => bloqueo.reset()}
            >
              Seguir editando
            </button>
          </div>
        </Dialogo>
      )}
    </>
  );
}
