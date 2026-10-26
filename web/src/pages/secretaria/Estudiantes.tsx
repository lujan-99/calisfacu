import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { ConfirmarBorrado, Dialogo } from '../../componentes/Dialogo';
import { Campo } from '../../componentes/Campo';
import { Aviso, Cargando, ErrorCarga, Vacio } from '../../componentes/Estados';
import { Icono } from '../../componentes/Icono';
import {
  actualizarEstudiante,
  borrarEstudiante,
  crearEstudiante,
  listarCursos,
  listarEstudiantes,
  type DatosEstudiante,
  type Estudiante,
} from '../../lib/api';
import { useCarga } from '../../lib/useCarga';
import { textoError, useMensaje } from '../../lib/useMensaje';

type Formulario = DatosEstudiante & { id?: number };

/** Espera a que el usuario deje de escribir antes de buscar. */
function useRetardo<T>(valor: T, ms = 300): T {
  const [retardado, setRetardado] = useState(valor);
  useEffect(() => {
    const t = window.setTimeout(() => setRetardado(valor), ms);
    return () => window.clearTimeout(t);
  }, [valor, ms]);
  return retardado;
}

/**
 * Estudiantes de la gestión más reciente (US-18, criterio 3; T-017). El código RUDE no se repite en una gestión
 * (decisión D10): si el estudiante ya está inscrito en otro curso, la API lo rechaza y el mensaje dice dónde está.
 * Antes de eliminar, una advertencia explica que se pierde el historial de notas del estudiante.
 */
export function Estudiantes() {
  const { carga: cursos } = useCarga(() => listarCursos({}), []);
  const [cursoId, setCursoId] = useState<number | ''>('');
  const [apellido, setApellido] = useState('');
  const busqueda = useRetardo(apellido.trim());
  const { carga, recargar } = useCarga(
    () => listarEstudiantes({ cursoId: cursoId || undefined, apellido: busqueda || undefined }),
    [cursoId, busqueda],
  );
  const [mensaje, setMensaje] = useMensaje();
  const [form, setForm] = useState<Formulario | null>(null);
  const [errores, setErrores] = useState<Partial<Record<keyof DatosEstudiante, string>>>({});
  const [errorForm, setErrorForm] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [aBorrar, setABorrar] = useState<Estudiante | null>(null);
  const [borrando, setBorrando] = useState(false);
  const [errorPagina, setErrorPagina] = useState<string | null>(null);

  const listaCursos = cursos.estado === 'datos' ? cursos.datos : [];
  const gestion = listaCursos[0]?.gestion.anio;
  const filtrando = !!cursoId || !!busqueda;

  function validar(f: Formulario) {
    const e: typeof errores = {};
    if (!/^[0-9A-Z]{6,20}$/.test(f.codigoRude.trim().toUpperCase())) {
      e.codigoRude = 'El código RUDE debe tener de 6 a 20 letras o números';
    }
    if (!f.nombres.trim()) e.nombres = 'Escriba los nombres';
    if (!f.apellidos.trim()) e.apellidos = 'Escriba los apellidos';
    if (!f.cursoId) e.cursoId = 'Seleccione un curso';
    const ci = f.ci.trim().toUpperCase();
    if (ci && !/^[0-9A-Z][0-9A-Z -]{3,13}[0-9A-Z]$/.test(ci)) {
      e.ci = 'El CI debe tener de 5 a 15 caracteres: números, letras, espacio o guion';
    }
    setErrores(e);
    return Object.keys(e).length === 0;
  }

  async function guardar(ev: FormEvent) {
    ev.preventDefault();
    if (!form || !validar(form)) return;
    setGuardando(true);
    setErrorForm(null);
    const { id, ...datos } = form;
    try {
      const est = id ? await actualizarEstudiante(id, datos) : await crearEstudiante(datos);
      setForm(null);
      setMensaje(`Se guardó a ${est.apellidos}, ${est.nombres}`);
      recargar();
    } catch (err) {
      setErrorForm(textoError(err));
    } finally {
      setGuardando(false);
    }
  }

  async function borrar() {
    if (!aBorrar) return;
    setBorrando(true);
    try {
      await borrarEstudiante(aBorrar.id);
      setMensaje(`Se eliminó a ${aBorrar.apellidos}, ${aBorrar.nombres}`);
      recargar();
    } catch (err) {
      setErrorPagina(textoError(err));
    } finally {
      setBorrando(false);
      setABorrar(null);
    }
  }

  const abrir = (f: Formulario) => {
    setErrores({});
    setErrorForm(null);
    setForm(f);
  };

  return (
    <>
      {/* Banner Hero Institucional de Estudiantes (US-18) */}
      <section className="hero-rol hero-secretaria" aria-label="Resumen de estudiantes">
        <div className="hero-rol-contenido">
          <div className="hero-rol-insignia">
            <Icono nombre="personas" tam={16} />
            <span>Padrón Estudiantil · RUDE Oficial</span>
          </div>
          <h2>Control de Inscripciones y Registro Único</h2>
          <p>
            Registro centralizado de estudiantes con validación de código RUDE único por gestión y
            curso asignado.
          </p>
        </div>
        <div className="hero-rol-metricas">
          <div className="hero-metrica-tarjeta">
            <span className="hero-metrica-numero">
              {carga.estado === 'datos' ? carga.datos.length : '—'}
            </span>
            <span className="hero-metrica-etiqueta">Estudiantes listados</span>
          </div>
          <div className="hero-metrica-tarjeta">
            <span className="hero-metrica-numero">{listaCursos.length}</span>
            <span className="hero-metrica-etiqueta">Cursos habilitados</span>
          </div>
          <div className="hero-metrica-tarjeta">
            <span className="hero-metrica-numero">RUDE</span>
            <span className="hero-metrica-etiqueta">Identificador único</span>
          </div>
        </div>
      </section>

      <div className="titulo-pagina">
        <div>
          <h1>Estudiantes</h1>
          <span className="subtitulo">
            {gestion ? `Gestión ${gestion} · ` : ''}cada estudiante está inscrito en un solo curso.
          </span>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <Link
            to="/secretaria/vinculos-familiares"
            className="boton boton-secundario"
            data-cy="link-vinculos-familiares"
          >
            <Icono nombre="personas" tam={18} />
            Vínculos familiares
          </Link>
          <button
            type="button"
            className="boton boton-primario"
            data-cy="btn-nuevo-estudiante"
            onClick={() =>
              abrir({
                cursoId: Number(cursoId) || 0,
                codigoRude: '',
                ci: '',
                nombres: '',
                apellidos: '',
              })
            }
          >
            <Icono nombre="mas" tam={18} />
            Nuevo estudiante
          </button>
        </div>
      </div>
      {mensaje && (
        <Aviso tipo="exito" cy="mensaje-exito">
          {mensaje}
        </Aviso>
      )}
      {errorPagina && <Aviso tipo="error">{errorPagina}</Aviso>}

      <div className="filtros">
        <label className="campo">
          Curso
          <select
            data-cy="filtro-curso"
            value={cursoId}
            onChange={(e) => setCursoId(Number(e.target.value) || '')}
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
          Apellido
          <input
            type="search"
            data-cy="filtro-apellido"
            placeholder="Buscar por apellido"
            value={apellido}
            onChange={(e) => setApellido(e.target.value)}
          />
        </label>
      </div>

      <section aria-labelledby="titulo-lista">
        <h2 id="titulo-lista" className="solo-lector">
          Lista de estudiantes
        </h2>
        {carga.estado === 'cargando' && <Cargando texto="Cargando estudiantes…" />}
        {carga.estado === 'error' && (
          <ErrorCarga
            mensaje={`No se pudo cargar la lista. ${carga.mensaje}`}
            reintentar={recargar}
          />
        )}
        {carga.estado === 'datos' && carga.datos.length === 0 && (
          <Vacio
            titulo={
              filtrando ? 'Ningún estudiante coincide con el filtro.' : 'Todavía no hay estudiantes'
            }
            texto={filtrando ? undefined : 'Inscriba al primero con «Nuevo estudiante».'}
          />
        )}
        {carga.estado === 'datos' && carga.datos.length > 0 && (
          <div className="tabla-marco">
            <table className="tabla" data-cy="tabla-estudiantes">
              <thead>
                <tr>
                  <th scope="col">Apellidos</th>
                  <th scope="col">Nombres</th>
                  <th scope="col" className="ocultar-celular">
                    RUDE
                  </th>
                  <th scope="col" className="ocultar-celular">
                    CI
                  </th>
                  <th scope="col">Curso</th>
                  <th scope="col" className="acciones">
                    <span className="solo-lector">Acciones</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {carga.datos.map((e) => (
                  <tr key={e.id} data-cy="fila-estudiante">
                    <th scope="row">
                      <strong>{e.apellidos}</strong>
                    </th>
                    <td>{e.nombres}</td>
                    <td className="ocultar-celular" style={{ fontVariantNumeric: 'tabular-nums' }}>
                      <span className="insignia insignia-plomo">{e.codigoRude}</span>
                    </td>
                    <td className="ocultar-celular" data-cy="estudiante-ci-celda">
                      {e.ci ?? '—'}
                    </td>
                    <td>
                      <span className="insignia insignia-curso">{e.curso.nombre}</span>
                    </td>
                    <td className="acciones">
                      <button
                        type="button"
                        className="boton-icono"
                        data-cy="btn-editar-estudiante"
                        aria-label={`Editar a ${e.apellidos}, ${e.nombres}`}
                        onClick={(ev) => {
                          ev.stopPropagation();
                          abrir({
                            id: e.id,
                            cursoId: e.curso.id,
                            codigoRude: e.codigoRude,
                            ci: e.ci ?? '',
                            nombres: e.nombres,
                            apellidos: e.apellidos,
                          });
                        }}
                      >
                        <Icono nombre="lapiz" tam={18} />
                      </button>
                      <button
                        type="button"
                        className="boton-icono peligro"
                        data-cy="btn-eliminar-estudiante"
                        aria-label={`Eliminar a ${e.apellidos}, ${e.nombres}`}
                        onClick={(ev) => {
                          ev.stopPropagation();
                          setErrorPagina(null);
                          setABorrar(e);
                        }}
                      >
                        <Icono nombre="basura" tam={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {form && (
        <Dialogo
          titulo={form.id ? 'Editar estudiante' : 'Nuevo estudiante'}
          alCerrar={() => setForm(null)}
        >
          <form
            data-cy="form-estudiante"
            onSubmit={(e) => void guardar(e)}
            style={{ display: 'contents' }}
            noValidate
          >
            {errorForm && (
              <Aviso tipo="error" cy="form-error-api">
                {errorForm}
              </Aviso>
            )}
            <div className="dialogo-campos">
              <Campo etiqueta="Apellidos" error={errores.apellidos}>
                <input
                  data-cy="estudiante-apellidos"
                  value={form.apellidos}
                  maxLength={80}
                  aria-invalid={!!errores.apellidos}
                  onChange={(e) => setForm({ ...form, apellidos: e.target.value })}
                />
              </Campo>
              <Campo etiqueta="Nombres" error={errores.nombres}>
                <input
                  data-cy="estudiante-nombres"
                  value={form.nombres}
                  maxLength={80}
                  aria-invalid={!!errores.nombres}
                  onChange={(e) => setForm({ ...form, nombres: e.target.value })}
                />
              </Campo>
              <Campo
                etiqueta="Código RUDE"
                error={errores.codigoRude}
                ayuda="Registro Único de Estudiantes"
              >
                <input
                  data-cy="estudiante-rude"
                  value={form.codigoRude}
                  maxLength={20}
                  inputMode="text"
                  autoCapitalize="characters"
                  aria-invalid={!!errores.codigoRude}
                  onChange={(e) => setForm({ ...form, codigoRude: e.target.value.toUpperCase() })}
                />
              </Campo>
              <Campo
                etiqueta="Cédula de identidad (CI)"
                error={errores.ci}
                ayuda="Opcional. Ej.: 7654321 o 7654321 LP"
              >
                <input
                  data-cy="estudiante-ci"
                  value={form.ci}
                  maxLength={15}
                  autoCapitalize="characters"
                  aria-invalid={!!errores.ci}
                  onChange={(e) => setForm({ ...form, ci: e.target.value.toUpperCase() })}
                />
              </Campo>
              <Campo etiqueta="Curso" error={errores.cursoId}>
                <select
                  data-cy="estudiante-curso"
                  value={form.cursoId || ''}
                  aria-invalid={!!errores.cursoId}
                  onChange={(e) => setForm({ ...form, cursoId: Number(e.target.value) })}
                >
                  <option value="">Seleccione un curso</option>
                  {listaCursos.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nombre}
                    </option>
                  ))}
                </select>
              </Campo>
            </div>
            <div className="dialogo-acciones">
              <button
                type="button"
                className="boton boton-secundario"
                data-cy="btn-cancelar"
                onClick={() => setForm(null)}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="boton boton-primario"
                data-cy="btn-guardar-estudiante"
                disabled={guardando}
              >
                {guardando ? 'Guardando…' : 'Guardar estudiante'}
              </button>
            </div>
          </form>
        </Dialogo>
      )}

      {aBorrar && (
        <ConfirmarBorrado
          titulo="¿Eliminar este estudiante?"
          alConfirmar={() => void borrar()}
          alCerrar={() => setABorrar(null)}
          borrando={borrando}
        >
          Se eliminará a{' '}
          <strong>
            {aBorrar.apellidos}, {aBorrar.nombres}
          </strong>
          .{/* Burbuja preventiva de impacto académico */}
          <span
            className="burbuja-impacto-advertencia"
            style={{
              display: 'flex',
              gap: 10,
              alignItems: 'flex-start',
              backgroundColor: '#fff1f2',
              border: '1px solid #fecdd3',
              borderRadius: 8,
              padding: '12px 14px',
              marginTop: 12,
              fontSize: 13,
              color: '#9f1239',
              lineHeight: 1.4,
              textAlign: 'left',
            }}
          >
            <Icono nombre="escudo" tam={20} />
            <span>
              <strong style={{ display: 'block', marginBottom: 2 }}>
                Advertencia de Impacto Académico (Técnica de Burbuja)
              </strong>
              Eliminar a este estudiante desvinculará sus registros y calificaciones en los cursos
              de la gestión. Realice esta operación únicamente en caso de error de registro inicial.
            </span>
          </span>
        </ConfirmarBorrado>
      )}
    </>
  );
}
