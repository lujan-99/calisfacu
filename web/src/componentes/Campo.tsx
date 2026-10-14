import type { ReactNode } from 'react';

/** Etiqueta, campo y mensaje de error o de ayuda, juntos. */
export function Campo({
  etiqueta,
  error,
  ayuda,
  children,
}: {
  etiqueta: string;
  error?: string;
  ayuda?: string;
  children: ReactNode;
}) {
  return (
    <label className="campo">
      {etiqueta}
      {children}
      {error ? (
        <span className="campo-error">{error}</span>
      ) : (
        ayuda && <span className="campo-ayuda">{ayuda}</span>
      )}
    </label>
  );
}
