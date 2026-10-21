import { useEffect, useState, type KeyboardEvent } from 'react';
import { Link, useBlocker, useLocation, useParams } from 'react-router-dom';
import { Dialogo } from '../../componentes/Dialogo';
import { Aviso, Cargando, ErrorCarga } from '../../componentes/Estados';
import { Icono } from '../../componentes/Icono';
import {
  corregirNota,
  crearSolicitud,
  guardarPlanilla,
  historialNota,
  listarSolicitudes,
  obtenerPlanilla,
  type FilaPlanilla,
  type Planilla as TPlanilla,
  type RegistroAuditoriaNota,
} from '../../lib/api';
import { formatoNumero, nombreTrimestre } from '../../lib/formato';
import { validarNota } from '../../lib/notas';
import { estadoEdicion, puedePedirEdicion } from '../../lib/solicitudes';
import { useCarga } from '../../lib/useCarga';

type Mensaje = { tipo: 'exito' | 'error'; texto: string } | null;
type NotaElegida = {
  estudianteId: number;
  estudianteNombre: string;
  notaActual: number;
  notaId: number;
};

/**
 * Planilla de una actividad (US-01, criterios 1 a 3; T-020). Se guardan todas las notas pendientes o ninguna: si una
 * está vacía o fuera de 1 a 100, se marca junto a su campo y no se envía nada.
 * Una nota ya registrada no se vuelve a escribir aquí: se corrige con motivo obligatorio y su historial se lee de la
 * auditoría de la API (US-04, RNF-04, M15). Corregir exige una solicitud de edición aprobada por el administrador,
 * que se pide desde aquí (decisión D16).
 */
export function Planilla() {
  const { materiaId, actividadId } = useParams();
  const id = Number(actividadId);
  const { carga, recargar, setCarga } = useCarga(() => obtenerPlanilla(id), [id]);
  const { carga: cargaSolicitudes, recargar: recargarSolicitudes } = useCarga(
    () => listarSolicitudes({ actividadId: id }),
    [id],
  );
  const solicitudes = cargaSolicitudes.estado === 'datos' ? cargaSolicitudes.datos : [];
  const [valores, setValores] = useState<Record<number, string>>({});
  const [tocados, setTocados] = useState<Record<number, boolean>>({});
  const [intento, setIntento] = useState(false);
  const [guardando, setGuardando] = useState(false);
  // La importación desde Excel vuelve aquí con el resumen de lo guardado (US-05).
  const { state } = useLocation() as { state: { mensajeExito?: string } | null };
  const [mensaje, setMensaje] = useState<Mensaje>(() =>
    state?.mensajeExito ? { tipo: 'exito', texto: state.mensajeExito } : null,
  );

  // Solicitud de edición al administrador (decisión D16)
  const [modalSolicitud, setModalSolicitud] = useState(false);
  const [seleccionados, setSeleccionados] = useState<number[]>([]);
  const [motivoSolicitud, setMotivoSolicitud] = useState('');
  const [errorSolicitud, setErrorSolicitud] = useState<string | null>(null);
  const [enviandoSolicitud, setEnviandoSolicitud] = useState(false);

  // Estados para corrección auditable y auditoría de notas (US-04)
  const [estudianteACorregir, setEstudianteACorregir] = useState<NotaElegida | null>(null);
  const [valorNuevaNota, setValorNuevaNota] = useState('');
  const [motivoCorreccion, setMotivoCorreccion] = useState('');
  const [guardandoCorreccion, setGuardandoCorreccion] = useState(false);
  const [errorCorreccion, setErrorCorreccion] = useState<string | null>(null);

  const [estudianteHistorial, setEstudianteHistorial] = useState<NotaElegida | null>(null);
  const [cargandoHistorial, setCargandoHistorial] = useState(false);
  const [registrosHistorial, setRegistrosHistorial] = useState<RegistroAuditoriaNota[]>([]);
  const [errorHistorial, setErrorHistorial] = useState<string | null>(null);

  const planilla = carga.estado === 'datos' ? carga.datos : null;
  const pendientes = planilla?.filas.filter((f) => f.valor === null) ?? [];
  const escritas = pendientes.filter((f) => (valores[f.estudianteId] ?? '').trim() !== '');
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
    for (const f of pendientes) {
      const r = validarNota(valores[f.estudianteId] ?? '');
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
      // La API no devuelve los id de las notas nuevas: se vuelve a leer la planilla para poder corregirlas.
      const actualizada = await obtenerPlanilla(id).catch(() => null);
      const guardadas = new Map(notas.map((n) => [n.estudianteId, n.valor]));
      setCarga({
        estado: 'datos',
        datos:
          actualizada ??
          ({
            ...planilla,
            filas: planilla.filas.map((f) => ({
              ...f,
              valor: guardadas.get(f.estudianteId) ?? f.valor,
            })),
          } satisfies TPlanilla),
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

  const abrirModalCorreccion = (f: FilaPlanilla) => {
    if (f.valor === null || !f.notaId) return;
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
    if (!estudianteACorregir || !planilla) return;
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
      await corregirNota(estudianteACorregir.notaId, {
        valor: r.valor,
        motivo: motivoCorreccion.trim(),
      });

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
      recargarSolicitudes();
    } catch (e) {
      setErrorCorreccion(e instanceof Error ? e.message : 'Error al guardar la corrección');
    } finally {
      setGuardandoCorreccion(false);
    }
  };

  /** Estudiantes con nota que pueden entrar en una solicitud nueva. */
  const pedibles =
    planilla?.filas.filter(
      (f) => f.notaId && puedePedirEdicion(estadoEdicion(solicitudes, f.estudianteId)),
    ) ?? [];

  const abrirSolicitud = (estudianteIds: number[]) => {
    setSeleccionados(estudianteIds);
    setMotivoSolicitud('');
    setErrorSolicitud(null);
    setModalSolicitud(true);
  };

  const enviarSolicitud = async () => {
    if (seleccionados.length === 0) {
      setErrorSolicitud('Seleccione al menos un estudiante.');
      return;
    }
    if (!motivoSolicitud.trim()) {
      setErrorSolicitud('Escriba el motivo de la corrección.');
      return;
    }
    setEnviandoSolicitud(true);
    setErrorSolicitud(null);
    try {
      const s = await crearSolicitud({
        actividadId: id,
        estudianteIds: seleccionados,
        motivo: motivoSolicitud.trim(),
      });
      setModalSolicitud(false);
      setMensaje({
        tipo: 'exito',
        texto: `Se envió la solicitud #${s.id} al administrador. Cuando la apruebe podrá corregir la nota.`,
      });
      recargarSolicitudes();
    } catch (e) {
      setErrorSolicitud(e instanceof Error ? e.message : 'No se pudo enviar la solicitud');
    } finally {
      setEnviandoSolicitud(false);
    }
  };

  const abrirHistorialNota = async (f: FilaPlanilla) => {
    if (f.valor === null || !f.notaId) return;
    setEstudianteHistorial({
      estudianteId: f.estudianteId,
      estudianteNombre: f.estudiante,
      notaActual: f.valor,
      notaId: f.notaId,
    });
    setCargandoHistorial(true);
    try {
      setErrorHistorial(null);
      setRegistrosHistorial(await historialNota(f.notaId));
    } catch (e) {
      setRegistrosHistorial([]);
      setErrorHistorial(e instanceof Error ? e.message : 'No se pudo cargar el historial');
    } finally {
      setCargandoHistorial(false);
    }
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
          {!cerrado && pedibles.length > 0 && (
            <button
              type="button"
              className="boton boton-secundario"
              data-cy="btn-solicitar-edicion"
              onClick={() => abrirSolicitud([])}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              <Icono nombre="candado" tam={16} />
              Solicitar edición de notas
            </button>
          )}
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
        Notas de 1 a 100, con hasta 2 decimales. Enter pasa al siguiente estudiante. Una nota ya
        registrada se corrige con motivo obligatorio, después de que el administrador aprueba su
        solicitud de edición, y queda en la auditoría.
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
              const error = f.valor === null ? errorDe(f.estudianteId) : null;
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
                  </th>
                  <td>
                    {f.valor !== null ? (
                      <div className="nota-registrada" data-cy="nota-registrada">
                        <strong>{formatoNumero(f.valor)}</strong>
                        <span>
                          <Icono nombre="candado" tam={14} />
                          Registrada
                        </span>
                        <EstadoSolicitudFila estado={estadoEdicion(solicitudes, f.estudianteId)} />
                        {/* Sin id no hay nota en la base que corregir ni historial que leer. */}
                        {f.notaId && (
                          <div
                            style={{
                              display: 'inline-flex',
                              gap: 8,
                              marginLeft: 8,
                              alignItems: 'center',
                            }}
                          >
                            {!cerrado &&
                              puedePedirEdicion(estadoEdicion(solicitudes, f.estudianteId)) && (
                                <button
                                  type="button"
                                  className="boton-texto"
                                  data-cy="btn-pedir-edicion"
                                  style={{
                                    fontSize: 12,
                                    color: 'var(--texto-3)',
                                    border: 'none',
                                    background: 'none',
                                    textDecoration: 'underline',
                                    cursor: 'pointer',
                                  }}
                                  onClick={() => abrirSolicitud([f.estudianteId])}
                                  title="Pedir al administrador que habilite la corrección (D16)"
                                >
                                  Pedir edición
                                </button>
                              )}
                            {!cerrado &&
                              estadoEdicion(solicitudes, f.estudianteId).tipo === 'HABILITADA' && (
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
                              )}
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
                          </div>
                        )}
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
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

      {/* Solicitud de edición al administrador (decisión D16) */}
      {modalSolicitud && (
        <Dialogo
          titulo="Solicitar edición de notas"
          alCerrar={() => !enviandoSolicitud && setModalSolicitud(false)}
          cy="dialogo-solicitud-edicion"
        >
          <p className="ayuda">
            Elija los estudiantes cuya nota necesita corregir y explique el motivo al administrador.
            Cuando apruebe la solicitud, podrá corregir cada nota una vez.
          </p>
          <fieldset style={{ border: 'none', padding: 0, margin: '0 0 12px' }}>
            <legend style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
              Estudiantes con nota registrada
            </legend>
            <div
              style={{
                maxHeight: 180,
                overflowY: 'auto',
                border: '1px solid var(--borde)',
                borderRadius: 6,
                padding: 8,
              }}
            >
              {pedibles.map((f) => (
                <label
                  key={f.estudianteId}
                  style={{
                    display: 'flex',
                    gap: 8,
                    alignItems: 'center',
                    padding: '4px 0',
                    fontSize: 13,
                  }}
                >
                  <input
                    type="checkbox"
                    data-cy="solicitud-estudiante"
                    checked={seleccionados.includes(f.estudianteId)}
                    onChange={(e) =>
                      setSeleccionados(
                        e.target.checked
                          ? [...seleccionados, f.estudianteId]
                          : seleccionados.filter((x) => x !== f.estudianteId),
                      )
                    }
                  />
                  <span>
                    <strong>{f.estudiante}</strong> — nota actual {formatoNumero(f.valor ?? 0)}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
          <label htmlFor="motivo-solicitud" style={{ fontSize: 13, fontWeight: 600 }}>
            Motivo de la corrección
          </label>
          <textarea
            id="motivo-solicitud"
            data-cy="solicitud-motivo"
            rows={3}
            style={{
              width: '100%',
              padding: 10,
              borderRadius: 6,
              border: '1px solid var(--borde)',
              fontSize: 13,
              marginTop: 6,
            }}
            value={motivoSolicitud}
            onChange={(e) => setMotivoSolicitud(e.target.value)}
            disabled={enviandoSolicitud}
          />
          {errorSolicitud && (
            <span className="campo-error" data-cy="error-solicitud" style={{ display: 'block' }}>
              {errorSolicitud}
            </span>
          )}
          <div className="dialogo-acciones">
            <button
              type="button"
              className="boton boton-secundario"
              onClick={() => setModalSolicitud(false)}
              disabled={enviandoSolicitud}
            >
              Cancelar
            </button>
            <button
              type="button"
              className="boton boton-primario"
              data-cy="btn-enviar-solicitud"
              disabled={enviandoSolicitud}
              onClick={() => void enviarSolicitud()}
            >
              {enviandoSolicitud ? 'Enviando…' : 'Enviar al administrador'}
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
            ) : errorHistorial ? (
              <Aviso tipo="error" cy="error-historial-nota">
                {errorHistorial}
              </Aviso>
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
                        {reg.origen === 'CORRECCION'
                          ? 'Corrección'
                          : reg.origen === 'IMPORTACION'
                            ? 'Importación desde Excel'
                            : 'Registro inicial'}
                      </span>
                      <span style={{ fontSize: 11, color: 'var(--texto-3)' }}>
                        {new Date(reg.fecha).toLocaleString()}
                      </span>
                    </div>
                    <div style={{ fontSize: 13, marginBottom: 4 }}>
                      {reg.origen === 'CORRECCION' ? (
                        <span>
                          Cambio de <strong>{formatoNumero(reg.valorAnterior ?? 0)}</strong> a{' '}
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

/** Estado de la solicitud de edición de una nota registrada (decisión D16). */
function EstadoSolicitudFila({ estado }: { estado: ReturnType<typeof estadoEdicion> }) {
  if (estado.tipo === 'PENDIENTE') {
    return (
      <span
        className="insignia insignia-neutra"
        data-cy="solicitud-pendiente"
        style={{ fontSize: 11 }}
      >
        Solicitud #{estado.solicitudId} en revisión
      </span>
    );
  }
  if (estado.tipo === 'HABILITADA') {
    return (
      <span
        className="insignia insignia-exito"
        data-cy="edicion-habilitada"
        style={{ fontSize: 11 }}
      >
        Edición habilitada
      </span>
    );
  }
  if (estado.tipo === 'RECHAZADA') {
    return (
      <span
        className="insignia insignia-error"
        data-cy="solicitud-rechazada"
        style={{ fontSize: 11 }}
        title={estado.observacion}
      >
        Rechazada: {estado.observacion}
      </span>
    );
  }
  return null;
}
