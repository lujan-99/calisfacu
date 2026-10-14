import { Link, useParams, useSearchParams } from 'react-router-dom';
import { Cargando, ErrorCarga, Vacio } from '../../componentes/Estados';
import { Icono } from '../../componentes/Icono';
import {
  listarDimensiones,
  listarTrimestres,
  notasTrimestrales,
  obtenerMateria,
  type Dimension,
  type NotaTrimestral,
} from '../../lib/api';
import { formatoNumero, nombreTrimestre } from '../../lib/formato';
import { useCarga } from '../../lib/useCarga';
import { trimestrePorDefecto } from './MateriaActividades';

/** "Pendiente: falta Saber y Hacer" con los nombres de las dimensiones (decisión D4). */
export function textoPendiente(pendientes: string[], dimensiones: Dimension[]): string {
  const nombres = pendientes.map((c) => dimensiones.find((d) => d.codigo === c)?.nombre ?? c);
  const lista =
    nombres.length > 1
      ? `${nombres.slice(0, -1).join(', ')} y ${nombres[nombres.length - 1]}`
      : nombres[0];
  return `Pendiente: falta ${lista}`;
}

function Estado({ fila, dimensiones }: { fila: NotaTrimestral; dimensiones: Dimension[] }) {
  if (fila.nota === null) {
    return (
      <span className="insignia insignia-neutra" data-cy="estado-nota">
        <Icono nombre="reloj" tam={14} />
        {textoPendiente(fila.pendientes, dimensiones)}
      </span>
    );
  }
  return fila.aprobado ? (
    <span className="insignia insignia-exito" data-cy="estado-nota">
      <Icono nombre="check" tam={14} />
      Aprueba
    </span>
  ) : (
    <span className="insignia insignia-error" data-cy="estado-nota">
      <Icono nombre="cruz" tam={14} />
      Reprueba
    </span>
  );
}

/**
 * Nota trimestral y estado de cada estudiante (US-02, T-024). La web no calcula nada: muestra los puntos y la nota que
 * calcula la API con aritmética decimal (ADR-0004). Las columnas salen de las dimensiones de la gestión.
 */
export function NotasTrimestre() {
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

  const { carga: notas, recargar } = useCarga(
    () => (trimestre ? notasTrimestrales(materiaId, trimestre.id) : Promise.resolve([])),
    [materiaId, trimestre?.id],
  );

  if (base.estado === 'cargando') return <Cargando texto="Cargando…" />;
  if (base.estado === 'error')
    return <ErrorCarga mensaje={base.mensaje} reintentar={recargarBase} />;
  const { materia, trimestres, dimensiones } = base.datos;
  const listaNotas = notas.estado === 'datos' ? notas.datos : [];
  const aprobados = listaNotas.filter((n) => n.aprobado === true).length;
  const reprobados = listaNotas.filter((n) => n.aprobado === false).length;
  const pendientes = listaNotas.filter((n) => n.nota === null).length;

  return (
    <>
      {/* Banner Hero Institucional de Notas Trimestrales (US-02) */}
      <section className="hero-rol hero-profesor" aria-label="Resumen de notas trimestrales">
        <div className="hero-rol-contenido">
          <div className="hero-rol-insignia">
            <Icono nombre="tabla" tam={16} />
            <span>Cálculo Automático de Promedios · RM 001/2026</span>
          </div>
          <h2>{trimestre ? nombreTrimestre(trimestre.numero) : 'Notas del Trimestre'}</h2>
          <p>
            Cálculo centralizado con aritmética decimal oficial según ponderación ministerial: Ser
            (10 pts), Saber (45 pts), Hacer (40 pts) y Autoevaluación (5 pts). Nota mínima de
            aprobación: 51 puntos.
          </p>
        </div>
        <div className="hero-rol-metricas">
          <div className="hero-metrica-tarjeta">
            <span className="hero-metrica-numero">{listaNotas.length}</span>
            <span className="hero-metrica-etiqueta">Estudiantes</span>
          </div>
          <div className="hero-metrica-tarjeta">
            <span className="hero-metrica-numero">{aprobados}</span>
            <span className="hero-metrica-etiqueta">Aprobados (≥ 51)</span>
          </div>
          <div className="hero-metrica-tarjeta">
            <span className="hero-metrica-numero">{reprobados}</span>
            <span className="hero-metrica-etiqueta">Reprobados (&lt; 51)</span>
          </div>
          <div className="hero-metrica-tarjeta">
            <span className="hero-metrica-numero">{pendientes}</span>
            <span className="hero-metrica-etiqueta">Pendientes</span>
          </div>
        </div>
      </section>

      <div className="titulo-pagina">
        <div>
          <Link
            to={`/profesor/materias/${materiaId}${trimestre ? `?trimestre=${trimestre.id}` : ''}`}
            className="volver"
            data-cy="link-volver"
          >
            <Icono nombre="flechaIzq" tam={16} />
            {materia.nombre} · actividades
          </Link>
          <h1>Notas del trimestre</h1>
          <span className="subtitulo">
            {materia.nombre} · {materia.curso.nombre} · Gestión {materia.gestion.anio}
          </span>
        </div>
        <label className="campo" style={{ minWidth: 200 }}>
          Trimestre
          <select
            data-cy="select-trimestre"
            value={trimestre?.id ?? ''}
            onChange={(e) => setParametros({ trimestre: e.target.value }, { replace: true })}
          >
            {trimestres.map((t) => (
              <option key={t.id} value={t.id}>
                {nombreTrimestre(t.numero)}
              </option>
            ))}
          </select>
        </label>
      </div>
      <p className="ayuda">
        Puntos de cada dimensión calculados por el sistema con las actividades registradas. Se
        aprueba con 51 o más.
      </p>

      {notas.estado === 'cargando' && <Cargando texto="Cargando notas…" filas={6} alto={44} />}
      {notas.estado === 'error' && (
        <ErrorCarga
          cy="notas-trimestre-error"
          mensaje={`No se pudieron cargar las notas del trimestre. ${notas.mensaje}`}
          reintentar={recargar}
        />
      )}
      {notas.estado === 'datos' && notas.datos.length === 0 && (
        <Vacio titulo="El curso todavía no tiene estudiantes" />
      )}
      {notas.estado === 'datos' && notas.datos.length > 0 && (
        <div className="tabla-marco">
          <table className="tabla" data-cy="tabla-notas-trimestre">
            <caption className="solo-lector">
              Notas del {trimestre && nombreTrimestre(trimestre.numero)}
            </caption>
            <thead>
              <tr>
                <th scope="col">Estudiante</th>
                {dimensiones.map((d) => (
                  <th key={d.id} scope="col" className="numero">
                    {d.nombre.length > 8 ? `${d.nombre.slice(0, 6)}.` : d.nombre}
                    <br />
                    <small style={{ fontWeight: 400 }}>/ {d.puntajeMaximo}</small>
                  </th>
                ))}
                <th scope="col" className="numero">
                  <strong style={{ color: 'var(--texto)' }}>Nota</strong>
                  <br />
                  <small style={{ fontWeight: 400 }}>/ 100</small>
                </th>
                <th scope="col">Estado</th>
              </tr>
            </thead>
            <tbody>
              {notas.datos.map((f) => (
                <tr key={f.estudianteId} data-cy="fila-nota-trimestre">
                  <th scope="row">{f.estudiante}</th>
                  {dimensiones.map((d) => {
                    const puntos = f.dimensiones.find((x) => x.codigo === d.codigo)?.puntos ?? null;
                    return (
                      <td key={d.id} className="numero">
                        {puntos === null ? '—' : formatoNumero(puntos)}
                      </td>
                    );
                  })}
                  <td className="numero nota-celda-final">{f.nota ?? '—'}</td>
                  <td>
                    <Estado fila={f} dimensiones={dimensiones} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
