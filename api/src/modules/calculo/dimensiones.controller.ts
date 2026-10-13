import { Body, Controller, Get, Param, ParseIntPipe, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/decoradores';
import { Rol } from '../../database/entities';
import { ConfigurarDimensionesDto } from './dimensiones.dto';
import { DimensionesService } from './dimensiones.service';

/** Dimensiones de evaluación de una gestión (US-18, criterios 6 y 7). */
@ApiTags('dimensiones')
@ApiBearerAuth()
@Controller('gestiones')
export class DimensionesController {
  constructor(private readonly dimensiones: DimensionesService) {}

  @Roles(Rol.ADMINISTRADOR, Rol.SECRETARIA, Rol.PROFESOR)
  @Get(':gestionId/dimensiones')
  listar(@Param('gestionId', ParseIntPipe) gestionId: number) {
    return this.dimensiones.listar(gestionId);
  }

  /** Reemplaza todas las dimensiones de la gestión; deben sumar 100 y la gestión no puede tener notas. */
  @Roles(Rol.ADMINISTRADOR)
  @Put(':gestionId/dimensiones')
  configurar(
    @Param('gestionId', ParseIntPipe) gestionId: number,
    @Body() dto: ConfigurarDimensionesDto,
  ) {
    return this.dimensiones.configurar(gestionId, dto);
  }
}
