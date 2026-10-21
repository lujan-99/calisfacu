import { Body, Controller, Get, Param, ParseIntPipe, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Roles, UsuarioActual, type UsuarioToken } from '../../common/decoradores';
import { Rol } from '../../database/entities';
import { EntregarNotasDto } from './entregas.dto';
import { EntregasService } from './entregas.service';

/** Control de entrega de notas (US-10). La secretaria hace el seguimiento; el profesor entrega su materia. */
@ApiTags('entregas')
@ApiBearerAuth()
@Controller('entregas')
export class EntregasController {
  constructor(private readonly entregas: EntregasService) {}

  /** Sin trimestre: el primero abierto de la gestión indicada o de la última (decisión D13). */
  @Roles(Rol.SECRETARIA, Rol.ADMINISTRADOR)
  @ApiQuery({ name: 'gestionId', required: false })
  @ApiQuery({ name: 'trimestreId', required: false })
  @Get()
  control(
    @Query('gestionId', new ParseIntPipe({ optional: true })) gestionId?: number,
    @Query('trimestreId', new ParseIntPipe({ optional: true })) trimestreId?: number,
  ) {
    return this.entregas.control(gestionId, trimestreId);
  }

  @Roles(Rol.PROFESOR, Rol.SECRETARIA, Rol.ADMINISTRADOR)
  @Get('materias/:materiaId')
  estado(
    @Param('materiaId', ParseIntPipe) materiaId: number,
    @Query('trimestreId', ParseIntPipe) trimestreId: number,
    @UsuarioActual() usuario: UsuarioToken,
  ) {
    return this.entregas.estado(materiaId, trimestreId, usuario);
  }

  @Roles(Rol.PROFESOR)
  @Post('materias/:materiaId/entregar')
  entregar(
    @Param('materiaId', ParseIntPipe) materiaId: number,
    @Body() dto: EntregarNotasDto,
    @UsuarioActual() usuario: UsuarioToken,
  ) {
    return this.entregas.entregar(materiaId, dto.trimestreId, usuario);
  }
}
