import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles, UsuarioActual, type UsuarioToken } from '../../common/decoradores';
import { Rol } from '../../database/entities';
import {
  CrearCursoDto,
  CrearMateriaDto,
  DatosCursoDto,
  DatosEstudianteDto,
  DatosMateriaDto,
  FiltroCursosDto,
  FiltroEstudiantesDto,
  FiltroMateriasDto,
} from './academico.dto';
import { CursosService } from './cursos.service';
import { EstudiantesService } from './estudiantes.service';
import { GestionesService } from './gestiones.service';
import { MateriasService } from './materias.service';

/** Quienes administran la gestión académica (T-016). */
const GESTION_ACADEMICA = [Rol.SECRETARIA, Rol.ADMINISTRADOR] as const;

@ApiTags('gestiones')
@ApiBearerAuth()
@Controller('gestiones')
export class GestionesController {
  constructor(private readonly gestiones: GestionesService) {}

  @Roles(Rol.ADMINISTRADOR, Rol.SECRETARIA, Rol.PROFESOR)
  @Get()
  listar() {
    return this.gestiones.listar();
  }

  @Roles(Rol.ADMINISTRADOR, Rol.SECRETARIA, Rol.PROFESOR)
  @Get(':gestionId/trimestres')
  trimestres(@Param('gestionId', ParseIntPipe) gestionId: number) {
    return this.gestiones.trimestresDe(gestionId);
  }
}

/** Cursos de una gestión (US-18, criterio 1). */
@ApiTags('cursos')
@ApiBearerAuth()
@Roles(...GESTION_ACADEMICA)
@Controller('cursos')
export class CursosController {
  constructor(private readonly cursos: CursosService) {}

  @Get()
  listar(@Query() filtro: FiltroCursosDto) {
    return this.cursos.listar(filtro);
  }

  @Post()
  crear(@Body() dto: CrearCursoDto) {
    return this.cursos.crear(dto);
  }

  @Put(':id')
  actualizar(@Param('id', ParseIntPipe) id: number, @Body() dto: DatosCursoDto) {
    return this.cursos.actualizar(id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  borrar(@Param('id', ParseIntPipe) id: number) {
    return this.cursos.borrar(id);
  }
}

/** Estudiantes inscritos (US-18, criterio 3). */
@ApiTags('estudiantes')
@ApiBearerAuth()
@Roles(...GESTION_ACADEMICA)
@Controller('estudiantes')
export class EstudiantesController {
  constructor(private readonly estudiantes: EstudiantesService) {}

  @Get()
  listar(@Query() filtro: FiltroEstudiantesDto) {
    return this.estudiantes.listar(filtro);
  }

  @Post()
  crear(@Body() dto: DatosEstudianteDto) {
    return this.estudiantes.crear(dto);
  }

  @Put(':id')
  actualizar(@Param('id', ParseIntPipe) id: number, @Body() dto: DatosEstudianteDto) {
    return this.estudiantes.actualizar(id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  borrar(@Param('id', ParseIntPipe) id: number) {
    return this.estudiantes.borrar(id);
  }
}

/** Materias, su profesor y "Mis materias" (US-18, criterio 2). */
@ApiTags('materias')
@ApiBearerAuth()
@Controller('materias')
export class MateriasController {
  constructor(private readonly materias: MateriasService) {}

  @Roles(...GESTION_ACADEMICA)
  @Get()
  listar(@Query() filtro: FiltroMateriasDto) {
    return this.materias.listar(filtro);
  }

  /** Va antes de ':id' para que "mias" no se lea como un número. */
  @Roles(Rol.PROFESOR)
  @Get('mias')
  mias(@UsuarioActual() usuario: UsuarioToken) {
    return this.materias.mias(usuario);
  }

  @Roles(Rol.PROFESOR, ...GESTION_ACADEMICA)
  @Get(':id')
  detalle(@Param('id', ParseIntPipe) id: number, @UsuarioActual() usuario: UsuarioToken) {
    return this.materias.detalle(id, usuario);
  }

  @Roles(...GESTION_ACADEMICA)
  @Post()
  crear(@Body() dto: CrearMateriaDto) {
    return this.materias.crear(dto);
  }

  @Roles(...GESTION_ACADEMICA)
  @Put(':id')
  actualizar(@Param('id', ParseIntPipe) id: number, @Body() dto: DatosMateriaDto) {
    return this.materias.actualizar(id, dto);
  }

  @Roles(...GESTION_ACADEMICA)
  @Delete(':id')
  @HttpCode(204)
  borrar(@Param('id', ParseIntPipe) id: number) {
    return this.materias.borrar(id);
  }
}

@ApiTags('materias')
@ApiBearerAuth()
@Controller('profesores')
export class ProfesoresController {
  constructor(private readonly materias: MateriasService) {}

  /** Profesores activos que se pueden asignar a una materia. */
  @Roles(...GESTION_ACADEMICA)
  @Get()
  listar() {
    return this.materias.profesores();
  }
}
