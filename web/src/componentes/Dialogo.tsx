import { useEffect, useRef, type ReactNode } from 'react';

/**
 * Diálogo modal accesible: enfoca el primer campo al abrir, Escape lo cierra, Tab no sale del diálogo y al cerrar el
 * foco vuelve al botón que lo abrió.
 */
export function Dialogo({
  titulo,
  alCerrar,
  children,
  rol = 'dialog',
  cy,
}: {
  titulo: string;
  alCerrar: () => void;
  children: ReactNode;
  rol?: 'dialog' | 'alertdialog';
  cy?: string;
}) {
  const caja = useRef<HTMLDivElement>(null);
  const alCerrarRef = useRef(alCerrar);
  alCerrarRef.current = alCerrar;
  const idTitulo = `dialogo-${titulo.replace(/\W+/g, '-').toLowerCase()}`;

  useEffect(() => {
    const anterior = document.activeElement as HTMLElement | null;
    const enfocables = () =>
      Array.from(
        caja.current?.querySelectorAll<HTMLElement>(
          'input:not([disabled]), select:not([disabled]), button:not([disabled]), a[href]',
        ) ?? [],
      );
    (caja.current?.querySelector<HTMLElement>('input, select') ?? enfocables()[0])?.focus();
    const teclas = (e: KeyboardEvent) => {
      if (e.key === 'Escape') alCerrarRef.current();
      if (e.key !== 'Tab') return;
      const lista = enfocables();
      if (lista.length === 0) return;
      const [primero, ultimo] = [lista[0], lista[lista.length - 1]];
      if (e.shiftKey && document.activeElement === primero) {
        e.preventDefault();
        ultimo.focus();
      } else if (!e.shiftKey && document.activeElement === ultimo) {
        e.preventDefault();
        primero.focus();
      }
    };
    document.addEventListener('keydown', teclas);
    return () => {
      document.removeEventListener('keydown', teclas);
      anterior?.focus();
    };
  }, []);

  return (
    <div className="velo" onMouseDown={(e) => e.target === e.currentTarget && alCerrar()}>
      <div
        ref={caja}
        className="dialogo"
        role={rol}
        aria-modal="true"
        aria-labelledby={idTitulo}
        data-cy={cy}
      >
        <h2 id={idTitulo}>{titulo}</h2>
        {children}
      </div>
    </div>
  );
}

/** Confirmación antes de borrar: el diseño la pide para toda eliminación. */
export function ConfirmarBorrado({
  titulo,
  children,
  alConfirmar,
  alCerrar,
  borrando,
}: {
  titulo: string;
  children: ReactNode;
  alConfirmar: () => void;
  alCerrar: () => void;
  borrando: boolean;
}) {
  return (
    <Dialogo titulo={titulo} alCerrar={alCerrar} rol="alertdialog" cy="dialogo-eliminar">
      <p className="ayuda">{children} Esta acción no se puede deshacer.</p>
      <div className="dialogo-acciones">
        <button
          type="button"
          className="boton boton-secundario"
          data-cy="btn-cancelar"
          onClick={alCerrar}
        >
          Cancelar
        </button>
        <button
          type="button"
          className="boton boton-peligro"
          data-cy="btn-confirmar-eliminar"
          onClick={alConfirmar}
          disabled={borrando}
        >
          {borrando ? 'Eliminando…' : 'Eliminar'}
        </button>
      </div>
    </Dialogo>
  );
}
