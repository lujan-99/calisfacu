import { useState, type FormEvent } from 'react';
import { ConfirmarBorrado, Dialogo } from '../../componentes/Dialogo';
import { Aviso, Cargando, ErrorCarga, Vacio } from '../../componentes/Estados';
import { Icono } from '../../componentes/Icono';
import {
  actualizarCurso,
  borrarCurso,
  crearCurso,
  ErrorApi,
  listarCursos,
  listarGestiones,
  type Curso,
  type Nivel,
} from '../../lib/api';
import { NIVELES, nombreNivel } from '../../lib/formato';
import { useCarga } from '../../lib/useCarga';
import { textoError, useMensaje } from '../../lib/useMensaje';

interface Formulario {
  id?: number;
  gestionId: number;
  nivel: Nivel;
  anioEscolaridad: number;
  paralelo: string;
}

/** Cursos de una gestión: nivel + año + paralelo (US-18, criterio 1; T-017). */
export function Cursos() {
  const { carga: gestiones } = useCarga(listarGestiones, []);
  const [gestionId, setGestionId] = useState<number | undefined>();
  const [nivel, setNivel] = useState<Nivel | ''>('');
  const gestionActual =
    gestionId ?? (gestiones.estado === 'datos' ? gestiones.datos[0]?.id : undefined);
  const { carga, recargar } = useCarga(
    () => listarCursos({ gestionId: gestionActual, nivel: nivel || undefined }),
    [gestionActual, nivel],
  );
  const [mensaje, setMensaje] = useMensaje();
  const [form, setForm] = useState<Formulario | null>(null);
  const [errorForm, setErrorForm] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [aBorrar, setABorrar] = useState<Curso | null>(null);
  const [borrando, setBorrando] = useState(false);
  const [errorPagina, setErrorPagina] = useState<string | null>(null);

  const anios = NIVELES.find((n) => n.valor === form?.nivel)?.anios ?? 6;

  async function guardar(e: FormEvent) {
    e.preventDefault();
    if (!form) return;
    setGuardando(true);
    setErrorForm(null);
    const datos = {
      nivel: form.nivel,
      anioEscolaridad: form.anioEscolaridad,
      paralelo: form.paralelo,
    };
    try {
      const curso = form.id
        ? await actualizarCurso(form.id, datos)
        : await crearCurso({ ...datos, gestionId: form.gestionId });
      setForm(null);
      setMensaje(`Se guardó el curso ${curso.nombre}`);
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
      await borrarCurso(aBorrar.id);
      setMensaje(`Se eliminó el curso ${aBorrar.nombre}`);
      recargar();
    } catch (err) {
      setErrorPagina(
        err instanceof ErrorApi && err.estado === 403
          ? 'No tiene permiso para esta operación'
          : textoError(err),
      );
    } finally {
      setBorrando(false);
      setABorrar(null);
    }
  }

  return (
    <>
      {/* Banner de bienvenida de secretaría */}
      <section className="hero-rol hero-secretaria" aria-label="Resumen de secretaría">
        <div className="hero-rol-contenido">
          <div className="hero-rol-insignia">
            <Icono nombre="edificio" tam={16} />
            <span>Panel de Gestión Académica · Secretaría</span>
          </div>
          <h2>Administración de Cursos y Estudiantes</h2>
          <p>
            Configuración de la estructura escolar, control de paralelos, materias y asignaciones
            docentes de la gestión educativa.
          </p>
        </div>
        <div className="hero-rol-metricas">
          <div className="hero-metrica-tarjeta">
            <span className="hero-metrica-numero">
              {carga.estado === 'datos' ? carga.datos.length : '—'}
            </span>
            <span className="hero-metrica-etiqueta">Cursos en gestión</span>
          </div>
          <div className="hero-metrica-tarjeta">
            <span className="hero-metrica-numero">3</span>
            <span className="hero-metrica-etiqueta">Niveles educativos</span>
          </div>
          <div className="hero-metrica-tarjeta">
            <span className="hero-metrica-numero">RUDE</span>
            <span className="hero-metrica-etiqueta">Inscripción única</span>
          </div>
        </div>
      </section>

      <div className="titulo-pagina">
        <div>
          <h1>Cursos</h1>
          <span className="subtitulo">
            Cada curso es nivel + año de escolaridad + paralelo, dentro de una gestión.
          </span>
        </div>
        <button
          type="button"
          className="boton boton-primario"
          data-cy="btn-nuevo-curso"
          disabled={!gestionActual}
          onClick={() => {
            setErrorForm(null);
            setForm({
              gestionId: gestionActual ?? 0,
              nivel: 'SECUNDARIA',
              anioEscolaridad: 1,
              paralelo: 'A',
            });
          }}
        >
          <Icono nombre="mas" tam={18} />
          Nuevo curso
        </button>
      </div>
      {mensaje && (
        <Aviso tipo="exito" cy="mensaje-exito">
          {mensaje}
        </Aviso>
      )}
      {errorPagina && (
        <Aviso tipo="error" cy="aviso-sin-permiso">
          {errorPagina}
        </Aviso>
      )}

      <div className="filtros">
        <label className="campo">
          Gestión
          <select
            data-cy="filtro-gestion"
            value={gestionActual ?? ''}
            onChange={(e) => setGestionId(Number(e.target.value))}
          >
            {gestiones.estado === 'datos' &&
              gestiones.datos.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.anio}
                </option>
              ))}
          </select>
        </label>
        <label className="campo">
          Nivel
          <select
            data-cy="filtro-nivel"
            value={nivel}
            onChange={(e) => setNivel(e.target.value as Nivel | '')}
          >
            <option value="">Todos</option>
            {NIVELES.map((n) => (
              <option key={n.valor} value={n.valor}>
                {n.nombre}
              </option>
            ))}
          </select>
        </label>
      </div>

      <section aria-labelledby="titulo-lista">
        <h2 id="titulo-lista" className="solo-lector">
          Lista de cursos
        </h2>
        {carga.estado === 'cargando' && <Cargando texto="Cargando cursos…" />}
        {carga.estado === 'error' && (
          <ErrorCarga
            mensaje={`No se pudo cargar la lista. ${carga.mensaje}`}
            reintentar={recargar}
          />
        )}
        {carga.estado === 'datos' && carga.datos.length === 0 && (
          <Vacio
            titulo={nivel ? 'Ningún curso coincide con el filtro.' : 'Todavía no hay cursos'}
            texto={nivel ? undefined : 'Cree el primero con «Nuevo curso».'}
          />
        )}
        {carga.estado === 'datos' && carga.datos.length > 0 && (
          <div className="tabla-marco">
            <table className="tabla" data-cy="tabla-cursos">
              <thead>
                <tr>
                  <th scope="col" className="ocultar-celular">
                    Gestión
                  </th>
                  <th scope="col">Nivel</th>
                  <th scope="col">Año de escolaridad</th>
                  <th scope="col">Paralelo</th>
                  <th scope="col" className="acciones">
                    <span className="solo-lector">Acciones</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {carga.datos.map((c) => (
                  <tr key={c.id} data-cy="fila-curso">
                    <td className="ocultar-celular">{c.gestion.anio}</td>
                    <td>{nombreNivel(c.nivel)}</td>
                    <td>{c.anioEscolaridad}.º</td>
                    <td>
                      <strong>{c.paralelo}</strong>
                    </td>
                    <td className="acciones">
                      <button
                        type="button"
                        className="boton-icono"
                        data-cy="btn-editar-curso"
                        aria-label={`Editar ${c.nombre}`}
                        onClick={() => {
                          setErrorForm(null);
                          setForm({
                            id: c.id,
                            gestionId: c.gestion.id,
                            nivel: c.nivel,
                            anioEscolaridad: c.anioEscolaridad,
                            paralelo: c.paralelo,
                          });
                        }}
                      >
                        <Icono nombre="lapiz" tam={18} />
                      </button>
                      <button
                        type="button"
                        className="boton-icono peligro"
                        data-cy="btn-eliminar-curso"
                        aria-label={`Eliminar ${c.nombre}`}
                        onClick={() => {
                          setErrorPagina(null);
                          setABorrar(c);
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
        <Dialogo titulo={form.id ? 'Editar curso' : 'Nuevo curso'} alCerrar={() => setForm(null)}>
          <form
            data-cy="form-curso"
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
              <label className="campo">
                Gestión
                <select
                  data-cy="curso-gestion"
                  value={form.gestionId}
                  disabled={!!form.id}
                  onChange={(e) => setForm({ ...form, gestionId: Number(e.target.value) })}
                >
                  {gestiones.estado === 'datos' &&
                    gestiones.datos.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.anio}
                      </option>
                    ))}
                </select>
              </label>
              <label className="campo">
                Nivel
                <select
                  data-cy="curso-nivel"
                  value={form.nivel}
                  onChange={(e) => {
                    const n = e.target.value as Nivel;
                    const max = NIVELES.find((x) => x.valor === n)?.anios ?? 6;
                    setForm({
                      ...form,
                      nivel: n,
                      anioEscolaridad: Math.min(form.anioEscolaridad, max),
                    });
                  }}
                >
                  {NIVELES.map((n) => (
                    <option key={n.valor} value={n.valor}>
                      {n.nombre}
                    </option>
                  ))}
                </select>
              </label>
              <label className="campo">
                Año de escolaridad
                <select
                  data-cy="curso-anio"
                  value={form.anioEscolaridad}
                  onChange={(e) => setForm({ ...form, anioEscolaridad: Number(e.target.value) })}
                >
                  {Array.from({ length: anios }, (_, i) => (
                    <option key={i + 1} value={i + 1}>
                      {i + 1}.º
                    </option>
                  ))}
                </select>
              </label>
              <label className="campo">
                Paralelo
                <input
                  type="text"
                  data-cy="curso-paralelo"
                  maxLength={2}
                  value={form.paralelo}
                  onChange={(e) => setForm({ ...form, paralelo: e.target.value.toUpperCase() })}
                />
              </label>
            </div>
            <p className="ayuda" style={{ fontSize: 13 }}>
              No puede repetirse la misma combinación de nivel, año y paralelo en una gestión.
              Después podrá asignarle materias y estudiantes.
            </p>
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
                data-cy="btn-guardar-curso"
                disabled={guardando}
              >
                {guardando ? 'Guardando…' : 'Guardar curso'}
              </button>
            </div>
          </form>
        </Dialogo>
      )}

      {aBorrar && (
        <ConfirmarBorrado
          titulo="¿Eliminar este curso?"
          alConfirmar={() => void borrar()}
          alCerrar={() => setABorrar(null)}
          borrando={borrando}
        >
          Se eliminará <strong>{aBorrar.nombre}</strong>.
        </ConfirmarBorrado>
      )}
    </>
  );
}
