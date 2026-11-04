import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Roles, UsuarioActual, type UsuarioToken } from '../../common/decoradores';
import { Rol } from '../../database/entities';
import { AlertasService } from './alertas.service';
import { AtenderAlertaDto } from './notificaciones.dto';

/** Alertas de promedio bajo (US-08): el aviso dentro del sistema para el profesor de la materia. */
@ApiTags('notificaciones')
@ApiBearerAuth()
@Controller('notificaciones/alertas')
export class AlertasController {
  constructor(private readonly alertas: AlertasService) {}

  @Roles(Rol.PROFESOR, Rol.SECRETARIA, Rol.ADMINISTRADOR)
  @ApiQuery({ name: 'materiaId', required: false })
  @Get()
  listar(
    @UsuarioActual() usuario: UsuarioToken,
    @Query('materiaId', new ParseIntPipe({ optional: true })) materiaId?: number,
  ) {
    return this.alertas.listar(usuario, materiaId);
  }

  @Roles(Rol.PROFESOR)
  @Patch(':id/leer')
  @HttpCode(204)
  async leer(@Param('id', ParseIntPipe) id: number, @UsuarioActual() usuario: UsuarioToken) {
    await this.alertas.marcarLeida(id, usuario);
  }

  @Roles(Rol.PROFESOR)
  @Post(':id/atender')
  @HttpCode(200)
  atender(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AtenderAlertaDto,
    @UsuarioActual() usuario: UsuarioToken,
  ) {
    return this.alertas.atender(id, dto.notaAtencion, usuario);
  }
}
