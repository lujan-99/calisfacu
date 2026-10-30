import { useState } from 'react';
import { Dialogo } from '../../componentes/Dialogo';
import { Aviso, Cargando, ErrorCarga, Vacio } from '../../componentes/Estados';
import { Icono } from '../../componentes/Icono';
import {
  despublicarBoletinApi,
  listarCursos,
  listarGestiones,
  listarPublicacionesApi,
  publicarBoletinApi,
  type PublicacionTrimestre,
} from '../../lib/api';
import { formatoFecha, nombreTrimestre } from '../../lib/formato';
import { useCarga } from '../../lib/useCarga';
import { textoError, useMensaje } from '../../lib/useMensaje';

/**
 * Publicación del boletín por curso y trimestre (US-11, T-050, decisión D20). Desde que se publica, el padre ve las
 * notas de ese trimestre; solo se puede publicar cuando todas las materias del curso entregaron sus notas (US-10).
 */
export function PublicacionBoletines() {
  const [cursoId, setCursoId] = useState<number | null>(null);
  const [mensaje, setMensaje] = useMensaje();
  const [error, setError] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState<number | null>(null);
  const [aDespublicar, setADespublicar] = useState<PublicacionTrimestre | null>(null);

  const { carga: cursosCarga, recargar: recargarCursos } = useCarga(async () => {
    const [gestion] = await listarGestiones();
    return gestion ? listarCursos({ gestionId: gestion.id }) : [];
  }, []);
  const cursos = cursosCarga.estado === 'datos' ? cursosCarga.datos : [];
  const cursoActivo = cursos.find((c) => c.id === cursoId) ?? cursos[0] ?? null;

  const { carga, recargar } = useCarga(
    async () => (cursoActivo ? listarPublicacionesApi(cursoActivo.id) : []),
    [cursoActivo?.id],
  );

  const accion = async (t: PublicacionTrimestre, publicar: boolean) => {
    if (!cursoActivo) return;
    setError(null);
    setOcupado(t.trimestreId);
    try {
      if (publicar) await publicarBoletinApi(cursoActivo.id, t.trimestreId);
      else await despublicarBoletinApi(cursoActivo.id, t.trimestreId);
      setMensaje(
        publicar
          ? `Se publicó el boletín del ${nombreTrimestre(t.numero).toLowerCase()} de ${cursoActivo.nombre}: los padres ya pueden verlo.`
          : `Se retiró la publicación del ${nombreTrimestre(t.numero).toLowerCase()} de ${cursoActivo.nombre}.`,
      );
      setADespublicar(null);
      recargar();
    } catch (err) {
      setError(textoError(err, 'No se pudo cambiar la publicación del boletín.'));
    } finally {
      setOcupado(null);
    }
  };

  if (cursosCarga.estado === 'cargando') return <Cargando texto="Cargando cursos…" filas={4} />;
  if (cursosCarga.estado === 'error') {
    return (
      <ErrorCarga
        mensaje={`No se pudieron cargar los cursos. ${cursosCarga.mensaje}`}
        reintentar={recargarCursos}
      />
    );
  }

  return (
    <>
      <div className="titulo-pagina">
        <div>
          <h1 data-cy="titulo-publicacion-boletines">Publicación de boletines</h1>
          <span className="subtitulo">
            Los padres ven las notas de un trimestre cuando se publica su boletín (US-11).
          </span>
        </div>
        {cursos.length > 0 && (
          <label style={{ minWidth: 240 }}>
            <span className="ayuda">Curso</span>
            <select
              className="campo"
              data-cy="select-curso-publicacion"
              value={cursoActivo?.id ?? ''}
              onChange={(e) => setCursoId(Number(e.target.value))}
            >
              {cursos.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      {mensaje && <Aviso tipo="exito">{mensaje}</Aviso>}
      {error && (
        <Aviso tipo="error" cy="aviso-error-publicacion">
          {error}
        </Aviso>
      )}

      {cursos.length === 0 ? (
        <Vacio
          icono="documento"
          titulo="No hay cursos en la gestión"
          texto="Registre los cursos antes de publicar boletines."
        />
      ) : carga.estado === 'cargando' ? (
        <Cargando texto="Cargando el estado de los trimestres…" filas={3} />
      ) : carga.estado === 'error' ? (
        <ErrorCarga
          mensaje={`No se pudo cargar la publicación del curso. ${carga.mensaje}`}
          reintentar={recargar}
        />
      ) : (
        <section className="tabla-marco">
          <table className="tabla" data-cy="tabla-publicaciones">
            <thead>
              <tr>
                <th>Trimestre</th>
                <th>Entrega de notas</th>
                <th>Publicación</th>
                <th style={{ textAlign: 'center' }}>Acción</th>
              </tr>
            </thead>
            <tbody>
              {carga.datos.map((t) => {
                const listo = t.materias > 0 && t.materiasPendientes.length === 0;
                return (
                  <tr key={t.trimestreId} data-cy="fila-publicacion">
                    <td>
                      <strong>{nombreTrimestre(t.numero)}</strong>
                      {t.cerrado && <span className="ayuda"> · cerrado</span>}
                    </td>
                    <td>
                      {t.materias === 0 ? (
                        <span className="insignia insignia-neutra">Sin materias</span>
                      ) : listo ? (
                        <span className="insignia insignia-exito">
                          <Icono nombre="check" tam={12} /> Las {t.materias} materias entregaron
                        </span>
                      ) : (
                        <span className="ayuda">Falta: {t.materiasPendientes.join(', ')}</span>
                      )}
                    </td>
                    <td>
                      {t.publicado ? (
                        <span className="insignia insignia-exito">
                          Publicado el {formatoFecha(t.publicadoEn as string)}
                          {t.publicadoPor ? ` por ${t.publicadoPor.nombre}` : ''}
                        </span>
                      ) : (
                        <span className="insignia insignia-neutra">Sin publicar</span>
                      )}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      {t.publicado ? (
                        <button
                          type="button"
                          className="boton boton-secundario"
                          data-cy="btn-despublicar"
                          disabled={ocupado !== null}
                          onClick={() => setADespublicar(t)}
                        >
                          Retirar publicación
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="boton boton-primario"
                          data-cy="btn-publicar"
                          disabled={!listo || ocupado !== null}
                          title={listo ? undefined : 'Todas las materias deben entregar sus notas'}
                          onClick={() => void accion(t, true)}
                        >
                          {ocupado === t.trimestreId ? 'Publicando…' : 'Publicar boletín'}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      )}

      {aDespublicar && (
        <Dialogo
          titulo="Retirar publicación"
          alCerrar={() => setADespublicar(null)}
          rol="alertdialog"
          cy="dialogo-despublicar"
        >
          <p className="ayuda">
            Los padres dejarán de ver las notas del{' '}
            {nombreTrimestre(aDespublicar.numero).toLowerCase()} hasta que se vuelva a publicar.
          </p>
          <div className="dialogo-acciones">
            <button
              type="button"
              className="boton boton-secundario"
              onClick={() => setADespublicar(null)}
            >
              Cancelar
            </button>
            <button
              type="button"
              className="boton boton-peligro"
              data-cy="btn-confirmar-despublicar"
              disabled={ocupado !== null}
              onClick={() => void accion(aDespublicar, false)}
            >
              {ocupado !== null ? 'Retirando…' : 'Retirar publicación'}
            </button>
          </div>
        </Dialogo>
      )}
    </>
  );
}
