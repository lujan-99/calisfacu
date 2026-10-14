// Utilidades de las pruebas de pantallas: la aplicación completa con un enrutador en memoria y una sesión ya iniciada.
import { render } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { vi } from 'vitest';
import { rutas } from './App';
import * as api from './lib/api';
import type { Rol } from './lib/api';
import { InstitucionProvider } from './lib/institucion';
import { SesionProvider } from './lib/sesion';

export const USUARIOS: Record<Rol, api.Usuario> = {
  PROFESOR: { id: 3, nombre: 'Rosa Mamani Condori', rol: 'PROFESOR' },
  SECRETARIA: { id: 2, nombre: 'Marta Rojas Vargas', rol: 'SECRETARIA' },
  ADMINISTRADOR: { id: 1, nombre: 'Jorge Apaza Ticona', rol: 'ADMINISTRADOR' },
  PADRE: { id: 5, nombre: 'Juana Limachi Mamani', rol: 'PADRE' },
};

/** Renderiza la aplicación en `ruta` con la sesión del rol indicado (o sin sesión). */
export function abrir(ruta: string, rol?: Rol) {
  vi.spyOn(api, 'obtenerInstitucion').mockResolvedValue({
    nombre: 'Unidad Educativa Juana Azurduy',
    codigoSie: '80980123',
    colores: { marca: '#13283F', primario: '#1D4E89', acento: '#F2B33D' },
    logoVersion: null,
  });
  const enrutador = createMemoryRouter(rutas, { initialEntries: [ruta] });
  const resultado = render(
    <InstitucionProvider>
      <SesionProvider inicial={rol ? { token: 't', usuario: USUARIOS[rol] } : null}>
        <RouterProvider router={enrutador} />
      </SesionProvider>
    </InstitucionProvider>,
  );
  return { ...resultado, enrutador };
}

export const GESTION = { id: 1, anio: 2026 };
export const CURSO = { id: 1, nombre: 'Secundaria 4.º «A»' };
export const MATERIA: api.Materia = {
  id: 7,
  nombre: 'Matemática',
  curso: CURSO,
  gestion: GESTION,
  profesor: { id: 3, nombre: 'Rosa Mamani Condori' },
};
export const DIMENSIONES: api.Dimension[] = [
  { id: 11, codigo: 'SER', nombre: 'Ser', puntajeMaximo: 10, orden: 1 },
  { id: 12, codigo: 'SABER', nombre: 'Saber', puntajeMaximo: 45, orden: 2 },
  { id: 13, codigo: 'HACER', nombre: 'Hacer', puntajeMaximo: 40, orden: 3 },
  { id: 14, codigo: 'AUTOEVALUACION', nombre: 'Autoevaluación', puntajeMaximo: 5, orden: 4 },
];
export const TRIMESTRES: api.Trimestre[] = [
  { id: 21, numero: 1, cerrado: true },
  { id: 22, numero: 2, cerrado: false },
  { id: 23, numero: 3, cerrado: false },
];
