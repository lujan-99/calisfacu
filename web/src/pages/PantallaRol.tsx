import { useState } from 'react';
import { AppShell } from '../components/AppShell';
import type { Sesion } from '../lib/api';
import { ETIQUETA_ROL, ROL } from '../lib/constantes';

interface Props {
  sesion: Sesion;
  onSalir: () => void;
}

// ── Datos de estructura académica institucional (Dirección / Admin) ──
interface NivelInfo {
  id: string;
  nombre: string;
  cursos: string[];
  materias: string[];
}

const NIVELES_ADMIN: NivelInfo[] = [
  {
    id: 'ini',
    nombre: 'Inicial',
    cursos: ['1° de Inicial', '2° de Inicial'],
    materias: [
      'Cosmos y Pensamiento',
      'Comunidad y Sociedad',
      'Vida, Tierra y Territorio',
      'Ciencia, Tecnología y Producción',
    ],
  },
  {
    id: 'pri',
    nombre: 'Primaria',
    cursos: [
      '1° de Primaria',
      '2° de Primaria',
      '3° de Primaria',
      '4° de Primaria',
      '5° de Primaria',
      '6° de Primaria',
    ],
    materias: [
      'Comunicación y Lenguajes',
      'Ciencias Sociales',
      'Educación Física y Deportes',
      'Educación Musical',
      'Artes Plásticas y Visuales',
      'Matemática',
      'Técnica Tecnológica',
      'Ciencias Naturales',
      'Valores, Espiritualidad y Religiones',
    ],
  },
  {
    id: 'sec',
    nombre: 'Secundaria',
    cursos: [
      '1° de Secundaria',
      '2° de Secundaria',
      '3° de Secundaria',
      '4° de Secundaria',
      '5° de Secundaria',
      '6° de Secundaria',
    ],
    materias: [
      'Comunicación y Lenguajes',
      'Lengua Extranjera',
      'Ciencias Sociales',
      'Educación Física y Deportes',
      'Educación Musical',
      'Artes Plásticas y Visuales',
      'Matemática',
      'Técnica Tecnológica',
      'Biología – Geografía',
      'Física',
      'Química',
      'Cosmovisiones, Filosofía y Psicología',
      'Valores, Espiritualidad y Religiones',
    ],
  },
];

const DOCENTES_ASIGNADOS = [
  'Prof. R. Mamani',
  'Prof. L. Vargas',
  'Prof. S. Choque',
  'Prof. M. Rojas',
  'Prof. J. Quispe',
  'Prof. A. Flores',
  'Prof. C. Torrez',
];

// ── Datos del centralizador (Secretaría) ──
const MATERIAS_CENTRALIZADOR = [
  { abr: 'CL', nombre: 'Comunicación y Lenguajes', enviada: true },
  { abr: 'LE', nombre: 'Lengua Extranjera', enviada: true },
  { abr: 'CS', nombre: 'Ciencias Sociales', enviada: true },
  { abr: 'EF', nombre: 'Educación Física y Deportes', enviada: true },
  { abr: 'EM', nombre: 'Educación Musical', enviada: true },
  { abr: 'AP', nombre: 'Artes Plásticas y Visuales', enviada: true },
  { abr: 'MAT', nombre: 'Matemática', enviada: false }, // En borrador / pendiente
  { abr: 'TT', nombre: 'Técnica Tecnológica', enviada: true },
  { abr: 'BG', nombre: 'Biología – Geografía', enviada: true },
  { abr: 'FIS', nombre: 'Física', enviada: true },
  { abr: 'QUI', nombre: 'Química', enviada: true },
  { abr: 'CFP', nombre: 'Cosmovisiones y Filosofía', enviada: true },
  { abr: 'VER', nombre: 'Valores y Espiritualidad', enviada: true },
];

const ESTUDIANTES_CENTRALIZADOR = [
  {
    id: 1,
    nombre: 'Apaza Mamani, Luis Fernando',
    notas: [82, 75, 88, 95, 90, 85, 74, 88, 70, 78, 80, 84, 90],
    prom: 83,
  },
  {
    id: 2,
    nombre: 'Choque Quispe, María José',
    notas: [90, 88, 92, 98, 94, 90, 85, 92, 86, 84, 88, 91, 95],
    prom: 90,
  },
  {
    id: 3,
    nombre: 'Flores Rojas, Camila',
    notas: [55, 48, 60, 80, 70, 65, 52, 68, 45, 50, 52, 60, 75],
    prom: 56,
  },
  {
    id: 4,
    nombre: 'Gutiérrez Vargas, Diego',
    notas: [70, 72, 75, 85, 80, 78, 68, 74, 72, 70, 73, 76, 82],
    prom: 74,
  },
  {
    id: 5,
    nombre: 'Huanca Condori, Ana Lucía',
    notas: [95, 92, 96, 100, 96, 94, 91, 95, 89, 90, 92, 94, 98],
    prom: 94,
  },
  {
    id: 6,
    nombre: 'Mendoza Ríos, Sebastián',
    notas: [68, 65, 70, 78, 75, 70, 62, 72, 60, 64, 65, 70, 78],
    prom: 69,
  },
  {
    id: 7,
    nombre: 'Quispe Limachi, Valeria',
    notas: [80, 78, 82, 90, 86, 82, 75, 84, 76, 78, 80, 82, 88],
    prom: 81,
  },
  {
    id: 8,
    nombre: 'Torrez Saavedra, Joaquín',
    notas: [58, 52, 62, 75, 68, 60, 49, 64, 48, 55, 54, 62, 70],
    prom: 59,
  },
];

/**
 * Pantalla de inicio para roles institucionales (Administrador, Secretaría, Padre).
 * Rediseñada fielmente conforme a los tableros oficiales:
 * - Administrador: Panel de estructura académica (niveles, cursos, paralelos, matriz docente-materia)
 * - Secretaría: Centralizador por paralelo, filtros y tabla de consolidación ministerial
 * - Padre: Portal de familia con seguimiento académico y boletín de calificaciones
 */
export function PantallaRol({ sesion, onSalir }: Props) {
  const rol = sesion.usuario.rol;
  const rolEtiqueta = ETIQUETA_ROL[rol] ?? rol;

  // Estado para explorador de estructura académica (Administrador)
  const [nivelIndex, setNivelIndex] = useState<number>(2); // Secundaria por defecto
  const [cursoIndex, setCursoIndex] = useState<number>(3); // 4° de Secundaria por defecto

  // Estado para centralizador (Secretaría)
  const [cursoFiltro, setCursoFiltro] = useState<string>('4° de Secundaria');
  const [paraleloFiltro, setParaleloFiltro] = useState<string>('B');
  const [trimestreFiltro, setTrimestreFiltro] = useState<string>('1er Trimestre');

  const nivelActual = NIVELES_ADMIN[nivelIndex] ?? NIVELES_ADMIN[2];
  const cursoActual = nivelActual.cursos[cursoIndex] ?? nivelActual.cursos[0];

  const esAdmin = rol === ROL.ADMINISTRADOR;
  const esSecretaria = rol === ROL.SECRETARIA;
  const esPadre = rol === ROL.PADRE;

  // 3 paralelos de ejemplo para el curso actual
  const paralelosCurso = [
    { letra: 'A', est: 28, asesor: DOCENTES_ASIGNADOS[1] },
    { letra: 'B', est: 27, asesor: DOCENTES_ASIGNADOS[0] },
    { letra: 'C', est: 27, asesor: DOCENTES_ASIGNADOS[2] },
  ];
  const totalEstudiantesCurso = paralelosCurso.reduce((acc, p) => acc + p.est, 0);

  return (
    <AppShell
      nombre={sesion.usuario.nombre}
      rol={rol}
      rolEtiqueta={rolEtiqueta}
      onSalir={onSalir}
      gitCommit={__GIT_COMMIT__}
    >
      <div className="panel-rol-vista">
        {/* ============================================================
            1. VISTA DE ADMINISTRADOR / DIRECCIÓN
            ============================================================ */}
        {esAdmin && (
          <div className="contenido-admin-panel">
            {/* Encabezado institucional */}
            <div className="encabezado-dashboard-fila">
              <div className="titular-bienvenida-bloque">
                <span className="contexto-gestion-tag">Dirección · Gestión 2026</span>
                <h1 className="titulo-saludo-docente">Panel de Administración</h1>
                <p className="descripcion-contextual">
                  Gestión integral de cursos, paralelos, asignación docente y control institucional.
                </p>
              </div>

              <div className="acciones-cabecera-grupo">
                <button type="button" className="btn-secundario-outline">
                  <svg
                    aria-hidden="true"
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  >
                    <path d="M4 12a8 8 0 0 1 14-5l2 2M20 4v5h-5M20 12a8 8 0 0 1-14 5l-2-2M4 20v-5h5" />
                  </svg>
                  <span>Copiar estructura de 2025</span>
                </button>
              </div>
            </div>

            {/* Módulos de gobernanza del sistema */}
            <div className="grid-modulos-admin">
              <div
                className="tarjeta-modulo-admin tarjeta-modulo-destacada"
                data-cy="modulo-usuarios"
              >
                <div className="modulo-icono-circulo">🛡️</div>
                <div className="modulo-textos">
                  <h2 className="modulo-titulo">Gestión de usuarios y roles</h2>
                  <p className="modulo-descripcion">
                    Asignación de credenciales con control RBAC para directores, profesores y
                    secretaría (US-17).
                  </p>
                </div>
                <span className="modulo-tag-estado tag-verde">✓ Activo</span>
              </div>

              <div className="tarjeta-modulo-admin" data-cy="modulo-configuracion">
                <div className="modulo-icono-circulo">⚙️</div>
                <div className="modulo-textos">
                  <h2 className="modulo-titulo">Configuración de gestión escolar</h2>
                  <p className="modulo-descripcion">
                    Ponderaciones por dimensión: Ser (10), Saber (45), Hacer (40), Autoevaluación
                    (5) (US-18).
                  </p>
                </div>
                <span className="modulo-tag-estado tag-gris">Sprint 4</span>
              </div>

              <div className="tarjeta-modulo-admin" data-cy="modulo-auditoria">
                <div className="modulo-icono-circulo">🔍</div>
                <div className="modulo-textos">
                  <h2 className="modulo-titulo">Registro inmutable de auditoría</h2>
                  <p className="modulo-descripcion">
                    Bitácora histórica de modificaciones, correcciones y cambios de calificaciones
                    (US-12).
                  </p>
                </div>
                <span className="modulo-tag-estado tag-gris">Sprint 3</span>
              </div>
            </div>

            {/* Explorador de Estructura Académica (Fiel a la maqueta) */}
            <div className="seccion-estructura-academica">
              <div className="estructura-columnas-layout">
                {/* 1. Columna de Niveles */}
                <section aria-labelledby="niveles-tit" className="columna-niveles-caja">
                  <h2 id="niveles-tit" className="titulo-columna-mini">
                    NIVELES
                  </h2>
                  <div className="lista-botones-selector">
                    {NIVELES_ADMIN.map((n, idx) => (
                      <button
                        key={n.id}
                        type="button"
                        onClick={() => {
                          setNivelIndex(idx);
                          setCursoIndex(0);
                        }}
                        className={`btn-selector-item ${idx === nivelIndex ? 'selector-item-activo' : ''}`}
                      >
                        <span className="selector-nombre">{n.nombre}</span>
                        <span className="selector-conteo">{n.cursos.length} cursos</span>
                      </button>
                    ))}
                  </div>
                </section>

                {/* 2. Columna de Cursos */}
                <section aria-labelledby="cursos-tit" className="columna-cursos-caja">
                  <h2 id="cursos-tit" className="titulo-columna-mini">
                    CURSOS DE {nivelActual.nombre.toUpperCase()}
                  </h2>
                  <div className="lista-botones-selector">
                    {nivelActual.cursos.map((c, idx) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setCursoIndex(idx)}
                        className={`btn-selector-item ${idx === cursoIndex ? 'selector-item-activo' : ''}`}
                      >
                        <span className="selector-nombre">{c}</span>
                        <span className="selector-conteo">3 paralelos</span>
                      </button>
                    ))}
                    <button type="button" className="btn-nuevo-curso-dashed">
                      + Nuevo curso
                    </button>
                  </div>
                </section>

                {/* 3. Detalle de Curso y Matriz Docente */}
                <section aria-labelledby="detalle-curso-tit" className="columna-detalle-amplia">
                  {/* Tarjeta de paralelos del curso */}
                  <div className="tarjeta-blanca-detalle">
                    <div className="detalle-cabecera-fila">
                      <div>
                        <h2 id="detalle-curso-tit" className="titulo-curso-grande">
                          {cursoActual}
                        </h2>
                        <span className="subtitulo-estudiantes-total">
                          {nivelActual.nombre} · {totalEstudiantesCurso} estudiantes inscritos
                        </span>
                      </div>
                      <button type="button" className="btn-solido-guindo">
                        <svg
                          aria-hidden="true"
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.4"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <line x1="12" y1="5" x2="12" y2="19" />
                          <line x1="5" y1="12" x2="19" y2="12" />
                        </svg>
                        <span>Agregar paralelo</span>
                      </button>
                    </div>

                    <div className="grid-paralelos-cards">
                      {paralelosCurso.map((p) => (
                        <div key={p.letra} className="item-paralelo-card">
                          <div className="caja-letra-dorada">{p.letra}</div>
                          <div className="info-paralelo">
                            <span className="nombre-paralelo">Paralelo «{p.letra}»</span>
                            <span className="meta-paralelo">{p.est} estudiantes · Mañana</span>
                            <span className="meta-paralelo">Asesor: {p.asesor}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Tabla de asignación de materias a docentes */}
                  <div className="tarjeta-blanca-detalle">
                    <div className="detalle-cabecera-fila borde-inferior-suave">
                      <div>
                        <h3 className="titulo-materias-bloque">Materias del curso y docentes</h3>
                        <span className="subtitulo-explicativo">
                          Cada materia se asigna a un docente por paralelo. Solo ese docente puede
                          cargar notas.
                        </span>
                      </div>
                      <button type="button" className="btn-secundario-outline">
                        + Agregar materia
                      </button>
                    </div>

                    <div className="tabla-responsive-envoltorio">
                      <table className="tabla-matriz-docentes">
                        <thead>
                          <tr>
                            <th scope="col" style={{ width: '40%' }}>
                              Materia
                            </th>
                            {paralelosCurso.map((p) => (
                              <th key={p.letra} scope="col" style={{ width: '18%' }}>
                                Docente «{p.letra}»
                              </th>
                            ))}
                            <th scope="col" style={{ width: '6%', textAlign: 'right' }}>
                              <span className="sr-only">Acciones</span>
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {nivelActual.materias.map((materia, mIdx) => (
                            <tr key={materia}>
                              <th scope="row" className="celda-materia-nombre">
                                {materia}
                              </th>
                              {paralelosCurso.map((p, pIdx) => {
                                const sinDocente = (mIdx + pIdx) % 8 === 0;
                                const docente =
                                  DOCENTES_ASIGNADOS[(mIdx + pIdx) % DOCENTES_ASIGNADOS.length];
                                return (
                                  <td key={p.letra}>
                                    {sinDocente ? (
                                      <span className="pill-sin-asignar">Sin asignar</span>
                                    ) : (
                                      <span className="pill-docente-asignado">{docente}</span>
                                    )}
                                  </td>
                                );
                              })}
                              <td style={{ textAlign: 'right' }}>
                                <button
                                  type="button"
                                  className="btn-icono-editar"
                                  title={`Editar ${materia}`}
                                  aria-label={`Editar ${materia}`}
                                >
                                  <svg
                                    aria-hidden="true"
                                    width="16"
                                    height="16"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="1.8"
                                    strokeLinejoin="round"
                                  >
                                    <path d="M4 20h4L19 9l-4-4L4 16z" />
                                  </svg>
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </section>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================
            2. VISTA DE SECRETARÍA (Centralizador y boletines oficiales)
            ============================================================ */}
        {esSecretaria && (
          <div className="contenido-secretaria-panel">
            {/* Encabezado de Secretaría */}
            <div className="encabezado-dashboard-fila">
              <div className="titular-bienvenida-bloque">
                <span className="contexto-gestion-tag">Secretaría · Gestión 2026</span>
                <h1 className="titulo-saludo-docente">Panel de Secretaría</h1>
                <p className="descripcion-contextual">
                  Centralización oficial de calificaciones, registro de nóminas e impresión de
                  boletines trimestrales.
                </p>
              </div>

              <div className="acciones-cabecera-grupo">
                <button type="button" className="btn-secundario-outline">
                  <svg
                    aria-hidden="true"
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M12 4v11M7 10l5 5 5-5M5 20h14" />
                  </svg>
                  <span>Exportar Excel</span>
                </button>
                <button type="button" className="btn-solido-guindo">
                  <svg
                    aria-hidden="true"
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinejoin="round"
                  >
                    <path d="M7 9V3h10v6M7 17H4V9h16v8h-3M7 14h10v7H7z" />
                  </svg>
                  <span>Imprimir libretas</span>
                </button>
              </div>
            </div>

            {/* Módulos de Secretaría (con títulos requeridos por tests) */}
            <div className="grid-modulos-admin">
              <div
                className="tarjeta-modulo-admin tarjeta-modulo-destacada"
                data-cy="modulo-centralizador"
              >
                <div className="modulo-icono-circulo">📊</div>
                <div className="modulo-textos">
                  <h2 className="modulo-titulo">Centralizador de calificaciones</h2>
                  <p className="modulo-descripcion">
                    Consolidación de notas trimestrales de todos los cursos, materias y paralelos
                    (US-11).
                  </p>
                </div>
                <span className="modulo-tag-estado tag-verde">✓ En uso</span>
              </div>

              <div className="tarjeta-modulo-admin" data-cy="modulo-boletines">
                <div className="modulo-icono-circulo">📜</div>
                <div className="modulo-textos">
                  <h2 className="modulo-titulo">Emisión oficial de boletines</h2>
                  <p className="modulo-descripcion">
                    Generación masiva y exportación en formato PDF con formato ministerial oficial
                    (US-06).
                  </p>
                </div>
                <span className="modulo-tag-estado tag-gris">Sprint 2</span>
              </div>

              <div className="tarjeta-modulo-admin" data-cy="modulo-estudiantes">
                <div className="modulo-icono-circulo">👥</div>
                <div className="modulo-textos">
                  <h2 className="modulo-titulo">Registro y matrícula de estudiantes</h2>
                  <p className="modulo-descripcion">
                    Gestión de nóminas por año de escolaridad, paralelos y datos de tutores (US-08).
                  </p>
                </div>
                <span className="modulo-tag-estado tag-gris">Sprint 2</span>
              </div>
            </div>

            {/* Barra de Filtros del Centralizador */}
            <div className="barra-filtros-centralizador">
              <label className="campo-filtro-control">
                <span>Curso</span>
                <select
                  value={cursoFiltro}
                  onChange={(e) => setCursoFiltro(e.target.value)}
                  className="select-filtro-institucional"
                >
                  <option>4° de Secundaria</option>
                  <option>5° de Secundaria</option>
                  <option>6° de Secundaria</option>
                </select>
              </label>

              <label className="campo-filtro-control">
                <span>Paralelo</span>
                <select
                  value={paraleloFiltro}
                  onChange={(e) => setParaleloFiltro(e.target.value)}
                  className="select-filtro-institucional"
                >
                  <option>A</option>
                  <option>B</option>
                  <option>C</option>
                </select>
              </label>

              <label className="campo-filtro-control">
                <span>Trimestre</span>
                <select
                  value={trimestreFiltro}
                  onChange={(e) => setTrimestreFiltro(e.target.value)}
                  className="select-filtro-institucional"
                >
                  <option>1er Trimestre</option>
                  <option>2do Trimestre</option>
                  <option>3er Trimestre</option>
                  <option>Promedio anual</option>
                </select>
              </label>

              {/* Indicador de progreso de materias enviadas */}
              <div className="caja-progreso-materias-enviadas">
                <span className="conteo-enviadas-bold">12 / 13</span>
                <span className="texto-enviadas-suave">materias enviadas por los docentes</span>
                <div className="track-progreso-mini">
                  <div className="fill-progreso-mini" style={{ width: '92%' }} />
                </div>
              </div>
            </div>

            {/* Tabla del Centralizador por Paralelo */}
            <section aria-labelledby="centralizador-tit" className="tarjeta-blanca-detalle">
              <h2 id="centralizador-tit" className="titulo-seccion-cursos">
                Centralizador — {cursoFiltro} «{paraleloFiltro}»
              </h2>

              <div className="tabla-responsive-envoltorio">
                <table className="tabla-centralizador-matriz">
                  <thead>
                    <tr>
                      <th scope="col" style={{ width: '40px' }}>
                        N°
                      </th>
                      <th scope="col" style={{ minWidth: '220px' }}>
                        Estudiante
                      </th>
                      {MATERIAS_CENTRALIZADOR.map((m) => (
                        <th key={m.abr} scope="col" title={m.nombre} className="th-materia-col">
                          <span className="sigla-materia">{m.abr}</span>
                          <span
                            className={`punto-estado-materia ${m.enviada ? 'materia-ok' : 'materia-pendiente'}`}
                            title={m.enviada ? 'Enviada' : 'Pendiente'}
                          />
                        </th>
                      ))}
                      <th scope="col" className="th-promedio-col">
                        Promedio
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {ESTUDIANTES_CENTRALIZADOR.map((est) => (
                      <tr key={est.id}>
                        <td className="celda-numero">{est.id}</td>
                        <th scope="row" className="celda-estudiante-nombre">
                          {est.nombre}
                        </th>
                        {est.notas.map((nota, nIdx) => {
                          const esPendiente = !MATERIAS_CENTRALIZADOR[nIdx]?.enviada;
                          const esReprobado = nota < 51;
                          return (
                            <td
                              key={nIdx}
                              className={`celda-nota-valor ${esPendiente ? 'nota-pendiente-bg' : ''} ${
                                esReprobado ? 'nota-reprobada-rojo' : ''
                              }`}
                            >
                              {esPendiente ? '—' : nota}
                            </td>
                          );
                        })}
                        <td className="celda-promedio-final">{est.prom}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Leyenda institucional inferior */}
              <div className="leyenda-centralizador-fila">
                <span className="item-leyenda">
                  <span className="punto-guindo-circulo" /> Materia enviada
                </span>
                <span className="item-leyenda">
                  <span className="punto-naranja-circulo" /> Pendiente (en borrador)
                </span>
                <span className="item-leyenda">
                  <span className="badge-reprobado-ejemplo">48</span> Nota menor a 51 (Insuficiente)
                </span>
                <span className="texto-aclarativo">
                  Pase el cursor sobre la sigla para ver el nombre completo de la asignatura.
                </span>
              </div>
            </section>
          </div>
        )}

        {/* ============================================================
            3. VISTA DE PADRE DE FAMILIA / TUTOR
            ============================================================ */}
        {esPadre && (
          <div className="contenido-padre-panel">
            {/* Encabezado Familiar */}
            <div className="encabezado-dashboard-fila">
              <div className="titular-bienvenida-bloque">
                <span className="contexto-gestion-tag">Seguimiento Familiar · Gestión 2026</span>
                <h1 className="titulo-saludo-docente">Portal de Familia</h1>
                <p className="descripcion-contextual">
                  Bienvenido, {sesion.usuario.nombre}. Consulta del avance pedagógico y
                  calificaciones de sus tutelados.
                </p>
              </div>

              <div className="banner-plazo-cierre">
                <span className="periodo-icono">🏛️</span>
                <span>Subsistema Regular · Gestión 2026</span>
              </div>
            </div>

            {/* Módulos requeridos por los tests */}
            <div className="grid-modulos-admin">
              <div
                className="tarjeta-modulo-admin tarjeta-modulo-destacada"
                data-cy="modulo-boletin-familiar"
              >
                <div className="modulo-icono-circulo">📋</div>
                <div className="modulo-textos">
                  <h2 className="modulo-titulo">Boletín de calificaciones</h2>
                  <p className="modulo-descripcion">
                    Consulta en tiempo real del progreso formativo y estado de aprobación oficial
                    (US-06).
                  </p>
                </div>
                <span className="modulo-tag-estado tag-verde">✓ En línea</span>
              </div>

              <div className="tarjeta-modulo-admin" data-cy="modulo-asistencia-familiar">
                <div className="modulo-icono-circulo">📅</div>
                <div className="modulo-textos">
                  <h2 className="modulo-titulo">Seguimiento de asistencia escolar</h2>
                  <p className="modulo-descripcion">
                    Monitoreo periódico de asistencia, atrasos y licencias justificadas (US-09).
                  </p>
                </div>
                <span className="modulo-tag-estado tag-gris">Sprint 3</span>
              </div>
            </div>

            {/* Ficha de Calificaciones del Estudiante */}
            <section aria-labelledby="progreso-hijo-tit" className="tarjeta-blanca-detalle">
              <div className="detalle-cabecera-fila borde-inferior-suave">
                <div>
                  <h2 id="progreso-hijo-tit" className="titulo-curso-grande">
                    Estudiante: Quispe Mamani, Juan Daniel
                  </h2>
                  <span className="subtitulo-explicativo">
                    4.° de Secundaria «B» · Turno Mañana · Asesor: Prof. R. Mamani
                  </span>
                </div>
                <button type="button" className="btn-solido-guindo">
                  <svg
                    aria-hidden="true"
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M12 4v11M7 10l5 5 5-5M5 20h14" />
                  </svg>
                  <span>Descargar boletín oficial</span>
                </button>
              </div>

              <div className="grid-resumen-notas-hijo">
                <div className="tarjeta-kpi-estudiante">
                  <span className="kpi-tit">Promedio Trimestral</span>
                  <span className="kpi-val text-exito">84 / 100</span>
                  <span className="kpi-sub">Estado: Aprobado</span>
                </div>
                <div className="tarjeta-kpi-estudiante">
                  <span className="kpi-tit">Materias Registradas</span>
                  <span className="kpi-val">12 / 13</span>
                  <span className="kpi-sub">1 pendiente de cierre</span>
                </div>
                <div className="tarjeta-kpi-estudiante">
                  <span className="kpi-tit">Asistencia Trimestral</span>
                  <span className="kpi-val text-info">96%</span>
                  <span className="kpi-sub">0 faltas injustificadas</span>
                </div>
              </div>
            </section>
          </div>
        )}
      </div>
    </AppShell>
  );
}
