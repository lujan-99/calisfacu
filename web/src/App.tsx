import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom';
import { Marco } from './componentes/Marco';
import { RutaProtegida } from './componentes/RutaProtegida';
import { INICIO_POR_ROL } from './lib/formato';
import { InstitucionProvider } from './lib/institucion';
import { SesionProvider, useSesion } from './lib/sesion';
import { Dimensiones } from './pages/admin/Dimensiones';
import { SolicitudesEdicion } from './pages/admin/SolicitudesEdicion';
import { Login } from './pages/Login';
import { NoEncontrada } from './pages/NoEncontrada';
import { AsistenciaMateria } from './pages/profesor/AsistenciaMateria';
import { Boletin } from './pages/padre/Boletin';
import { GenerarBoletines } from './pages/profesor/GenerarBoletines';
import { HistorialEstudiante } from './pages/profesor/HistorialEstudiante';
import { ImportarNotas } from './pages/profesor/ImportarNotas';
import { MateriaActividades } from './pages/profesor/MateriaActividades';
import { MisMaterias } from './pages/profesor/MisMaterias';
import { NotasTrimestre } from './pages/profesor/NotasTrimestre';
import { PanelRiesgo } from './pages/profesor/PanelRiesgo';
import { Planilla } from './pages/profesor/Planilla';
import { ControlEntregas } from './pages/secretaria/ControlEntregas';
import { Cursos } from './pages/secretaria/Cursos';
import { Estudiantes } from './pages/secretaria/Estudiantes';
import { Materias } from './pages/secretaria/Materias';
import { UnidadEducativa } from './pages/secretaria/UnidadEducativa';

function Inicio() {
  const { usuario } = useSesion();
  return <Navigate to={usuario ? INICIO_POR_ROL[usuario.rol] : '/ingresar'} replace />;
}

/** Rutas de la aplicación: cada rol tiene las suyas (US-17, criterio 1). */
export const rutas = [
  { path: '/ingresar', element: <Login /> },
  { path: '/', element: <Inicio /> },
  {
    element: <Marco />,
    children: [
      {
        element: <RutaProtegida roles={['PROFESOR']} />,
        children: [
          { path: '/profesor/materias', element: <MisMaterias /> },
          { path: '/profesor/materias/:materiaId', element: <MateriaActividades /> },
          { path: '/profesor/materias/:materiaId/actividades/:actividadId', element: <Planilla /> },
          {
            path: '/profesor/materias/:materiaId/actividades/:actividadId/importar',
            element: <ImportarNotas />,
          },
          { path: '/profesor/materias/:materiaId/asistencia', element: <AsistenciaMateria /> },
          { path: '/profesor/materias/:materiaId/notas', element: <NotasTrimestre /> },
          { path: '/profesor/materias/:materiaId/riesgo', element: <PanelRiesgo /> },
          { path: '/profesor/materias/:materiaId/boletines', element: <GenerarBoletines /> },
          {
            path: '/profesor/estudiantes/:estudianteId/historial',
            element: <HistorialEstudiante />,
          },
        ],
      },
      {
        element: <RutaProtegida roles={['SECRETARIA', 'ADMINISTRADOR']} />,
        children: [
          { path: '/secretaria/cursos', element: <Cursos /> },
          { path: '/secretaria/estudiantes', element: <Estudiantes /> },
          { path: '/secretaria/materias', element: <Materias /> },
          { path: '/secretaria/control-entregas', element: <ControlEntregas /> },
          { path: '/secretaria/unidad-educativa', element: <UnidadEducativa /> },
        ],
      },
      {
        element: <RutaProtegida roles={['ADMINISTRADOR']} />,
        children: [
          { path: '/admin/dimensiones', element: <Dimensiones /> },
          { path: '/admin/solicitudes-edicion', element: <SolicitudesEdicion /> },
        ],
      },
      {
        element: <RutaProtegida roles={['PADRE']} />,
        children: [{ path: '/padre/boletin', element: <Boletin /> }],
      },
      {
        element: <RutaProtegida roles={['PROFESOR', 'SECRETARIA', 'ADMINISTRADOR', 'PADRE']} />,
        children: [{ path: '*', element: <NoEncontrada /> }],
      },
    ],
  },
];

const enrutador = createBrowserRouter(rutas);

export function App() {
  return (
    <InstitucionProvider>
      <SesionProvider>
        <RouterProvider router={enrutador} />
      </SesionProvider>
    </InstitucionProvider>
  );
}
