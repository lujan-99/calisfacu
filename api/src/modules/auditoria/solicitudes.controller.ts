import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles, UsuarioActual, type UsuarioToken } from '../../common/decoradores';
import { Rol } from '../../database/entities';
import { CrearSolicitudDto, FiltroSolicitudesDto, RechazarSolicitudDto } from './solicitudes.dto';
import { SolicitudesService } from './solicitudes.service';

/** Solicitudes de edición de notas registradas (decisión D16). */
@ApiTags('auditoria')
@ApiBearerAuth()
@Controller('solicitudes-edicion')
export class SolicitudesController {
  constructor(private readonly solicitudes: SolicitudesService) {}

  @Roles(Rol.PROFESOR)
  @Post()
  crear(@Body() dto: CrearSolicitudDto, @UsuarioActual() usuario: UsuarioToken) {
    return this.solicitudes.crear(dto, usuario);
  }

  @Roles(Rol.PROFESOR, Rol.ADMINISTRADOR)
  @Get()
  listar(@Query() filtro: FiltroSolicitudesDto, @UsuarioActual() usuario: UsuarioToken) {
    return this.solicitudes.listar(filtro, usuario);
  }

  @Roles(Rol.ADMINISTRADOR)
  @Patch(':id/aprobar')
  aprobar(@Param('id', ParseIntPipe) id: number, @UsuarioActual() usuario: UsuarioToken) {
    return this.solicitudes.resolver(id, usuario, true);
  }

  @Roles(Rol.ADMINISTRADOR)
  @Patch(':id/rechazar')
  rechazar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: RechazarSolicitudDto,
    @UsuarioActual() usuario: UsuarioToken,
  ) {
    return this.solicitudes.resolver(id, usuario, false, dto.observacion);
  }
}
