import { Body, Controller, Get, Param, ParseIntPipe, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles, UsuarioActual, type UsuarioToken } from '../../common/decoradores';
import { Rol } from '../../database/entities';
import { CrearActividadDto, RegistrarPlanillaDto } from './notas.dto';
import { NotasService } from './notas.service';

@ApiTags('notas')
@ApiBearerAuth()
@Controller('notas')
export class NotasController {
  constructor(private readonly notas: NotasService) {}

  @Roles(Rol.PROFESOR, Rol.ADMINISTRADOR)
  @Get('actividades/:id')
  planilla(@Param('id', ParseIntPipe) id: number, @UsuarioActual() usuario: UsuarioToken) {
    return this.notas.planilla(id, usuario);
  }

  @Roles(Rol.PROFESOR)
  @Post('actividades')
  crearActividad(@Body() dto: CrearActividadDto, @UsuarioActual() usuario: UsuarioToken) {
    return this.notas.crearActividad(dto, usuario);
  }

  @Roles(Rol.PROFESOR)
  @Post('planilla')
  registrar(@Body() dto: RegistrarPlanillaDto, @UsuarioActual() usuario: UsuarioToken) {
    return this.notas.registrarPlanilla(dto, usuario);
  }
}
