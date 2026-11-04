import {
  AsignacionMateria,
  Curso,
  DimensionEvaluacion,
  Estudiante,
  Gestion,
  Materia,
  Trimestre,
  UnidadEducativa,
  VinculoPadre,
} from './academico.entity';
import {
  Actividad,
  AlertaPromedio,
  Asistencia,
  Centralizacion,
  EntregaNotas,
  Nota,
  PublicacionBoletin,
  RegistroAuditoria,
  SolicitudEdicion,
  SolicitudEdicionEstudiante,
} from './evaluacion.entity';
import { Usuario } from './usuario.entity';

export * from './academico.entity';
export * from './enums';
export * from './evaluacion.entity';
export * from './usuario.entity';

export const ENTIDADES = [
  Usuario,
  UnidadEducativa,
  Gestion,
  Trimestre,
  DimensionEvaluacion,
  Curso,
  Materia,
  AsignacionMateria,
  Estudiante,
  VinculoPadre,
  Actividad,
  Nota,
  RegistroAuditoria,
  Asistencia,
  EntregaNotas,
  PublicacionBoletin,
  Centralizacion,
  AlertaPromedio,
  SolicitudEdicion,
  SolicitudEdicionEstudiante,
];
