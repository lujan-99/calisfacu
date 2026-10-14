import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Gestion, Trimestre, UnidadEducativa } from '../../database/entities';
import { NotasModule } from '../notas/notas.module';
import {
  CursosController,
  EstudiantesController,
  GestionesController,
  MateriasController,
  ProfesoresController,
} from './academico.controller';
import { CursosService } from './cursos.service';
import { EstudiantesService } from './estudiantes.service';
import { GestionesService } from './gestiones.service';
import { MateriasService } from './materias.service';
import { InstitucionController, UnidadEducativaController } from './unidad-educativa.controller';
import { UnidadEducativaService } from './unidad-educativa.service';

/** Gestión académica de la secretaria (US-18, T-016) y datos de la institución (ADR-0010). */
@Module({
  imports: [NotasModule, TypeOrmModule.forFeature([Gestion, Trimestre, UnidadEducativa])],
  controllers: [
    GestionesController,
    CursosController,
    EstudiantesController,
    MateriasController,
    ProfesoresController,
    InstitucionController,
    UnidadEducativaController,
  ],
  providers: [
    GestionesService,
    CursosService,
    EstudiantesService,
    MateriasService,
    UnidadEducativaService,
  ],
})
export class AcademicoModule {}
