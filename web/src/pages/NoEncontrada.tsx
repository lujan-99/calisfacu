import { Link } from 'react-router-dom';
import { Vacio } from '../componentes/Estados';

export function NoEncontrada() {
  return (
    <>
      <Vacio
        titulo="Esta página no existe"
        texto="Revise la dirección o vuelva al inicio."
        icono="documento"
        cy="no-encontrada"
      />
      <Link to="/" className="boton boton-secundario" style={{ alignSelf: 'center' }}>
        Volver al inicio
      </Link>
    </>
  );
}
