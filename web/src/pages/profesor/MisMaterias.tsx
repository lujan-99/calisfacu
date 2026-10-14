import { Link } from 'react-router-dom';
import { Cargando, ErrorCarga, Vacio } from '../../componentes/Estados';
import { Icono } from '../../componentes/Icono';
import { misMaterias } from '../../lib/api';
import { useCarga } from '../../lib/useCarga';

/** "Mis materias": solo las asignadas al profesor (US-18, criterio 2; T-012). */
export function MisMaterias() {
  const { carga, recargar } = useCarga(misMaterias, []);
  const gestion = carga.estado === 'datos' ? carga.datos[0]?.gestion.anio : undefined;

  return (
    <>
      {/* Banner de bienvenida del profesor */}
      <section className="hero-rol hero-profesor" aria-label="Resumen del docente">
        <div className="hero-rol-contenido">
          <div className="hero-rol-insignia">
            <Icono nombre="birrete" tam={16} />
            <span>Panel del Docente · Subsistema Regular</span>
          </div>
          <h2>Portal de Calificaciones y Seguimiento</h2>
          <p>
            Registro de actividades evaluativas y cálculo automático de promedios según la
            Resolución Ministerial 001/2026.
          </p>
        </div>
        <div className="hero-rol-metricas">
          <div className="hero-metrica-tarjeta">
            <span className="hero-metrica-numero">
              {carga.estado === 'datos' ? carga.datos.length : '—'}
            </span>
            <span className="hero-metrica-etiqueta">Materias a cargo</span>
          </div>
          <div className="hero-metrica-tarjeta">
            <span className="hero-metrica-numero">1.er</span>
            <span className="hero-metrica-etiqueta">Trimestre activo</span>
          </div>
          <div className="hero-metrica-tarjeta">
            <span className="hero-metrica-numero">51</span>
            <span className="hero-metrica-etiqueta">Nota mín. aprobación</span>
          </div>
        </div>
      </section>

      <div className="titulo-pagina">
        <div>
          <h1>Mis materias</h1>
          <span className="subtitulo">
            {gestion ? `Gestión ${gestion} · ` : ''}elija una materia para ver sus actividades
          </span>
        </div>
      </div>
      {carga.estado === 'cargando' && <Cargando texto="Cargando materias…" alto={168} />}
      {carga.estado === 'error' && (
        <ErrorCarga
          cy="mis-materias-error"
          mensaje={`No se pudieron cargar sus materias. ${carga.mensaje}`}
          reintentar={recargar}
        />
      )}
      {carga.estado === 'datos' && carga.datos.length === 0 && (
        <Vacio
          cy="mis-materias-vacio"
          icono="libro"
          titulo="No tiene materias asignadas en esta gestión"
          texto="Si cree que es un error, consulte con Secretaría."
        />
      )}
      {carga.estado === 'datos' && carga.datos.length > 0 && (
        <div className="rejilla-tarjetas" data-cy="lista-mis-materias">
          {carga.datos.map((m) => (
            <Link
              key={m.id}
              to={`/profesor/materias/${m.id}`}
              className="tarjeta tarjeta-materia"
              data-cy="materia-item"
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span className="icono-materia">
                  <Icono nombre="libro" />
                </span>
                <span style={{ fontSize: 18, fontWeight: 700 }}>{m.nombre}</span>
              </div>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 4,
                  fontSize: 14,
                  color: 'var(--texto-2)',
                }}
              >
                <span>{m.curso.nombre}</span>
                <span>Gestión {m.gestion.anio}</span>
              </div>
              <span className="tarjeta-materia-pie">
                Ver actividades
                <Icono nombre="flechaDer" tam={18} />
              </span>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
