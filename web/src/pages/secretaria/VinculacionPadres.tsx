import { useMemo, useState, type FormEvent } from 'react';
import { ConfirmarBorrado, Dialogo } from '../../componentes/Dialogo';
import { Aviso, Cargando, ErrorCarga, Vacio } from '../../componentes/Estados';
import { Icono } from '../../componentes/Icono';
import {
  crearVinculoFamiliarApi,
  eliminarVinculoFamiliarApi,
  listarCursos,
  listarEstudiantes,
  listarPadresApi,
  listarVinculosFamiliaresApi,
  type Estudiante,
  type PadreTutor,
  type VinculoFamiliar,
} from '../../lib/api';
import { useCarga } from '../../lib/useCarga';
import { textoError, useMensaje } from '../../lib/useMensaje';
import {
  calcularEstadisticasVinculos,
  ETIQUETAS_PARENTESCO,
  filtrarVinculos,
  validarVinculo,
} from '../../lib/vinculos';

interface FormularioVinculo {
  padreId: number | '';
  cursoEstudianteId: number | '';
  estudianteId: number | '';
  parentesco: string;
}

const VALOR_INICIAL_FORMULARIO: FormularioVinculo = {
  padreId: '',
  cursoEstudianteId: '',
  estudianteId: '',
  parentesco: 'PADRE',
};

/**
 * Pantalla de Gestión de Vinculación Padre–Estudiante para Secretaría (US-20, T-049).
 * Criterio 1: La secretaria vincula una cuenta de padre con uno o más estudiantes; el padre ve solo a sus hijos vinculados.
 * Criterio 2: Acceso protegido por vínculo formal (RNF-04).
 */
export function VinculacionPadres() {
  const [cursoFiltro, setCursoFiltro] = useState<number | ''>('');
  const [terminoBusqueda, setTerminoBusqueda] = useState<string>('');
  const [mensaje, setMensaje] = useMensaje();
  const [errorPagina, setErrorPagina] = useState<string | null>(null);

  // Estados del modal de creación
  const [dialogoAbierto, setDialogoAbierto] = useState(false);
  const [form, setForm] = useState<FormularioVinculo>(VALOR_INICIAL_FORMULARIO);
  const [guardando, setGuardando] = useState(false);
  const [errorForm, setErrorForm] = useState<string | null>(null);

  // Estados de eliminación
  const [vinculoABorrar, setVinculoABorrar] = useState<VinculoFamiliar | null>(null);
  const [borrando, setBorrando] = useState(false);

  // Carga inicial de datos combinados
  const { carga, recargar } = useCarga(async () => {
    const [cursos, vinculos, padres, estudiantes] = await Promise.all([
      listarCursos({}),
      listarVinculosFamiliaresApi().catch(() => [] as VinculoFamiliar[]),
      listarPadresApi().catch(() => [] as PadreTutor[]),
      listarEstudiantes({}).catch(() => [] as Estudiante[]),
    ]);

    return { cursos, vinculos, padres, estudiantes };
  }, []);

  const datos = carga.estado === 'datos' ? carga.datos : null;
  const listaCursos = datos?.cursos ?? [];
  const listaVinculos = datos?.vinculos ?? [];
  const listaPadres = datos?.padres ?? [];
  const listaEstudiantes = datos?.estudiantes ?? [];

  // Filtrar vínculos en memoria según controles de usuario
  const vinculosFiltrados = useMemo(() => {
    return filtrarVinculos(listaVinculos, terminoBusqueda, cursoFiltro);
  }, [listaVinculos, terminoBusqueda, cursoFiltro]);

  // Estadísticas del panel
  const estadisticas = useMemo(() => {
    return calcularEstadisticasVinculos(listaVinculos, listaEstudiantes.length, listaPadres);
  }, [listaVinculos, listaEstudiantes.length, listaPadres]);

  // Estudiantes disponibles para el diálogo (filtrados por curso si se seleccionó uno)
  const estudiantesParaModal = useMemo(() => {
    if (!form.cursoEstudianteId) return listaEstudiantes;
    return listaEstudiantes.filter((e) => e.curso.id === Number(form.cursoEstudianteId));
  }, [listaEstudiantes, form.cursoEstudianteId]);

  function abrirModalNuevo() {
    setForm(VALOR_INICIAL_FORMULARIO);
    setErrorForm(null);
    setDialogoAbierto(true);
  }

  function cerrarModal() {
    setDialogoAbierto(false);
    setErrorForm(null);
  }

  async function handleGuardarVinculo(ev: FormEvent) {
    ev.preventDefault();
    setErrorForm(null);

    const padreId = Number(form.padreId) || 0;
    const estudianteId = Number(form.estudianteId) || 0;

    const validacion = validarVinculo(padreId, estudianteId, listaVinculos);
    if (!validacion.valido) {
      setErrorForm(validacion.error ?? 'Datos del vínculo inválidos.');
      return;
    }

    setGuardando(true);
    try {
      await crearVinculoFamiliarApi({
        padreId,
        estudianteId,
        parentesco: form.parentesco,
      });

      const padre = listaPadres.find((p) => p.id === padreId);
      const est = listaEstudiantes.find((e) => e.id === estudianteId);
      const nombrePadre = padre ? padre.nombre : `Padre #${padreId}`;
      const nombreEst = est ? `${est.apellidos}, ${est.nombres}` : `Estudiante #${estudianteId}`;

      setMensaje(`Se vinculó exitosamente a ${nombrePadre} con el estudiante ${nombreEst}.`);
      cerrarModal();
      recargar();
    } catch (err) {
      setErrorForm(textoError(err, 'No se pudo guardar la vinculación familiar.'));
    } finally {
      setGuardando(false);
    }
  }

  async function handleConfirmarBorrado() {
    if (!vinculoABorrar) return;
    setBorrando(true);
    setErrorPagina(null);

    try {
      await eliminarVinculoFamiliarApi(
        vinculoABorrar.padreId,
        vinculoABorrar.estudianteId,
        vinculoABorrar.id,
      );
      setMensaje('Se eliminó el vínculo familiar satisfactoriamente.');
      setVinculoABorrar(null);
      recargar();
    } catch (err) {
      setErrorPagina(textoError(err, 'No se pudo eliminar el vínculo familiar.'));
    } finally {
      setBorrando(false);
    }
  }

  return (
    <div className="pagina">
      {/* Cabecera principal */}
      <div className="bloque-cabecera">
        <div>
          <span
            className="insignia"
            style={{
              background: '#e0f2fe',
              color: '#0369a1',
              fontWeight: 600,
              display: 'inline-block',
              marginBottom: 6,
            }}
          >
            US-20 · Seguridad y Control de Acceso (RNF-04)
          </span>
          <h1 style={{ margin: '4px 0 6px', fontSize: '1.6rem', fontWeight: 700 }}>
            Vinculación Padre–Estudiante
          </h1>
          <p style={{ margin: 0, color: 'var(--texto-secundario, #64748b)', fontSize: '0.95rem' }}>
            Asignación formal de tutores a estudiantes. Garantiza que cada padre únicamente tenga
            acceso a las calificaciones y boletines de sus propios hijos.
          </p>
        </div>
        <button
          type="button"
          className="boton boton-primario"
          data-cy="btn-nuevo-vinculo"
          onClick={abrirModalNuevo}
        >
          <Icono nombre="mas" tam={18} />
          Vincular Padre y Estudiante
        </button>
      </div>

      {mensaje && (
        <Aviso tipo="exito" cy="mensaje-exito">
          {mensaje}
        </Aviso>
      )}
      {errorPagina && <Aviso tipo="error">{errorPagina}</Aviso>}

      {/* Tarjetas de Métricas de Vinculación */}
      <div
        className="tarjetas"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 16,
          margin: '20px 0',
        }}
      >
        <div
          className="tarjeta"
          style={{
            padding: 16,
            borderRadius: 8,
            border: '1px solid var(--borde, #e2e8f0)',
            background: 'var(--superficie, #ffffff)',
          }}
        >
          <div style={{ fontSize: '0.85rem', color: 'var(--texto-secundario, #64748b)' }}>
            Total de Vínculos Activos
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--acento, #0284c7)' }}>
            {estadisticas.totalVinculos}
          </div>
        </div>

        <div
          className="tarjeta"
          style={{
            padding: 16,
            borderRadius: 8,
            border: '1px solid var(--borde, #e2e8f0)',
            background: 'var(--superficie, #ffffff)',
          }}
        >
          <div style={{ fontSize: '0.85rem', color: 'var(--texto-secundario, #64748b)' }}>
            Padres y Tutores Registrados
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--texto, #0f172a)' }}>
            {estadisticas.totalPadres}
          </div>
        </div>

        <div
          className="tarjeta"
          style={{
            padding: 16,
            borderRadius: 8,
            border: '1px solid var(--borde, #e2e8f0)',
            background: 'var(--superficie, #ffffff)',
          }}
        >
          <div style={{ fontSize: '0.85rem', color: 'var(--texto-secundario, #64748b)' }}>
            Estudiantes con Tutor
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 700, color: '#16a34a' }}>
            {estadisticas.estudiantesConTutor}
            <span style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: 400, marginLeft: 6 }}>
              ({estadisticas.porcentajeCobertura}%)
            </span>
          </div>
        </div>

        <div
          className="tarjeta"
          style={{
            padding: 16,
            borderRadius: 8,
            border: '1px solid var(--borde, #e2e8f0)',
            background:
              estadisticas.estudiantesSinTutor > 0 ? '#fffbeb' : 'var(--superficie, #ffffff)',
          }}
        >
          <div
            style={{
              fontSize: '0.85rem',
              color:
                estadisticas.estudiantesSinTutor > 0
                  ? '#b45309'
                  : 'var(--texto-secundario, #64748b)',
            }}
          >
            Estudiantes sin Tutor Asignado
          </div>
          <div
            style={{
              fontSize: '1.8rem',
              fontWeight: 700,
              color: estadisticas.estudiantesSinTutor > 0 ? '#b45309' : 'var(--texto, #0f172a)',
            }}
          >
            {estadisticas.estudiantesSinTutor}
          </div>
        </div>
      </div>

      {/* Barra de Filtros */}
      <div className="filtros" style={{ margin: '16px 0' }}>
        <label className="campo">
          Curso
          <select
            data-cy="filtro-curso-vinculos"
            value={cursoFiltro}
            onChange={(e) => setCursoFiltro(Number(e.target.value) || '')}
          >
            <option value="">Todos los cursos</option>
            {listaCursos.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
          </select>
        </label>

        <label className="campo ancho">
          Búsqueda
          <input
            type="search"
            data-cy="filtro-busqueda-vinculos"
            placeholder="Buscar por padre, email, estudiante o RUDE..."
            value={terminoBusqueda}
            onChange={(e) => setTerminoBusqueda(e.target.value)}
          />
        </label>

        {(cursoFiltro || terminoBusqueda) && (
          <button
            type="button"
            className="boton boton-secundario"
            onClick={() => {
              setCursoFiltro('');
              setTerminoBusqueda('');
            }}
            style={{ alignSelf: 'flex-end' }}
          >
            Limpiar filtros
          </button>
        )}
      </div>

      {/* Contenido de la Tabla */}
      <section aria-labelledby="titulo-vinculos">
        <h2 id="titulo-vinculos" className="solo-lector">
          Lista de vínculos padre–estudiante
        </h2>

        {carga.estado === 'cargando' && <Cargando texto="Cargando vínculos familiares…" />}

        {carga.estado === 'error' && (
          <ErrorCarga
            mensaje={`No se pudieron cargar los datos. ${carga.mensaje}`}
            reintentar={recargar}
          />
        )}

        {carga.estado === 'datos' && vinculosFiltrados.length === 0 && (
          <Vacio
            titulo={
              cursoFiltro || terminoBusqueda
                ? 'Ningún vínculo familiar coincide con los filtros aplicados.'
                : 'Todavía no hay vínculos registrados.'
            }
            texto={
              cursoFiltro || terminoBusqueda
                ? 'Intente modificando el término de búsqueda o seleccionando otro curso.'
                : 'Asigne tutores a los estudiantes pulsando en «Vincular Padre y Estudiante».'
            }
          />
        )}

        {carga.estado === 'datos' && vinculosFiltrados.length > 0 && (
          <div className="tabla-marco">
            <table className="tabla" data-cy="tabla-vinculos">
              <thead>
                <tr>
                  <th scope="col" style={{ width: 48, textAlign: 'center' }}>
                    N.º
                  </th>
                  <th scope="col">Tutor / Padre de Familia</th>
                  <th scope="col">Parentesco</th>
                  <th scope="col">Estudiante Vinculado (Hijo)</th>
                  <th scope="col">Curso</th>
                  <th scope="col" className="acciones">
                    Acción
                  </th>
                </tr>
              </thead>
              <tbody>
                {vinculosFiltrados.map((v, index) => {
                  const nombrePadre = v.padre?.nombre ?? `Padre #${v.padreId}`;
                  const emailPadre = v.padre?.email;
                  const ciPadre = v.padre?.ci;

                  const estudiante = v.estudiante;
                  const nombreEstudiante = estudiante
                    ? `${estudiante.apellidos}, ${estudiante.nombres}`
                    : `Estudiante #${v.estudianteId}`;
                  const rudeEstudiante = estudiante?.codigoRude;
                  const cursoNombre = estudiante?.curso?.nombre ?? '—';
                  const parentescoTexto =
                    ETIQUETAS_PARENTESCO[v.parentesco ?? ''] ?? v.parentesco ?? 'Tutor';

                  return (
                    <tr key={`${v.padreId}-${v.estudianteId}`} data-cy="fila-vinculo">
                      <td style={{ textAlign: 'center', color: '#64748b' }}>{index + 1}</td>
                      <td>
                        <strong>{nombrePadre}</strong>
                        {emailPadre && (
                          <div style={{ fontSize: '0.85rem', color: '#64748b' }}>{emailPadre}</div>
                        )}
                        {ciPadre && (
                          <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>CI: {ciPadre}</div>
                        )}
                      </td>
                      <td>
                        <span className="insignia insignia-plomo">{parentescoTexto}</span>
                      </td>
                      <td>
                        <strong>{nombreEstudiante}</strong>
                        {rudeEstudiante && (
                          <div style={{ fontSize: '0.85rem' }}>
                            <span
                              className="insignia insignia-plomo"
                              style={{ fontSize: '0.75rem' }}
                            >
                              RUDE: {rudeEstudiante}
                            </span>
                          </div>
                        )}
                      </td>
                      <td>
                        <span className="insignia insignia-curso">{cursoNombre}</span>
                      </td>
                      <td className="acciones">
                        <button
                          type="button"
                          className="boton-icono peligro"
                          data-cy="btn-eliminar-vinculo"
                          aria-label={`Desvincular a ${nombrePadre} de ${nombreEstudiante}`}
                          title="Eliminar vinculación"
                          onClick={() => setVinculoABorrar(v)}
                        >
                          <Icono nombre="basura" tam={18} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Diálogo Modal de Creación de Vínculo */}
      {dialogoAbierto && (
        <Dialogo
          titulo="Vincular Padre de Familia con Estudiante"
          alCerrar={cerrarModal}
          cy="dialogo-nuevo-vinculo"
        >
          <form onSubmit={(e) => void handleGuardarVinculo(e)}>
            <p className="ayuda" style={{ marginBottom: 16 }}>
              Seleccione el tutor y el estudiante. Al vincularse, el padre obtendrá acceso exclusivo
              para consultar las notas y el boletín oficial del estudiante (RNF-04).
            </p>

            {errorForm && <Aviso tipo="error">{errorForm}</Aviso>}

            {/* Selector de Padre / Tutor */}
            <label className="campo" style={{ marginBottom: 12 }}>
              Padre de familia o tutor *
              <select
                data-cy="select-padre"
                required
                value={form.padreId}
                onChange={(e) => setForm({ ...form, padreId: Number(e.target.value) || '' })}
              >
                <option value="">Seleccione un tutor registrado...</option>
                {listaPadres.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre} ({p.email})
                  </option>
                ))}
              </select>
            </label>

            {/* Selector de Parentesco */}
            <label className="campo" style={{ marginBottom: 12 }}>
              Relación o parentesco
              <select
                data-cy="select-parentesco"
                value={form.parentesco}
                onChange={(e) => setForm({ ...form, parentesco: e.target.value })}
              >
                <option value="PADRE">Padre</option>
                <option value="MADRE">Madre</option>
                <option value="TUTOR_LEGAL">Tutor Legal</option>
                <option value="APODERADO">Apoderado</option>
                <option value="OTRO">Otro familiar</option>
              </select>
            </label>

            {/* Filtro auxiliar de Curso para facilitar encontrar al Estudiante */}
            <label className="campo" style={{ marginBottom: 12 }}>
              Filtrar estudiantes por curso (opcional)
              <select
                data-cy="select-curso-estudiante"
                value={form.cursoEstudianteId}
                onChange={(e) =>
                  setForm({
                    ...form,
                    cursoEstudianteId: Number(e.target.value) || '',
                    estudianteId: '',
                  })
                }
              >
                <option value="">Todos los cursos</option>
                {listaCursos.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre}
                  </option>
                ))}
              </select>
            </label>

            {/* Selector de Estudiante */}
            <label className="campo" style={{ marginBottom: 16 }}>
              Estudiante (Hijo / Tutelado) *
              <select
                data-cy="select-estudiante"
                required
                value={form.estudianteId}
                onChange={(e) => setForm({ ...form, estudianteId: Number(e.target.value) || '' })}
              >
                <option value="">Seleccione un estudiante...</option>
                {estudiantesParaModal.map((est) => (
                  <option key={est.id} value={est.id}>
                    {est.apellidos}, {est.nombres} — {est.curso?.nombre ?? 'Sin curso'} (RUDE:{' '}
                    {est.codigoRude})
                  </option>
                ))}
              </select>
            </label>

            <div
              style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: 6,
                padding: '10px 12px',
                fontSize: '0.85rem',
                color: '#475569',
                marginBottom: 16,
              }}
            >
              🔒 <strong>Garantía de privacidad:</strong> Cualquier intento por parte de un tutor de
              consultar las calificaciones de estudiantes con los que no tenga vínculo asentado será
              rechazado por el sistema con HTTP 403 Forbidden.
            </div>

            <div className="dialogo-acciones">
              <button
                type="button"
                className="boton boton-secundario"
                onClick={cerrarModal}
                disabled={guardando}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="boton boton-primario"
                data-cy="btn-guardar-vinculo"
                disabled={guardando}
              >
                {guardando ? 'Guardando vínculo…' : 'Guardar vinculación'}
              </button>
            </div>
          </form>
        </Dialogo>
      )}

      {/* Diálogo de Confirmación de Borrado */}
      {vinculoABorrar && (
        <ConfirmarBorrado
          titulo="Eliminar vínculo familiar"
          alCerrar={() => setVinculoABorrar(null)}
          alConfirmar={() => void handleConfirmarBorrado()}
          borrando={borrando}
        >
          ¿Está seguro de eliminar el vínculo entre{' '}
          <strong>{vinculoABorrar.padre?.nombre ?? `Padre #${vinculoABorrar.padreId}`}</strong> y el
          estudiante{' '}
          <strong>
            {vinculoABorrar.estudiante
              ? `${vinculoABorrar.estudiante.apellidos}, ${vinculoABorrar.estudiante.nombres}`
              : `Estudiante #${vinculoABorrar.estudianteId}`}
          </strong>
          ? El padre perderá inmediatamente el acceso al boletín e historial de calificaciones de
          este estudiante.
        </ConfirmarBorrado>
      )}
    </div>
  );
}
