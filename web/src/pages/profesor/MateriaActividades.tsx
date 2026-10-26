import { useState, type FormEvent } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { Aviso, Cargando, ErrorCarga } from '../../componentes/Estados';
import { Icono } from '../../componentes/Icono';
import {
  crearActividad,
  listarActividades,
  listarDimensiones,
  listarTrimestres,
  obtenerMateria,
  type Trimestre,
} from '../../lib/api';
import { nombreTrimestre } from '../../lib/formato';
import { useCarga } from '../../lib/useCarga';

const MAX_NOMBRE = 120;

/**
 * El trimestre en curso: la unidad educativa cierra cada trimestre al terminarlo, así que es el primero que sigue
 * abierto. Si ya están todos cerrados, el último.
 */
export function trimestrePorDefecto(trimestres: Trimestre[]): Trimestre | undefined {
  return trimestres.find((t) => !t.cerrado) ?? trimestres[trimestres.length - 1];
}

/** Actividades de una materia por trimestre y dimensión, con su avance de notas (T-020). */
export function MateriaActividades() {
  const materiaId = Number(useParams().materiaId);
  const [parametros, setParametros] = useSearchParams();

  const { carga: base, recargar: recargarBase } = useCarga(async () => {
    const materia = await obtenerMateria(materiaId);
    const [trimestres, dimensiones] = await Promise.all([
      listarTrimestres(materia.gestion.id),
      listarDimensiones(materia.gestion.id),
    ]);
    return { materia, trimestres, dimensiones };
  }, [materiaId]);

  const datos = base.estado === 'datos' ? base.datos : null;
  const trimestre =
    datos?.trimestres.find((t) => t.id === Number(parametros.get('trimestre'))) ??
    (datos ? trimestrePorDefecto(datos.trimestres) : undefined);
  const dimension =
    datos?.dimensiones.find((d) => d.codigo === parametros.get('dimension')) ??
    datos?.dimensiones[0];

  const { carga: lista, recargar: recargarLista } = useCarga(
    () => (trimestre ? listarActividades(materiaId, trimestre.id) : Promise.resolve(null)),
    [materiaId, trimestre?.id],
  );

  const [formAbierto, setFormAbierto] = useState(false);
  const [nombre, setNombre] = useState('');
  const [errorNombre, setErrorNombre] = useState(false);
  const [errorApi, setErrorApi] = useState<string | null>(null);
  const [creando, setCreando] = useState(false);

  function elegir(cambios: Record<string, string>) {
    setParametros({ ...Object.fromEntries(parametros), ...cambios }, { replace: true });
    setFormAbierto(false);
  }

  async function crear(e: FormEvent) {
    e.preventDefault();
    if (!trimestre || !dimension) return;
    if (nombre.trim() === '') {
      setErrorNombre(true);
      return;
    }
    setCreando(true);
    setErrorApi(null);
    try {
      await crearActividad({
        materiaId,
        trimestreId: trimestre.id,
        dimensionId: dimension.id,
        nombre: nombre.trim(),
      });
      setFormAbierto(false);
      setNombre('');
      recargarLista();
    } catch (err) {
      setErrorApi(err instanceof Error ? err.message : 'No se pudo crear la actividad');
    } finally {
      setCreando(false);
    }
  }

  if (base.estado === 'cargando') return <Cargando texto="Cargando la materia…" />;
  if (base.estado === 'error')
    return <ErrorCarga mensaje={base.mensaje} reintentar={recargarBase} />;
  const { materia, trimestres, dimensiones } = base.datos;
  const actividades =
    lista.estado === 'datos' && lista.datos
      ? lista.datos.actividades.filter((a) => a.dimension.id === dimension?.id)
      : [];
  const total = lista.estado === 'datos' && lista.datos ? lista.datos.estudiantes : 0;
  const cerrado = trimestre?.cerrado ?? false;

  return (
    <>
      {/* Banner Hero Institucional de la Materia (US-01/US-18) */}
      <section className="hero-rol hero-profesor" aria-label="Resumen de la materia">
        <div className="hero-rol-contenido">
          <div className="hero-rol-insignia">
            <Icono nombre="libro" tam={16} />
            <span>
              {materia.curso.nombre} · Gestión {materia.gestion.anio}
            </span>
          </div>
          <h2>{materia.nombre}</h2>
          <p>
            Planificación y registro de actividades de evaluación según las dimensiones de la RM
            001/2026.
          </p>
        </div>
        <div className="hero-rol-metricas">
          <div className="hero-metrica-tarjeta">
            <span className="hero-metrica-numero">{total}</span>
            <span className="hero-metrica-etiqueta">Estudiantes en curso</span>
          </div>
          <div className="hero-metrica-tarjeta">
            <span className="hero-metrica-numero">{actividades.length}</span>
            <span className="hero-metrica-etiqueta">Actividades ({dimension?.nombre ?? '—'})</span>
          </div>
          <div className="hero-metrica-tarjeta">
            <span className="hero-metrica-numero">{dimension?.puntajeMaximo ?? 0} pts</span>
            <span className="hero-metrica-etiqueta">Puntaje dimensión</span>
          </div>
        </div>
      </section>

      <div className="titulo-pagina">
        <div>
          <Link to="/profesor/materias" className="volver" data-cy="link-volver-materias">
            <Icono nombre="flechaIzq" tam={16} />
            Mis materias
          </Link>
          <h1>{materia.nombre}</h1>
          <span className="subtitulo">
            {materia.curso.nombre} · Gestión {materia.gestion.anio}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <Link
            to={`/profesor/materias/${materiaId}/asistencia`}
            className="boton boton-secundario"
            data-cy="link-asistencia-materia"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            <Icono nombre="personas" tam={18} />
            Control de asistencia
          </Link>
          <Link
            to={`/profesor/materias/${materiaId}/riesgo`}
            className="boton boton-secundario"
            data-cy="link-panel-riesgo"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            <Icono nombre="alerta" tam={18} />
            Panel de riesgo
          </Link>
          <Link
            to={`/profesor/materias/${materiaId}/boletines`}
            className="boton boton-secundario"
            data-cy="link-generar-boletines"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            <Icono nombre="documento" tam={18} />
            Generar boletines
          </Link>
          {trimestre && (
            <Link
              to={`/profesor/materias/${materiaId}/notas?trimestre=${trimestre.id}`}
              className="boton boton-secundario"
              data-cy="link-notas-trimestre"
            >
              <Icono nombre="tabla" tam={18} />
              Ver notas del trimestre
            </Link>
          )}
        </div>
      </div>

      <div className="segmentos" role="group" aria-label="Trimestre">
        {trimestres.map((t) => (
          <button
            key={t.id}
            type="button"
            className="segmento"
            data-cy={`trimestre-${t.numero}`}
            aria-pressed={t.id === trimestre?.id}
            onClick={() => elegir({ trimestre: String(t.id) })}
          >
            {t.cerrado && <Icono nombre="candado" tam={14} />}
            {nombreTrimestre(t.numero)}
            {t.cerrado && <span className="solo-lector"> (cerrado)</span>}
          </button>
        ))}
      </div>

      {cerrado && trimestre && (
        <Aviso tipo="advertencia" cy="aviso-trimestre-cerrado">
          El {nombreTrimestre(trimestre.numero)} está cerrado. Puede consultar las actividades y sus
          notas, pero no crear actividades ni registrar notas.
        </Aviso>
      )}

      <section className="tarjeta">
        <div className="pestanas" role="tablist" aria-label="Dimensiones de evaluación">
          {dimensiones.map((d) => (
            <button
              key={d.id}
              type="button"
              role="tab"
              className="pestana"
              data-cy={`tab-${d.codigo.toLowerCase()}`}
              aria-selected={d.id === dimension?.id}
              onClick={() => elegir({ dimension: d.codigo })}
            >
              {d.nombre} <small>{d.puntajeMaximo} pts</small>
            </button>
          ))}
        </div>
        <div className="panel" role="tabpanel">
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
            }}
          >
            <h2 style={{ fontSize: 18 }}>Actividades de {dimension?.nombre}</h2>
            <button
              type="button"
              className="boton boton-primario"
              data-cy="btn-nueva-actividad"
              disabled={cerrado || formAbierto}
              onClick={() => {
                setFormAbierto(true);
                setNombre('');
                setErrorNombre(false);
                setErrorApi(null);
              }}
            >
              <Icono nombre="mas" tam={18} />
              Nueva actividad
            </button>
          </div>

          {formAbierto && (
            <form
              aria-label="Nueva actividad"
              data-cy="form-nueva-actividad"
              className="tarjeta panel"
              style={{ background: 'var(--superficie-2)' }}
              onSubmit={(e) => void crear(e)}
              noValidate
            >
              {errorApi && <Aviso tipo="error">{errorApi}</Aviso>}
              <label className="campo">
                Nombre de la actividad
                <input
                  type="text"
                  data-cy="actividad-nombre"
                  maxLength={MAX_NOMBRE}
                  value={nombre}
                  placeholder="Ej. Práctica: funciones cuadráticas"
                  aria-invalid={errorNombre}
                  aria-describedby="nombre-ayuda"
                  autoFocus
                  onChange={(e) => {
                    setNombre(e.target.value);
                    setErrorNombre(false);
                  }}
                />
              </label>
              <div
                id="nombre-ayuda"
                style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}
              >
                {errorNombre ? (
                  <span className="campo-error" data-cy="actividad-nombre-error">
                    Escriba el nombre de la actividad
                  </span>
                ) : (
                  <span className="campo-ayuda">
                    Se creará en {materia.nombre} · {trimestre && nombreTrimestre(trimestre.numero)}{' '}
                    · {dimension?.nombre}
                  </span>
                )}
                <span className="campo-ayuda">
                  {nombre.length}/{MAX_NOMBRE}
                </span>
              </div>
              <div className="dialogo-acciones">
                <button
                  type="button"
                  className="boton boton-secundario"
                  data-cy="btn-cancelar-actividad"
                  onClick={() => setFormAbierto(false)}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="boton boton-primario"
                  data-cy="btn-crear-actividad"
                  disabled={creando}
                >
                  {creando ? 'Creando…' : 'Crear actividad'}
                </button>
              </div>
            </form>
          )}

          {lista.estado === 'cargando' && <Cargando texto="Cargando actividades…" />}
          {lista.estado === 'error' && (
            <ErrorCarga mensaje={lista.mensaje} reintentar={recargarLista} />
          )}
          {lista.estado === 'datos' && actividades.length === 0 && (
            <div className="vacio" data-cy="actividades-vacio" style={{ padding: 32 }}>
              <span className="vacio-texto">
                Todavía no hay actividades de {dimension?.nombre} en este trimestre.
              </span>
            </div>
          )}
          {actividades.length > 0 && (
            <div className="lista-actividades" data-cy="lista-actividades">
              {actividades.map((a) => (
                <Link
                  key={a.id}
                  to={`/profesor/materias/${materiaId}/actividades/${a.id}`}
                  className="actividad"
                  data-cy="actividad-item"
                >
                  <span>{a.nombre}</span>
                  <span className="actividad-conteo">
                    <span className="progreso" aria-hidden="true">
                      <span
                        style={{ width: `${total ? (a.notasRegistradas / total) * 100 : 0}%` }}
                      />
                    </span>
                    <span data-cy="actividad-conteo">
                      {a.notasRegistradas}/{total} notas
                    </span>
                    <Icono nombre="flechaDer" tam={18} />
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
