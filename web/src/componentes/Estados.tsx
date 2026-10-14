import type { ReactNode } from 'react';
import { Icono, type NombreIcono } from './Icono';

/** Esqueletos animados mientras llega la respuesta; el texto lo anuncia el lector de pantalla. */
export function Cargando({
  texto,
  filas = 3,
  alto = 56,
}: {
  texto: string;
  filas?: number;
  alto?: number;
}) {
  return (
    <div aria-busy="true" data-cy="lista-cargando" style={{ display: 'grid', gap: 12 }}>
      <span className="solo-lector">{texto}</span>
      {Array.from({ length: filas }, (_, i) => (
        <div key={i} className="esqueleto" style={{ height: alto }} />
      ))}
    </div>
  );
}

export function Vacio({
  titulo,
  texto,
  icono,
  cy = 'lista-vacia',
}: {
  titulo: string;
  texto?: string;
  icono?: NombreIcono;
  cy?: string;
}) {
  return (
    <div className="vacio" data-cy={cy}>
      {icono && (
        <span style={{ color: '#9aa3ad' }}>
          <Icono nombre={icono} tam={40} />
        </span>
      )}
      <span className="vacio-titulo">{titulo}</span>
      {texto && <span className="vacio-texto">{texto}</span>}
    </div>
  );
}

export function ErrorCarga({
  mensaje,
  reintentar,
  cy = 'lista-error',
}: {
  mensaje: string;
  reintentar: () => void;
  cy?: string;
}) {
  return (
    <div
      role="alert"
      className="aviso aviso-error"
      data-cy={cy}
      style={{ alignItems: 'center', flexWrap: 'wrap' }}
    >
      <Icono nombre="alerta" tam={22} />
      <span style={{ flex: '1 1 240px' }}>{mensaje}</span>
      <button
        type="button"
        className="boton boton-secundario"
        data-cy="btn-reintentar"
        onClick={reintentar}
      >
        Reintentar
      </button>
    </div>
  );
}

type TipoAviso = 'info' | 'error' | 'exito' | 'advertencia';
const ICONO_AVISO: Record<TipoAviso, NombreIcono> = {
  info: 'reloj',
  error: 'alerta',
  exito: 'check',
  advertencia: 'candado',
};

export function Aviso({
  tipo,
  children,
  cy,
}: {
  tipo: TipoAviso;
  children: ReactNode;
  cy?: string;
}) {
  return (
    <div
      role={tipo === 'error' ? 'alert' : 'status'}
      className={`aviso aviso-${tipo}`}
      data-cy={cy}
    >
      <Icono nombre={ICONO_AVISO[tipo]} />
      <span>{children}</span>
    </div>
  );
}
