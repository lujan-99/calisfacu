import { Icono } from '../../componentes/Icono';

/** El boletín para el padre de familia llega en el Sprint 3 (US-11). Mientras tanto, un aviso claro. */
export function Boletin() {
  return (
    <>
      <div className="titulo-pagina">
        <div>
          <h1>Boletín de mi hijo</h1>
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
