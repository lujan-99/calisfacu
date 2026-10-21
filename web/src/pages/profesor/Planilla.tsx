import { useEffect, useState, type KeyboardEvent } from 'react';
import { Link, useBlocker, useParams } from 'react-router-dom';
import { Dialogo } from '../../componentes/Dialogo';
import { Aviso, Cargando, ErrorCarga } from '../../componentes/Estados';
import { Icono } from '../../componentes/Icono';
import {
  guardarPlanilla,
  obtenerPlanilla,
  type Planilla as TPlanilla,
  type RegistroAuditoriaNota,
} from '../../lib/api';
import {
  ejecutarCorreccionNota,
  escucharCambiosAuditoria,
  obtenerCorreccionesActividad,
  obtenerHistorialNotaEstudiante,
  type RegistroAuditoriaDetallado,
} from '../../lib/auditoriaNotas';
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
 * Permite corrección auditable con motivo obligatorio y visualización de historial inmutable (US-04, RNF-04, M15).
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

  // Estados para corrección auditable y auditoría de notas (US-04)
  const [estudianteACorregir, setEstudianteACorregir] = useState<{
    estudianteId: number;
    estudianteNombre: string;
    notaActual: number;
    notaId?: number | null;
  } | null>(null);
  const [valorNuevaNota, setValorNuevaNota] = useState('');
  const [motivoCorreccion, setMotivoCorreccion] = useState('');
  const [guardandoCorreccion, setGuardandoCorreccion] = useState(false);
  const [errorCorreccion, setErrorCorreccion] = useState<string | null>(null);

  const [estudianteHistorial, setEstudianteHistorial] = useState<{
    estudianteId: number;
    estudianteNombre: string;
    notaActual: number;
    notaId?: number | null;
  } | null>(null);
  const [cargandoHistorial, setCargandoHistorial] = useState(false);
  const [registrosHistorial, setRegistrosHistorial] = useState<RegistroAuditoriaNota[]>([]);

  const [modalAuditoriaActividad, setModalAuditoriaActividad] = useState(false);
  const [correccionesActividad, setCorreccionesActividad] = useState<RegistroAuditoriaDetallado[]>(
    [],
  );
  const [, setRevisionAuditoria] = useState(0);

  useEffect(() => {
    return escucharCambiosSolicitudes(() => setRevisionTickets((v) => v + 1));
  }, []);

  useEffect(() => {
    return escucharCambiosAuditoria(() => {
      setRevisionAuditoria((v) => v + 1);
      setCorreccionesActividad(obtenerCorreccionesActividad(id));
    });
  }, [id]);

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

  const abrirModalCorreccion = (f: {
    estudianteId: number;
    estudiante: string;
    valor: number | null;
    notaId?: number | null;
  }) => {
    if (f.valor === null) return;
    setEstudianteACorregir({
      estudianteId: f.estudianteId,
      estudianteNombre: f.estudiante,
      notaActual: f.valor,
      notaId: f.notaId,
    });
    setValorNuevaNota('');
    setMotivoCorreccion('');
    setErrorCorreccion(null);
  };

  const guardarCorreccionAuditable = async () => {
    if (!estudianteACorregir || !usuario || !planilla) return;
    const r = validarNota(valorNuevaNota);
    if (!r.valida) {
      setErrorCorreccion(r.error);
      return;
    }
    if (r.valor === estudianteACorregir.notaActual) {
      setErrorCorreccion('La nota nueva debe ser diferente a la nota actual.');
      return;
    }
    if (!motivoCorreccion.trim()) {
      setErrorCorreccion('El motivo de la corrección es obligatorio.');
      return;
    }

    setGuardandoCorreccion(true);
    setErrorCorreccion(null);
    try {
      await ejecutarCorreccionNota({
        actividadId: id,
        estudianteId: estudianteACorregir.estudianteId,
        estudianteNombre: estudianteACorregir.estudianteNombre,
        notaId: estudianteACorregir.notaId,
        valorActual: estudianteACorregir.notaActual,
        valorNuevo: r.valor,
        motivo: motivoCorreccion.trim(),
        usuarioNombre: usuario.nombre,
      });

      marcarEdicionConsumida(id, estudianteACorregir.estudianteId);

      setCarga({
        estado: 'datos',
        datos: {
          ...planilla,
          filas: planilla.filas.map((fila) =>
            fila.estudianteId === estudianteACorregir.estudianteId
              ? { ...fila, valor: r.valor }
              : fila,
          ),
        },
      });

      setMensaje({
        tipo: 'exito',
        texto: `Nota de ${estudianteACorregir.estudianteNombre} corregida de ${formatoNumero(
          estudianteACorregir.notaActual,
        )} a ${formatoNumero(r.valor)}. Se guardó el registro de auditoría inmutable.`,
      });
      setEstudianteACorregir(null);
    } catch (e) {
      setErrorCorreccion(e instanceof Error ? e.message : 'Error al guardar la corrección');
    } finally {
      setGuardandoCorreccion(false);
    }
  };

  const abrirHistorialNota = async (f: {
    estudianteId: number;
    estudiante: string;
    valor: number | null;
    notaId?: number | null;
  }) => {
    if (f.valor === null) return;
    setEstudianteHistorial({
      estudianteId: f.estudianteId,
      estudianteNombre: f.estudiante,
      notaActual: f.valor,
      notaId: f.notaId,
    });
    setCargandoHistorial(true);
    try {
      const hist = await obtenerHistorialNotaEstudiante(id, f.estudianteId, f.notaId);
      setRegistrosHistorial(hist);
    } catch {
      setRegistrosHistorial([]);
    } finally {
      setCargandoHistorial(false);
    }
  };

  const abrirAuditoriaActividad = () => {
    setCorreccionesActividad(obtenerCorreccionesActividad(id));
    setModalAuditoriaActividad(true);
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
          <Link
            to={`/profesor/materias/${materiaId}/actividades/${id}/importar`}
            className="boton boton-secundario"
            data-cy="btn-importar-excel"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            <Icono nombre="documento" tam={16} />
            Importar desde Excel
          </Link>
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
          <button
            type="button"
            className="boton boton-secundario"
            data-cy="btn-auditoria-actividad"
            onClick={abrirAuditoriaActividad}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            <Icono nombre="reloj" tam={16} />
            Auditoría de cambios
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
                    <div>
                      <Link
                        to={`/profesor/estudiantes/${f.estudianteId}/historial`}
                        style={{ color: 'inherit', textDecoration: 'none' }}
                        data-cy="link-historial-estudiante"
                        title="Ver historial académico anual del estudiante (US-03)"
                      >
                        {f.estudiante}
                      </Link>
                    </div>
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
                        <div
                          style={{
                            display: 'inline-flex',
                            gap: 8,
                            marginLeft: 8,
                            alignItems: 'center',
                          }}
                        >
                          <button
                            type="button"
                            className="boton-texto"
                            data-cy="btn-corregir-nota"
                            style={{
                              fontSize: 12,
                              color: 'var(--color-primario, #78192a)',
                              cursor: 'pointer',
                              border: 'none',
                              background: 'none',
                              textDecoration: 'underline',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 3,
                            }}
                            onClick={() => abrirModalCorreccion(f)}
                            title="Corregir esta nota con motivo obligatorio (US-04)"
                          >
                            <Icono nombre="lapiz" tam={13} />
                            Corregir
                          </button>
                          <button
                            type="button"
                            className="boton-texto"
                            data-cy="btn-historial-nota"
                            style={{
                              fontSize: 12,
                              color: 'var(--color-plomo, #5B6770)',
                              cursor: 'pointer',
                              border: 'none',
                              background: 'none',
                              textDecoration: 'underline',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 3,
                            }}
                            onClick={() => void abrirHistorialNota(f)}
                            title="Ver historial de cambios y auditoría (US-04)"
                          >
                            <Icono nombre="reloj" tam={13} />
                            Historial
                          </button>
                          {!ticketInfo?.ticket && (
                            <button
                              type="button"
                              className="boton-texto"
                              style={{
                                fontSize: 12,
                                color: 'var(--texto-3)',
                                cursor: 'pointer',
                                border: 'none',
                                background: 'none',
                                textDecoration: 'underline',
                              }}
                              onClick={() => abrirModalTicket([f.estudianteId])}
                              title="Solicitar ticket de desbloqueo al administrador"
                            >
                              Pedir ticket
                            </button>
                          )}
                        </div>
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
                            <button
                              type="button"
                              className="boton-texto"
                              data-cy="btn-corregir-nota"
                              style={{
                                fontSize: 11,
                                color: 'var(--color-primario, #78192a)',
                                cursor: 'pointer',
                                border: 'none',
                                background: 'none',
                                textDecoration: 'underline',
                                marginLeft: 4,
                              }}
                              onClick={() => abrirModalCorreccion(f)}
                            >
                              Corregir con motivo
                            </button>
                            <button
                              type="button"
                              className="boton-texto"
                              data-cy="btn-historial-nota"
                              style={{
                                fontSize: 11,
                                color: 'var(--color-plomo, #5B6770)',
                                cursor: 'pointer',
                                border: 'none',
                                background: 'none',
                                textDecoration: 'underline',
                              }}
                              onClick={() => void abrirHistorialNota(f)}
                            >
                              Historial
                            </button>
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

      {/* Modal de Corrección Auditable de Nota (US-04, criterio 1) */}
      {estudianteACorregir && (
        <Dialogo
          titulo={`Corregir nota de ${estudianteACorregir.estudianteNombre}`}
          alCerrar={() => !guardandoCorreccion && setEstudianteACorregir(null)}
          cy="dialogo-corregir-nota"
        >
          <div style={{ padding: '8px 0' }}>
            <p style={{ margin: '0 0 12px', fontSize: 13, color: 'var(--texto-2)' }}>
              Toda corrección exige un motivo justificado y registrará quién realizó el cambio, la
              fecha y hora exacta, el valor anterior y el nuevo conforme al RNF-04 y la RM 001/2026.
            </p>

            <div
              style={{
                display: 'flex',
                gap: 16,
                padding: '10px 14px',
                backgroundColor: 'var(--fondo-2, #f8fafc)',
                border: '1px solid var(--borde)',
                borderRadius: 6,
                marginBottom: 16,
                fontSize: 13,
              }}
            >
              <div>
                <span style={{ color: 'var(--texto-3)', display: 'block', fontSize: 11 }}>
                  Calificación actual:
                </span>
                <strong style={{ fontSize: 16, color: 'var(--color-primario, #78192a)' }}>
                  {formatoNumero(estudianteACorregir.notaActual)}
                </strong>
              </div>
              <div style={{ borderLeft: '1px solid var(--borde)', paddingLeft: 16 }}>
                <span style={{ color: 'var(--texto-3)', display: 'block', fontSize: 11 }}>
                  Actividad:
                </span>
                <strong>{actividad.nombre}</strong> ({actividad.dimension})
              </div>
            </div>

            <div style={{ marginBottom: 14 }}>
              <label
                htmlFor="input-nueva-nota"
                style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}
              >
                Nueva calificación (1–100):
              </label>
              <input
                id="input-nueva-nota"
                data-cy="input-nueva-nota"
                type="text"
                inputMode="decimal"
                style={{
                  width: '100%',
                  maxWidth: 160,
                  padding: '8px 12px',
                  borderRadius: 6,
                  border: '1px solid var(--borde)',
                  fontSize: 15,
                  fontWeight: 600,
                }}
                placeholder="Ej. 85"
                value={valorNuevaNota}
                onChange={(e) => {
                  setValorNuevaNota(e.target.value);
                  setErrorCorreccion(null);
                }}
                disabled={guardandoCorreccion}
              />
            </div>

            <div style={{ marginBottom: 14 }}>
              <label
                htmlFor="textarea-motivo-correccion"
                style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}
              >
                Motivo justificado de la corrección (obligatorio):
              </label>
              <textarea
                id="textarea-motivo-correccion"
                data-cy="textarea-motivo-correccion"
                rows={3}
                style={{
                  width: '100%',
                  padding: 10,
                  borderRadius: 6,
                  border: '1px solid var(--borde)',
                  fontSize: 13,
                }}
                placeholder="Describa el motivo justificado ante los padres o la dirección académica (ej. error de transcripción en el examen físico)..."
                value={motivoCorreccion}
                onChange={(e) => {
                  setMotivoCorreccion(e.target.value);
                  setErrorCorreccion(null);
                }}
                disabled={guardandoCorreccion}
              />
            </div>

            {errorCorreccion && (
              <span
                className="campo-error"
                data-cy="error-correccion"
                style={{ display: 'block', marginBottom: 12 }}
              >
                {errorCorreccion}
              </span>
            )}

            <div
              style={{
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: 6,
                padding: '8px 12px',
                fontSize: 12,
                color: 'var(--texto-2)',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <Icono nombre="escudo" tam={18} />
              <span>
                <strong>Garantía de integridad (US-04):</strong> El cambio se registrará en una
                bitácora inmutable de solo inserción.
              </span>
            </div>
          </div>

          <div className="dialogo-acciones">
            <button
              type="button"
              className="boton boton-secundario"
              onClick={() => setEstudianteACorregir(null)}
              disabled={guardandoCorreccion}
            >
              Cancelar
            </button>
            <button
              type="button"
              className="boton boton-primario"
              data-cy="btn-guardar-correccion"
              disabled={guardandoCorreccion}
              onClick={() => void guardarCorreccionAuditable()}
            >
              {guardandoCorreccion ? 'Guardando…' : 'Guardar corrección'}
            </button>
          </div>
        </Dialogo>
      )}

      {/* Modal de Historial de Auditoría de Nota (US-04, criterio 1 y 2) */}
      {estudianteHistorial && (
        <Dialogo
          titulo={`Historial de Auditoría — ${estudianteHistorial.estudianteNombre}`}
          alCerrar={() => setEstudianteHistorial(null)}
          cy="dialogo-historial-nota"
        >
          <div style={{ padding: '8px 0' }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 16,
                paddingBottom: 12,
                borderBottom: '1px solid var(--borde)',
              }}
            >
              <div>
                <span style={{ fontSize: 12, color: 'var(--texto-3)' }}>Actividad:</span>
                <div style={{ fontWeight: 600 }}>{actividad.nombre}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: 12, color: 'var(--texto-3)' }}>Nota vigente:</span>
                <div
                  style={{
                    fontSize: 16,
                    fontWeight: 700,
                    color: 'var(--color-primario, #78192a)',
                  }}
                >
                  {formatoNumero(estudianteHistorial.notaActual)}
                </div>
              </div>
            </div>

            {cargandoHistorial ? (
              <p style={{ fontSize: 13, color: 'var(--texto-2)' }}>
                Cargando registros de auditoría…
              </p>
            ) : registrosHistorial.length === 0 ? (
              <div
                style={{
                  padding: 16,
                  textAlign: 'center',
                  color: 'var(--texto-2)',
                  fontSize: 13,
                }}
              >
                <p>
                  Nota registrada inicialmente con valor{' '}
                  <strong>{formatoNumero(estudianteHistorial.notaActual)}</strong>.
                </p>
                <p style={{ fontSize: 11, color: 'var(--texto-3)' }}>
                  No se registran correcciones posteriores en esta calificación.
                </p>
              </div>
            ) : (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12,
                  maxHeight: 280,
                  overflowY: 'auto',
                }}
              >
                {registrosHistorial.map((reg, idx) => (
                  <div
                    key={idx}
                    style={{
                      border: '1px solid var(--borde)',
                      borderRadius: 6,
                      padding: 12,
                      backgroundColor: reg.origen === 'CORRECCION' ? '#fffaf8' : '#fafafa',
                    }}
                    data-cy="item-historial-auditoria"
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
                        className={
                          reg.origen === 'CORRECCION'
                            ? 'insignia insignia-advertencia'
                            : 'insignia insignia-exito'
                        }
                        style={{ fontSize: 11 }}
                      >
                        {reg.origen === 'CORRECCION' ? 'Corrección' : 'Registro inicial'}
                      </span>
                      <span style={{ fontSize: 11, color: 'var(--texto-3)' }}>
                        {new Date(reg.fecha).toLocaleString()}
                      </span>
                    </div>
                    <div style={{ fontSize: 13, marginBottom: 4 }}>
                      {reg.origen === 'CORRECCION' ? (
                        <span>
                          Cambio de <strong>{formatoNumero(reg.valorAnterior)}</strong> a{' '}
                          <strong style={{ color: 'var(--color-primario, #78192a)' }}>
                            {formatoNumero(reg.valorNuevo)}
                          </strong>
                        </span>
                      ) : (
                        <span>
                          Nota asignada: <strong>{formatoNumero(reg.valorNuevo)}</strong>
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--texto-2)' }}>
                      Responsable: <strong>{reg.usuario}</strong>
                    </div>
                    {reg.motivo && (
                      <div
                        style={{
                          fontSize: 12,
                          marginTop: 4,
                          fontStyle: 'italic',
                          color: 'var(--texto-1)',
                        }}
                      >
                        Motivo: "{reg.motivo}"
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div
              style={{
                marginTop: 16,
                backgroundColor: '#f1f5f9',
                borderRadius: 6,
                padding: '8px 12px',
                fontSize: 11,
                color: 'var(--texto-2)',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <Icono nombre="candado" tam={14} />
              <span>
                Registro inmutable de solo lectura (RNF-04). Estos registros no pueden ser alterados
                ni eliminados.
              </span>
            </div>
          </div>

          <div className="dialogo-acciones">
            <button
              type="button"
              className="boton boton-secundario"
              onClick={() => setEstudianteHistorial(null)}
            >
              Cerrar
            </button>
          </div>
        </Dialogo>
      )}

      {/* Modal de Auditoría Consolidada de la Actividad (US-04) */}
      {modalAuditoriaActividad && (
        <Dialogo
          titulo={`Auditoría de Cambios — ${actividad.nombre}`}
          alCerrar={() => setModalAuditoriaActividad(false)}
          cy="dialogo-auditoria-actividad"
        >
          <div style={{ padding: '8px 0' }}>
            <p style={{ margin: '0 0 12px', fontSize: 13, color: 'var(--texto-2)' }}>
              Registro consolidado de todas las correcciones auditadas efectuadas sobre las notas de
              esta actividad conforme a los criterios 1 y 2 de la US-04.
            </p>

            {correccionesActividad.length === 0 ? (
              <p style={{ fontSize: 13, color: 'var(--texto-2)', padding: '12px 0' }}>
                No se han registrado correcciones en esta actividad todavía.
              </p>
            ) : (
              <div style={{ maxHeight: 300, overflowY: 'auto' }}>
                <table className="tabla" style={{ fontSize: 12 }}>
                  <thead>
                    <tr>
                      <th>Fecha y hora</th>
                      <th>Estudiante</th>
                      <th>Cambio</th>
                      <th>Motivo justificado</th>
                      <th>Responsable</th>
                    </tr>
                  </thead>
                  <tbody>
                    {correccionesActividad.map((c) => (
                      <tr key={c.id}>
                        <td>{new Date(c.fecha).toLocaleString()}</td>
                        <td>
                          <strong>{c.estudianteNombre}</strong>
                        </td>
                        <td>
                          {formatoNumero(c.valorAnterior)} &rarr;{' '}
                          <strong style={{ color: 'var(--color-primario, #78192a)' }}>
                            {formatoNumero(c.valorNuevo)}
                          </strong>
                        </td>
                        <td style={{ maxWidth: 180 }}>{c.motivo}</td>
                        <td>{c.usuario}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          <div className="dialogo-acciones">
            <button
              type="button"
              className="boton boton-secundario"
              onClick={() => setModalAuditoriaActividad(false)}
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
