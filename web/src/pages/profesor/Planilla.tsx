import { useEffect, useState, type KeyboardEvent } from 'react';
import { Link, useBlocker, useParams } from 'react-router-dom';
import { Dialogo } from '../../componentes/Dialogo';
import { Aviso, Cargando, ErrorCarga } from '../../componentes/Estados';
import { Icono } from '../../componentes/Icono';
import { guardarPlanilla, obtenerPlanilla, type Planilla as TPlanilla } from '../../lib/api';
import { formatoNumero, nombreTrimestre } from '../../lib/formato';
import { validarNota } from '../../lib/notas';
import { useCarga } from '../../lib/useCarga';

type Mensaje = { tipo: 'exito' | 'error'; texto: string } | null;

/**
 * Planilla de una actividad (US-01, criterios 1 a 3; T-020). Se guardan todas las notas pendientes o ninguna: si una
 * está vacía o fuera de 1 a 100, se marca junto a su campo y no se envía nada.
 */
export function Planilla() {
  const { materiaId, actividadId } = useParams();
  const id = Number(actividadId);
  const { carga, recargar, setCarga } = useCarga(() => obtenerPlanilla(id), [id]);
  const [valores, setValores] = useState<Record<number, string>>({});
  const [tocados, setTocados] = useState<Record<number, boolean>>({});
  const [intento, setIntento] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState<Mensaje>(null);

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
        registradas no se pueden cambiar desde aquí.
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
                  <th scope="row">{f.estudiante}</th>
                  <td>
                    {f.valor !== null ? (
                      <div className="nota-registrada" data-cy="nota-registrada">
                        <strong>{formatoNumero(f.valor)}</strong>
                        <span>
                          <Icono nombre="candado" tam={14} />
                          Registrada
                        </span>
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
