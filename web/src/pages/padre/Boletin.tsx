import { Icono } from '../../componentes/Icono';

/** El boletín para el padre de familia llega en el Sprint 3 (US-11). Mientras tanto, un aviso claro. */
export function Boletin() {
  return (
    <>
      {/* Banner de bienvenida del padre de familia */}
      <section className="hero-rol hero-padre" aria-label="Portal de familias">
        <div className="hero-rol-contenido">
          <div className="hero-rol-insignia">
            <Icono nombre="personas" tam={16} />
            <span>Portal de Familias y Tutores</span>
          </div>
          <h2>Seguimiento Formativo del Estudiante</h2>
          <p>
            Información oportuna sobre el avance y aprovechamiento escolar en las dimensiones del
            Ser (10 pts), Saber (45 pts), Hacer (40 pts) y Autoevaluación (5 pts).
          </p>
        </div>
        <div className="hero-rol-metricas">
          <div className="hero-metrica-tarjeta">
            <span className="hero-metrica-numero">1.er</span>
            <span className="hero-metrica-etiqueta">Trimestre en curso</span>
          </div>
          <div className="hero-metrica-tarjeta">
            <span className="hero-metrica-numero">51</span>
            <span className="hero-metrica-etiqueta">Puntaje de aprobación</span>
          </div>
          <div className="hero-metrica-tarjeta">
            <span className="hero-metrica-numero">PDF</span>
            <span className="hero-metrica-etiqueta">Boletín digital</span>
          </div>
        </div>
      </section>

      <div className="titulo-pagina">
        <div>
          <h1>Boletín de mi hijo</h1>
          <span className="subtitulo">
            Reporte oficial trimestral de calificaciones y asistencia
          </span>
        </div>
      </div>
      <div
        className="tarjeta panel"
        data-cy="aviso-boletin-proximamente"
        style={{ maxWidth: 620, padding: 28 }}
      >
        <span
          style={{
            width: 48,
            height: 48,
            borderRadius: 12,
            background: '#fdf3dc',
            color: '#8a5a00',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icono nombre="reloj" tam={24} />
        </span>
        <h2 style={{ fontSize: 19 }}>El boletín todavía no está disponible</h2>
        <p className="ayuda" style={{ fontSize: 15 }}>
          Pronto podrá consultar aquí las calificaciones de su hijo por trimestre. Le avisaremos
          desde la unidad educativa cuando esté habilitado.
        </p>
      </div>
    </>
  );
}
