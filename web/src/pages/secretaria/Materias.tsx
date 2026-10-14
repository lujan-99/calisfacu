import { useState, type FormEvent } from 'react';
import { Campo } from '../../componentes/Campo';
import { ConfirmarBorrado, Dialogo } from '../../componentes/Dialogo';
import { Aviso, Cargando, ErrorCarga, Vacio } from '../../componentes/Estados';
import { Icono } from '../../componentes/Icono';
import {
  actualizarMateria,
  borrarMateria,
  crearMateria,
  listarCursos,
  listarMaterias,
  listarProfesores,
  type Materia,
} from '../../lib/api';
import { useCarga } from '../../lib/useCarga';
import { textoError, useMensaje } from '../../lib/useMensaje';

interface Formulario {
  id?: number;
  cursoId: number;
  nombre: string;
  profesorId: number;
}

/** Materias de cada curso con su profesor: una materia tiene un solo profesor (US-18, criterio 2; T-017). */
export function Materias() {
  const { carga: cursos } = useCarga(() => listarCursos({}), []);
  const { carga: profesores } = useCarga(listarProfesores, []);
  const [cursoId, setCursoId] = useState<number | ''>('');
  const { carga, recargar } = useCarga(
    () => listarMaterias({ cursoId: cursoId || undefined }),
    [cursoId],
  );
  const [mensaje, setMensaje] = useMensaje();
  const [form, setForm] = useState<Formulario | null>(null);
  const [errores, setErrores] = useState<Partial<Record<keyof Formulario, string>>>({});
  const [errorForm, setErrorForm] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [aBorrar, setABorrar] = useState<Materia | null>(null);
  const [borrando, setBorrando] = useState(false);
  const [errorPagina, setErrorPagina] = useState<string | null>(null);

  const listaCursos = cursos.estado === 'datos' ? cursos.datos : [];
  const listaProfesores = profesores.estado === 'datos' ? profesores.datos : [];
  const gestion = listaCursos[0]?.gestion.anio;

  async function guardar(ev: FormEvent) {
    ev.preventDefault();
    if (!form) return;
    const e: typeof errores = {};
    if (!form.cursoId) e.cursoId = 'Seleccione un curso';
    if (!form.nombre.trim()) e.nombre = 'Escriba el nombre de la materia';
    if (!form.profesorId) e.profesorId = 'Seleccione un profesor';
    setErrores(e);
    if (Object.keys(e).length > 0) return;
    setGuardando(true);
    setErrorForm(null);
    try {
      const datos = { nombre: form.nombre.trim(), profesorId: form.profesorId };
      const m = form.id
        ? await actualizarMateria(form.id, datos)
        : await crearMateria({ ...datos, cursoId: form.cursoId });
      setForm(null);
      setMensaje(`Se guardó ${m.nombre} de ${m.curso.nombre}`);
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
      await borrarMateria(aBorrar.id);
      setMensaje(`Se eliminó ${aBorrar.nombre} de ${aBorrar.curso.nombre}`);
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
      {/* Banner Hero Institucional de Materias y Asignaciones (US-18) */}
      <section className="hero-rol hero-secretaria" aria-label="Resumen de materias">
        <div className="hero-rol-contenido">
          <div className="hero-rol-insignia">
            <Icono nombre="portapapeles" tam={16} />
            <span>Malla Curricular · Asignaciones Docentes</span>
          </div>
          <h2>Plan de Estudios y Plantel Docente</h2>
          <p>
            Asignación de profesores por curso y materia para la gestión lectiva según la RM
            001/2026.
          </p>
        </div>
        <div className="hero-rol-metricas">
          <div className="hero-metrica-tarjeta">
            <span className="hero-metrica-numero">
              {carga.estado === 'datos' ? carga.datos.length : '—'}
            </span>
            <span className="hero-metrica-etiqueta">Materias activas</span>
          </div>
          <div className="hero-metrica-tarjeta">
            <span className="hero-metrica-numero">{listaProfesores.length}</span>
            <span className="hero-metrica-etiqueta">Profesores disponibles</span>
          </div>
          <div className="hero-metrica-tarjeta">
            <span className="hero-metrica-numero">1:1</span>
            <span className="hero-metrica-etiqueta">Docente por materia</span>
          </div>
        </div>
      </section>

      <div className="titulo-pagina">
        <div>
          <h1>Materias y asignaciones</h1>
          <span className="subtitulo">
            {gestion ? `Gestión ${gestion} · ` : ''}cada materia de un curso tiene un solo profesor.
          </span>
        </div>
        <button
          type="button"
          className="boton boton-primario"
          data-cy="btn-nueva-materia"
          onClick={() => abrir({ cursoId: Number(cursoId) || 0, nombre: '', profesorId: 0 })}
        >
          <Icono nombre="mas" tam={18} />
          Nueva materia
        </button>
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
      </div>

      <section aria-labelledby="titulo-lista">
        <h2 id="titulo-lista" className="solo-lector">
          Lista de materias
        </h2>
        {carga.estado === 'cargando' && <Cargando texto="Cargando materias…" />}
        {carga.estado === 'error' && (
          <ErrorCarga
            mensaje={`No se pudo cargar la lista. ${carga.mensaje}`}
            reintentar={recargar}
          />
        )}
        {carga.estado === 'datos' && carga.datos.length === 0 && (
          <Vacio titulo="Todavía no hay materias" texto="Agregue la primera con «Nueva materia»." />
        )}
        {carga.estado === 'datos' && carga.datos.length > 0 && (
          <div className="tabla-marco">
            <table className="tabla" data-cy="tabla-materias">
              <thead>
                <tr>
                  <th scope="col">Curso</th>
                  <th scope="col">Materia</th>
                  <th scope="col">Profesor asignado</th>
                  <th scope="col" className="acciones">
                    <span className="solo-lector">Acciones</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {carga.datos.map((m) => (
                  <tr key={m.id} data-cy="fila-materia">
                    <td>{m.curso.nombre}</td>
                    <th scope="row">
                      <strong>{m.nombre}</strong>
                    </th>
                    <td>{m.profesor.nombre}</td>
                    <td className="acciones">
                      <button
                        type="button"
                        className="boton-icono"
                        data-cy="btn-editar-materia"
                        aria-label={`Editar ${m.nombre} de ${m.curso.nombre}`}
                        onClick={() =>
                          abrir({
                            id: m.id,
                            cursoId: m.curso.id,
                            nombre: m.nombre,
                            profesorId: m.profesor.id,
                          })
                        }
                      >
                        <Icono nombre="lapiz" tam={18} />
                      </button>
                      <button
                        type="button"
                        className="boton-icono peligro"
                        data-cy="btn-eliminar-materia"
                        aria-label={`Eliminar ${m.nombre} de ${m.curso.nombre}`}
                        onClick={() => {
                          setErrorPagina(null);
                          setABorrar(m);
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
          titulo={form.id ? 'Editar materia' : 'Nueva materia'}
          alCerrar={() => setForm(null)}
        >
          <form
            data-cy="form-materia"
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
              <Campo etiqueta="Curso" error={errores.cursoId}>
                <select
                  data-cy="materia-curso"
                  value={form.cursoId || ''}
                  disabled={!!form.id}
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
              <Campo etiqueta="Nombre de la materia" error={errores.nombre}>
                <input
                  data-cy="materia-nombre"
                  value={form.nombre}
                  maxLength={80}
                  aria-invalid={!!errores.nombre}
                  onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                />
              </Campo>
            </div>
            <Campo
              etiqueta="Profesor"
              error={errores.profesorId}
              ayuda="Solo aparecen usuarios con rol Profesor."
            >
              <select
                data-cy="materia-profesor"
                value={form.profesorId || ''}
                aria-invalid={!!errores.profesorId}
                onChange={(e) => setForm({ ...form, profesorId: Number(e.target.value) })}
              >
                <option value="">Seleccione un profesor</option>
                {listaProfesores.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre}
                  </option>
                ))}
              </select>
            </Campo>
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
                data-cy="btn-guardar-materia"
                disabled={guardando}
              >
                {guardando ? 'Guardando…' : 'Guardar materia'}
              </button>
            </div>
          </form>
        </Dialogo>
      )}

      {aBorrar && (
        <ConfirmarBorrado
          titulo="¿Eliminar esta materia?"
          alConfirmar={() => void borrar()}
          alCerrar={() => setABorrar(null)}
          borrando={borrando}
        >
          Se eliminará <strong>{aBorrar.nombre}</strong> de {aBorrar.curso.nombre} y su asignación.
        </ConfirmarBorrado>
      )}
    </>
  );
}
