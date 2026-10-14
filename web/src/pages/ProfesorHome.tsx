import { useState } from 'react';
import { AppShell } from '../components/AppShell';
import type { Sesion } from '../lib/api';
import { ETIQUETA_ROL } from '../lib/constantes';
import { Planilla } from './Planilla';

interface Props {
  sesion: Sesion;
  onSalir: () => void;
}

interface AsignacionCurso {
  id: number;
  actividadId: number;
  nivel: string;
  curso: string;
  paralelo: string;
  materia: string;
  cargadas: number;
  total: number;
  estado: 'enviado' | 'borrador' | 'nuevo';
}

const ASIGNACIONES_DOCENTE: AsignacionCurso[] = [
  {
    id: 1,
    actividadId: 1,
    nivel: 'Secundaria',
    curso: '4° de Secundaria',
    paralelo: 'B',
    materia: 'Matemática',
    cargadas: 22,
    total: 28,
    estado: 'borrador',
  },
  {
    id: 2,
    actividadId: 2,
    nivel: 'Secundaria',
    curso: '4° de Secundaria',
    paralelo: 'A',
    materia: 'Matemática',
    cargadas: 30,
    total: 30,
    estado: 'enviado',
  },
  {
    id: 3,
    actividadId: 3,
    nivel: 'Secundaria',
    curso: '5° de Secundaria',
    paralelo: 'A',
    materia: 'Matemática',
    cargadas: 27,
    total: 27,
    estado: 'enviado',
  },
  {
    id: 4,
    actividadId: 4,
    nivel: 'Secundaria',
    curso: '5° de Secundaria',
    paralelo: 'B',
    materia: 'Física',
    cargadas: 10,
    total: 29,
    estado: 'borrador',
  },
  {
    id: 5,
    actividadId: 5,
    nivel: 'Secundaria',
    curso: '6° de Secundaria',
    paralelo: 'A',
    materia: 'Física',
    cargadas: 0,
    total: 25,
    estado: 'nuevo',
  },
];

/**
 * Pantalla de inicio del rol Profesor — T-012 (US-17 CA 1).
 * Rediseñada fielmente al diseño institucional de alta fidelidad:
 * - Saludo contextual con periodo trimestral activo
 * - Banner de plazo ministerial con fecha límite destacada
 * - 4 KPIs de seguimiento de carga de calificaciones
 * - Tarjetas interactivas de asignaciones de materias y paralelos
 * - Barra de progreso tabular por curso y acceso directo al registro
 * - Columna lateral con avisos de Dirección y calendario de trimestres
 * - Planilla evaluativa totalmente funcional con selector de actividad
 */
export function ProfesorHome({ sesion, onSalir }: Props) {
  const [actividadId, setActividadId] = useState<number>(1);
  const [filtroEstado, setFiltroEstado] = useState<'todas' | 'pendientes' | 'enviadas'>('todas');
  const rol = sesion.usuario.rol;
  const rolEtiqueta = ETIQUETA_ROL[rol] ?? rol;

  // Filtrado de cursos según botón activo
  const cursosFiltrados = ASIGNACIONES_DOCENTE.filter((c) => {
    if (filtroEstado === 'pendientes') return c.estado !== 'enviado';
    if (filtroEstado === 'enviadas') return c.estado === 'enviado';
    return true;
  });

  const totalAsignaciones = ASIGNACIONES_DOCENTE.length;
  const enviadas = ASIGNACIONES_DOCENTE.filter((c) => c.estado === 'enviado').length;
  const enBorrador = ASIGNACIONES_DOCENTE.filter((c) => c.estado === 'borrador').length;
  const sinIniciar = ASIGNACIONES_DOCENTE.filter((c) => c.estado === 'nuevo').length;

  function seleccionarCurso(actId: number) {
    setActividadId(actId);
    const el = document.getElementById('seccion-registro-activa');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  }

  return (
    <AppShell
      nombre={sesion.usuario.nombre}
      rol={rol}
      rolEtiqueta={rolEtiqueta}
      onSalir={onSalir}
      gitCommit={__GIT_COMMIT__}
    >
      <div className="panel-docente-vista">
        {/* Encabezado de bienvenida y alerta de plazo */}
        <div className="encabezado-dashboard-fila">
          <div className="titular-bienvenida-bloque">
            <span className="contexto-gestion-tag">Gestión 2026 · 1.er Trimestre en curso</span>
            <h1 className="titulo-saludo-docente">Buenos días, Prof. {sesion.usuario.nombre}</h1>
          </div>

          <div className="banner-plazo-cierre" role="status">
            <svg
              aria-hidden="true"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            >
              <circle cx="12" cy="12" r="9" />
              <path d="M12 7v5l3 2" />
            </svg>
            <span>
              Cierre de notas del 1.er trimestre: <strong>15 de Mayo de 2026</strong>
            </span>
          </div>
        </div>

        {/* 4 Métricas principales del docente */}
        <div className="grid-metricas-docente">
          <div className="tarjeta-metrica">
            <span className="metrica-etiqueta">Asignaciones</span>
            <span className="metrica-valor-grande">{totalAsignaciones}</span>
            <span className="metrica-detalle">curso · paralelo · materia</span>
          </div>
          <div className="tarjeta-metrica">
            <span className="metrica-etiqueta">Enviadas a Dirección</span>
            <span className="metrica-valor-grande metrica-color-enviada">{enviadas}</span>
            <span className="metrica-detalle">bloqueadas para edición</span>
          </div>
          <div className="tarjeta-metrica">
            <span className="metrica-etiqueta">En borrador</span>
            <span className="metrica-valor-grande metrica-color-borrador">{enBorrador}</span>
            <span className="metrica-detalle">faltan notas por cargar</span>
          </div>
          <div className="tarjeta-metrica">
            <span className="metrica-etiqueta">Sin iniciar</span>
            <span className="metrica-valor-grande">{sinIniciar}</span>
            <span className="metrica-detalle">ninguna nota registrada</span>
          </div>
        </div>

        {/* Contenido dividido: Cursos principales y panel lateral de avisos */}
        <div className="fila-contenido-docente">
          {/* Columna izquierda: Mis cursos y materias */}
          <section aria-labelledby="mis-cursos-titulo" className="seccion-cursos-docente">
            <div className="cabecera-cursos-barra">
              <h2 id="mis-cursos-titulo" className="titulo-seccion-cursos">
                Mis cursos y materias
              </h2>

              <div role="group" aria-label="Filtrar materias" className="grupo-filtros-pills">
                <button
                  type="button"
                  onClick={() => setFiltroEstado('todas')}
                  className={`btn-filtro-pill ${filtroEstado === 'todas' ? 'filtro-activo' : ''}`}
                >
                  Todas
                </button>
                <button
                  type="button"
                  onClick={() => setFiltroEstado('pendientes')}
                  className={`btn-filtro-pill ${filtroEstado === 'pendientes' ? 'filtro-activo' : ''}`}
                >
                  Pendientes
                </button>
                <button
                  type="button"
                  onClick={() => setFiltroEstado('enviadas')}
                  className={`btn-filtro-pill ${filtroEstado === 'enviadas' ? 'filtro-activo' : ''}`}
                >
                  Enviadas
                </button>
              </div>
            </div>

            {/* Cuadrícula de tarjetas de asignaciones */}
            <div className="grid-tarjetas-asignaciones">
              {cursosFiltrados.map((curso) => {
                const porcentaje = Math.round((curso.cargadas / curso.total) * 100);
                const esEnviado = curso.estado === 'enviado';
                const esBorrador = curso.estado === 'borrador';
                const esSeleccionado = actividadId === curso.actividadId;

                const textoEstado = esEnviado ? 'Enviado' : esBorrador ? 'Borrador' : 'Sin iniciar';
                const claseChip = esEnviado
                  ? 'chip-enviado'
                  : esBorrador
                    ? 'chip-borrador'
                    : 'chip-nuevo';
                const claseBarra = esEnviado
                  ? 'barra-guindo'
                  : esBorrador
                    ? 'barra-naranja'
                    : 'barra-gris';
                const textoBtn = esEnviado
                  ? 'Ver notas'
                  : esBorrador
                    ? 'Continuar registro'
                    : 'Empezar registro';

                return (
                  <article
                    key={curso.id}
                    className={`tarjeta-curso-institucional ${esSeleccionado ? 'tarjeta-seleccionada' : ''}`}
                  >
                    <div className="curso-cabecera">
                      <div>
                        <span className="curso-nivel">{curso.nivel}</span>
                        <h3 className="curso-titulo">
                          {curso.curso}{' '}
                          <span className="paralelo-destacado">«{curso.paralelo}»</span>
                        </h3>
                      </div>
                      <span className={`chip-estado ${claseChip}`}>{textoEstado}</span>
                    </div>

                    <div className="curso-materia-fila">
                      <svg
                        aria-hidden="true"
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#4B5563"
                        strokeWidth="1.8"
                        strokeLinejoin="round"
                      >
                        <path d="M4 5h11a3 3 0 0 1 3 3v12H7a3 3 0 0 1-3-3z" />
                        <path d="M4 17a3 3 0 0 1 3-3h11" />
                      </svg>
                      <span className="materia-nombre">{curso.materia}</span>
                    </div>

                    <div className="curso-progreso-bloque">
                      <div className="progreso-textos">
                        <span>Notas cargadas</span>
                        <span>
                          {curso.cargadas} / {curso.total} estudiantes
                        </span>
                      </div>
                      <div className="pista-progreso">
                        <div
                          className={`relleno-progreso ${claseBarra}`}
                          style={{ width: `${porcentaje}%` }}
                        />
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => seleccionarCurso(curso.actividadId)}
                      className={`btn-accion-curso ${esEnviado ? 'btn-outline-guindo' : 'btn-solido-guindo'}`}
                    >
                      {textoBtn}
                    </button>
                  </article>
                );
              })}
            </div>

            {/* Planilla de calificación activa */}
            <div id="seccion-registro-activa" className="contenedor-planilla-registro">
              <div className="barra-actividad-selector">
                <div className="selector-info-bloque">
                  <span className="etiqueta-actividad-activa">
                    Registro de actividad evaluativa
                  </span>
                  <p className="ayuda-actividad-texto">
                    Dimensiones Ser (10 pts), Saber (45 pts), Hacer (40 pts) y Autoevaluación (5
                    pts) · RM 001/2026
                  </p>
                </div>
                <label htmlFor="actividad-id" className="control-actividad-label">
                  N.º de actividad:
                  <input
                    id="actividad-id"
                    type="number"
                    min={1}
                    value={actividadId}
                    aria-label="Actividad"
                    onChange={(e) => setActividadId(Number(e.target.value))}
                    className="input-numero-actividad"
                  />
                </label>
              </div>

              <div className="planilla-cuerpo-integrado">
                <Planilla token={sesion.token} actividadId={actividadId} />
              </div>
            </div>
          </section>

          {/* Columna derecha: Avisos y Trimestres */}
          <aside className="columna-lateral-avisos" aria-label="Información institucional">
            <section aria-labelledby="avisos-titulo" className="tarjeta-aside-blanca">
              <h2 id="avisos-titulo" className="titulo-aside">
                Avisos de Dirección
              </h2>
              <div className="lista-avisos">
                <div className="item-aviso">
                  <span className="aviso-fecha">12 de Mayo de 2026</span>
                  <p className="aviso-cuerpo">
                    Recordatorio: Cierre oficial e impostergable de calificaciones del 1.er
                    trimestre en sistema.
                  </p>
                </div>
                <div className="item-aviso">
                  <span className="aviso-fecha">18 de Mayo de 2026</span>
                  <p className="aviso-cuerpo">
                    Reunión de consejo de profesores para centralización y aprobación de boletines
                    trimestrales.
                  </p>
                </div>
                <div className="item-aviso">
                  <span className="aviso-fecha">22 de Mayo de 2026</span>
                  <p className="aviso-cuerpo">
                    Apertura oficial del módulo de asistencia escolar y seguimiento de puntualidad
                    (US-09).
                  </p>
                </div>
              </div>
            </section>

            <section aria-labelledby="trimestres-titulo" className="tarjeta-aside-blanca">
              <h2 id="trimestres-titulo" className="titulo-aside">
                Trimestres 2026
              </h2>
              <div className="lista-trimestres">
                <div className="fila-trimestre trimestre-actual">
                  <span>1.er Trimestre</span>
                  <span className="pill-trimestre-activo">En curso</span>
                </div>
                <div className="fila-trimestre">
                  <span>2.do Trimestre</span>
                  <span className="pill-trimestre-inactivo">Próximo</span>
                </div>
                <div className="fila-trimestre">
                  <span>3.er Trimestre</span>
                  <span className="pill-trimestre-inactivo">Programado</span>
                </div>
              </div>
            </section>
          </aside>
        </div>
      </div>
    </AppShell>
  );
}
