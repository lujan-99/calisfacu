import { Body, Controller, Get, Param, ParseIntPipe, Put, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Roles, UsuarioActual, type UsuarioToken } from '../../common/decoradores';
import { Rol } from '../../database/entities';
import { RegistrarAsistenciaDto } from './asistencia.dto';
import { AsistenciaService } from './asistencia.service';

/** Asistencia por clase (US-19). Las fechas van en formato AAAA-MM-DD. */
@ApiTags('asistencia')
@ApiBearerAuth()
@Controller('asistencias')
export class AsistenciaController {
  constructor(private readonly asistencia: AsistenciaService) {}

  @Roles(Rol.PROFESOR, Rol.SECRETARIA, Rol.ADMINISTRADOR)
  @Get('materias/:materiaId/fechas/:fecha')
  lista(
    @Param('materiaId', ParseIntPipe) materiaId: number,
    @Param('fecha') fecha: string,
    @UsuarioActual() usuario: UsuarioToken,
  ) {
    return this.asistencia.lista(materiaId, fecha, usuario);
  }

  /** Guarda o corrige la asistencia de la clase de esa fecha; exige todos los estudiantes del curso. */
  @Roles(Rol.PROFESOR)
  @Put('materias/:materiaId/fechas/:fecha')
  registrar(
    @Param('materiaId', ParseIntPipe) materiaId: number,
    @Param('fecha') fecha: string,
    @Body() dto: RegistrarAsistenciaDto,
    @UsuarioActual() usuario: UsuarioToken,
  ) {
    return this.asistencia.registrar(materiaId, fecha, dto, usuario);
  }

  @Roles(Rol.PROFESOR, Rol.SECRETARIA, Rol.ADMINISTRADOR)
  @ApiQuery({ name: 'desde', required: false, example: '2026-02-02' })
  @ApiQuery({ name: 'hasta', required: false, example: '2026-05-08' })
  @Get('materias/:materiaId/porcentajes')
  porcentajes(
    @Param('materiaId', ParseIntPipe) materiaId: number,
    @UsuarioActual() usuario: UsuarioToken,
    @Query('desde') desde?: string,
    @Query('hasta') hasta?: string,
  ) {
    return this.asistencia.porcentajes(materiaId, usuario, desde, hasta);
  }
}
