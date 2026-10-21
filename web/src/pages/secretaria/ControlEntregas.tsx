import { useMemo, useState } from 'react';
import { Cargando, ErrorCarga, Vacio } from '../../componentes/Estados';
import { Icono } from '../../componentes/Icono';
import {
  listarCursos,
  listarGestiones,
  listarTrimestres,
  obtenerControlEntregas,
} from '../../lib/api';
import { agruparEntregasPorCurso, calcularEstadisticasGenerales } from '../../lib/controlEntregas';
import { formatoFecha, nombreTrimestre } from '../../lib/formato';
import { useCarga } from '../../lib/useCarga';
import { trimestrePorDefecto } from '../profesor/MateriaActividades';

/**
 * Pantalla de Control de Entrega de Notas para Secretaría (US-10, T-040).
 * Criterio 1: Dado un trimestre en curso, la secretaria ve por curso cada materia con su profesor y su estado Entregado o Pendiente.
 */
export function ControlEntregas() {
  const [trimestreIdSeleccionado, setTrimestreIdSeleccionado] = useState<number | null>(null);
  const [cursoFiltro, setCursoFiltro] = useState<string>('TODOS');
  const [estadoFiltro, setEstadoFiltro] = useState<'TODOS' | 'PENDIENTE' | 'ENTREGADO'>('TODOS');
  const [terminoBusqueda, setTerminoBusqueda] = useState<string>('');

  // Cargar gestiones, trimestres, cursos y entregas de forma atómica
  const { carga, recargar } = useCarga(async () => {
    const gestiones = await listarGestiones();
    const gestionActiva = gestiones[0];
    if (!gestionActiva) {
      return { gestionActiva: null, trimestres: [], cursos: [], entregas: [] };
    }
    const [trimestres, cursos] = await Promise.all([
      listarTrimestres(gestionActiva.id),
      listarCursos({ gestionId: gestionActiva.id }),
    ]);
    const trimestreDefecto = trimestrePorDefecto(trimestres) ?? trimestres[0];
    const tId = trimestreIdSeleccionado ?? trimestreDefecto?.id;
    const entregas = tId ? await obtenerControlEntregas(gestionActiva.id, tId) : [];
    return { gestionActiva, trimestres, cursos, entregas };
  }, [trimestreIdSeleccionado]);

  const datos = carga.estado === 'datos' ? carga.datos : null;
  const listaEntregas = datos?.entregas ?? [];
  const trimestres = datos?.trimestres ?? [];
  const cursos = datos?.cursos ?? [];
  const gestionActiva = datos?.gestionActiva ?? null;
  const trimestreActivo =
    trimestres.find((t) => t.id === trimestreIdSeleccionado) ??
    trimestrePorDefecto(trimestres) ??
    trimestres[0] ??
    null;

  // Filtrar entregas según controles del usuario
  const entregasFiltradas = useMemo(() => {
    return listaEntregas.filter((item) => {
      // Filtro de curso
      if (cursoFiltro !== 'TODOS' && String(item.cursoId) !== cursoFiltro) {
        return false;
      }
      // Filtro de estado
      if (estadoFiltro !== 'TODOS' && item.estado !== estadoFiltro) {
        return false;
      }
      // Filtro de búsqueda (profesor o materia)
      if (terminoBusqueda.trim() !== '') {
        const query = terminoBusqueda.toLowerCase();
        const coincideMateria = item.materia.toLowerCase().includes(query);
        const coincideProfesor = item.profesor.toLowerCase().includes(query);
        if (!coincideMateria && !coincideProfesor) {
          return false;
        }
      }
      return true;
    });
  }, [listaEntregas, cursoFiltro, estadoFiltro, terminoBusqueda]);

  // Métricas globales y agrupadas por curso
  const estadisticas = useMemo(() => calcularEstadisticasGenerales(listaEntregas), [listaEntregas]);

  const cursosAgrupados = useMemo(
    () => agruparEntregasPorCurso(entregasFiltradas),
    [entregasFiltradas],
  );

  if (carga.estado === 'cargando') {
    return (
      <Cargando texto="Cargando control de entregas de notas por curso…" filas={6} alto={48} />
    );
  }

  if (carga.estado === 'error') {
    return (
      <ErrorCarga
        cy="error-control-entregas"
        mensaje={`No se pudo obtener el control de entregas. ${carga.mensaje}`}
        reintentar={recargar}
      />
    );
  }

  return (
    <>
      {/* Hero Institucional de Control de Entregas (US-10) */}
      <section
        className="hero-rol hero-secretaria"
        aria-label="Control de Entrega de Calificaciones"
      >
        <div className="hero-rol-contenido">
          <div className="hero-rol-insignia">
            <Icono nombre="portapapeles" tam={16} />
            <span>Seguimiento Docente · RM 001/2026 · US-10</span>
          </div>
          <h2>Control de Entrega de Notas por Curso</h2>
          <p>
            Monitoreo en tiempo real del registro y entrega oficial de calificaciones por materia y
            profesor para asegurar la centralización oportuna antes del cierre del trimestre.
          </p>
        </div>
        <div className="hero-rol-metricas">
          <div className="hero-metrica-tarjeta">
            <span className="hero-metrica-numero">{estadisticas.totalMaterias}</span>
            <span className="hero-metrica-etiqueta">Materias totales</span>
          </div>
          <div className="hero-metrica-tarjeta">
            <span className="hero-metrica-numero" style={{ color: '#16a34a' }}>
              {estadisticas.entregadas}
            </span>
            <span className="hero-metrica-etiqueta">Entregadas</span>
          </div>
          <div className="hero-metrica-tarjeta">
            <span className="hero-metrica-numero" style={{ color: '#ca8a04' }}>
              {estadisticas.pendientes}
            </span>
            <span className="hero-metrica-etiqueta">Pendientes de entrega</span>
          </div>
          <div className="hero-metrica-tarjeta">
            <span className="hero-metrica-numero">
              {estadisticas.porcentajeGlobal.toFixed(1)} %
            </span>
            <span className="hero-metrica-etiqueta">Cumplimiento institucional</span>
          </div>
        </div>
      </section>

      {/* Cabecera y selectores de trimestre */}
      <div className="titulo-pagina">
        <div>
          <h1 data-cy="titulo-control-entregas">Control de Entrega de Notas</h1>
          <span className="subtitulo">
            Gestión {gestionActiva?.anio ?? 2026} ·{' '}
            {trimestreActivo ? nombreTrimestre(trimestreActivo.numero) : 'Trimestre'}
          </span>
        </div>

        {/* Selector de Trimestre */}
        <label className="campo" style={{ minWidth: 220 }}>
          Trimestre a evaluar
          <select
            data-cy="select-trimestre-entregas"
            aria-label="Seleccionar trimestre"
            value={trimestreActivo?.id ?? ''}
            onChange={(e) => setTrimestreIdSeleccionado(Number(e.target.value))}
          >
            {trimestres.map((t) => (
              <option key={t.id} value={t.id}>
                {nombreTrimestre(t.numero)} {t.cerrado ? '(Cerrado)' : '(En curso)'}
              </option>
            ))}
          </select>
        </label>
      </div>

      {/* Barra de Filtros */}
      <div
        className="tarjeta"
        style={{
          padding: '16px 20px',
          marginBottom: 24,
          display: 'flex',
          flexWrap: 'wrap',
          gap: 16,
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <label className="campo" style={{ marginBottom: 0, minWidth: 180 }}>
            Curso
            <select
              data-cy="filtro-curso"
              aria-label="Filtrar por curso"
              value={cursoFiltro}
              onChange={(e) => setCursoFiltro(e.target.value)}
            >
              <option value="TODOS">Todos los cursos</option>
              {cursos.map((c) => (
                <option key={c.id} value={String(c.id)}>
                  {c.nombre}
                </option>
              ))}
            </select>
          </label>

          <label className="campo" style={{ marginBottom: 0, minWidth: 160 }}>
            Estado de entrega
            <select
              data-cy="filtro-estado"
              aria-label="Filtrar por estado"
              value={estadoFiltro}
              onChange={(e) =>
                setEstadoFiltro(e.target.value as 'TODOS' | 'PENDIENTE' | 'ENTREGADO')
              }
            >
              <option value="TODOS">Todos los estados</option>
              <option value="PENDIENTE">Solo pendientes</option>
              <option value="ENTREGADO">Solo entregadas</option>
            </select>
          </label>
        </div>

        <div style={{ minWidth: 260 }}>
          <label className="campo" style={{ marginBottom: 0 }}>
            Buscar materia o profesor
            <input
              type="search"
              data-cy="input-buscar-entrega"
              className="campo-input"
              placeholder="Ej: Matemática, Carlos Lujan…"
              value={terminoBusqueda}
              onChange={(e) => setTerminoBusqueda(e.target.value)}
            />
          </label>
        </div>
      </div>

      {/* Contenido de Entregas */}
      {cursosAgrupados.length === 0 && (
        <Vacio
          titulo="No se encontraron materias"
          descripcion="No hay materias que coincidan con los filtros aplicados para este trimestre."
        />
      )}

      {cursosAgrupados.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {cursosAgrupados.map((resumen) => (
            <div
              key={resumen.cursoId}
              className="tarjeta"
              data-cy={`seccion-curso-${resumen.cursoId}`}
              style={{ padding: 20 }}
            >
              {/* Encabezado del Curso */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: 12,
                  marginBottom: 16,
                  borderBottom: '1px solid var(--borde)',
                  paddingBottom: 12,
                }}
              >
                <div>
                  <h3 style={{ margin: 0, fontSize: 18 }}>{resumen.curso}</h3>
                  <span style={{ fontSize: 13, color: 'var(--texto-2)' }}>
                    {resumen.entregadas} de {resumen.totalMaterias} materias entregadas
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div
                    style={{
                      width: 140,
                      height: 8,
                      backgroundColor: 'var(--fondo-2)',
                      borderRadius: 4,
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        width: `${resumen.porcentajeCumplimiento}%`,
                        height: '100%',
                        backgroundColor:
                          resumen.porcentajeCumplimiento === 100 ? '#16a34a' : 'var(--primario)',
                      }}
                    />
                  </div>
                  <span
                    className={`insignia ${
                      resumen.porcentajeCumplimiento === 100
                        ? 'insignia-exito'
                        : 'insignia-advertencia'
                    }`}
                  >
                    {resumen.porcentajeCumplimiento.toFixed(1)} %
                  </span>
                </div>
              </div>

              {/* Tabla de Materias del Curso */}
              <div className="tabla-marco">
                <table className="tabla" data-cy={`tabla-entregas-curso-${resumen.cursoId}`}>
                  <caption className="solo-lector">
                    Materias y profesores de {resumen.curso}
                  </caption>
                  <thead>
                    <tr>
                      <th scope="col">Materia</th>
                      <th scope="col">Profesor asignado</th>
                      <th scope="col" className="numero">
                        Actividades
                      </th>
                      <th scope="col" className="numero">
                        Notas registradas
                      </th>
                      <th scope="col" style={{ textAlign: 'center' }}>
                        Estado
                      </th>
                      <th scope="col">Fecha de entrega</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resumen.materias.map((m) => (
                      <tr key={m.materiaId} data-cy="fila-entrega-materia">
                        <td style={{ fontWeight: 600 }}>{m.materia}</td>
                        <td data-cy="profesor-nombre">{m.profesor}</td>
                        <td className="numero">{m.totalActividades}</td>
                        <td className="numero">
                          <span
                            style={{
                              color: m.notasFaltantes > 0 ? '#b91c1c' : '#166534',
                              fontWeight: 600,
                            }}
                          >
                            {m.totalNotasRegistradas} / {m.totalNotasRequeridas}
                          </span>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          {m.estado === 'ENTREGADO' ? (
                            <span
                              className="insignia insignia-exito"
                              data-cy="badge-entregado"
                              style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
                            >
                              <Icono nombre="check" tam={14} />
                              Entregado
                            </span>
                          ) : (
                            <span
                              className="insignia insignia-advertencia"
                              data-cy="badge-pendiente"
                              style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
                            >
                              <Icono nombre="reloj" tam={14} />
                              Pendiente
                            </span>
                          )}
                        </td>
                        <td style={{ fontSize: 13, color: 'var(--texto-2)' }}>
                          {m.fechaEntrega ? formatoFecha(m.fechaEntrega) : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
