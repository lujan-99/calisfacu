import type { InputHTMLAttributes, ReactNode } from 'react';

interface Props extends Omit<InputHTMLAttributes<HTMLInputElement>, 'id' | 'className'> {
  /** ID único del campo; también se usa como `htmlFor` de la etiqueta. */
  id: string;
  etiqueta: string;
  error?: string;
  /** Nodo opcional que se añade al final del grupo (ej.: botón "ver contraseña"). */
  accion?: ReactNode;
}

/**
 * Campo de formulario reutilizable: etiqueta + input + mensaje de error opcional.
 * Cero duplicación en Login y en cualquier formulario futuro (M07).
 * ARIA: aria-invalid y aria-describedby cuando hay error (RNF-06).
 */
export function CampoFormulario({ id, etiqueta, error, accion, ...inputProps }: Props) {
  const errorId = error ? `${id}-error` : undefined;

  return (
    <div className="campo-grupo">
      <label htmlFor={id} className="campo-etiqueta">
        {etiqueta}
      </label>
      <div className="campo-entrada-envoltorio">
        <input
          id={id}
          className="campo-control"
          aria-invalid={error !== undefined ? 'true' : undefined}
          aria-describedby={errorId}
          {...inputProps}
        />
        {accion}
      </div>
      {error !== undefined && (
        <span id={errorId} className="campo-error" role="alert">
          {error}
        </span>
      )}
    </div>
  );
}
