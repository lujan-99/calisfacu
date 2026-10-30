import { Body, Controller, Get, Param, ParseIntPipe, Put, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles, UsuarioActual, type UsuarioToken } from '../../common/decoradores';
import { Rol } from '../../database/entities';
import { FiltroRiesgoDto, UmbralAsistenciaDto } from './panel.dto';
import { PanelService } from './panel.service';

/** Panel de riesgo académico (US-06): el profesor asignado a la materia, la secretaria y el administrador. */
@ApiTags('panel')
@ApiBearerAuth()
@Controller('materias')
export class PanelRiesgoController {
  constructor(private readonly panel: PanelService) {}

  @Roles(Rol.PROFESOR, Rol.SECRETARIA, Rol.ADMINISTRADOR)
  @Get(':id/riesgo')
  riesgo(
    @Param('id', ParseIntPipe) id: number,
    @Query() filtro: FiltroRiesgoDto,
    @UsuarioActual() usuario: UsuarioToken,
  ) {
    return this.panel.riesgo(id, usuario, filtro.trimestreId);
  }
}

@ApiTags('panel')
@ApiBearerAuth()
@Controller('gestiones')
export class UmbralAsistenciaController {
  constructor(private readonly panel: PanelService) {}

  @Roles(Rol.ADMINISTRADOR)
  @Put(':gestionId/umbral-asistencia')
  cambiar(@Param('gestionId', ParseIntPipe) gestionId: number, @Body() dto: UmbralAsistenciaDto) {
    return this.panel.cambiarUmbral(gestionId, dto.umbralAsistencia);
  }
}
