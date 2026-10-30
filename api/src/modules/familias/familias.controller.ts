import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles, UsuarioActual, type UsuarioToken } from '../../common/decoradores';
import { Rol } from '../../database/entities';
import { CrearVinculoDto, FiltroVinculosDto } from './familias.dto';
import { VinculosService } from './vinculos.service';

/** Quienes vinculan padres con estudiantes (US-20, criterio 1). */
const GESTION_ACADEMICA = [Rol.SECRETARIA, Rol.ADMINISTRADOR] as const;

@ApiTags('vinculos-familiares')
@ApiBearerAuth()
@Controller('padres')
export class PadresController {
  constructor(private readonly vinculos: VinculosService) {}

  /** Padres de familia activos que se pueden vincular. */
  @Roles(...GESTION_ACADEMICA)
  @Get()
  listar() {
    return this.vinculos.padres();
  }
}

@ApiTags('vinculos-familiares')
@ApiBearerAuth()
@Roles(...GESTION_ACADEMICA)
@Controller('vinculos-familiares')
export class VinculosFamiliaresController {
  constructor(private readonly vinculos: VinculosService) {}

  @Get()
  listar(@Query() filtro: FiltroVinculosDto) {
    return this.vinculos.listar(filtro);
  }

  @Post()
  crear(@Body() dto: CrearVinculoDto) {
    return this.vinculos.crear(dto);
  }

  @Delete(':padreId/:estudianteId')
  @HttpCode(204)
  borrar(
    @Param('padreId', ParseIntPipe) padreId: number,
    @Param('estudianteId', ParseIntPipe) estudianteId: number,
  ) {
    return this.vinculos.borrar(padreId, estudianteId);
  }
}

/** Portal del padre de familia: solo sus hijos vinculados (US-20, criterios 1 y 2). */
@ApiTags('vinculos-familiares')
@ApiBearerAuth()
@Roles(Rol.PADRE)
@Controller('padre/hijos')
export class HijosController {
  constructor(private readonly vinculos: VinculosService) {}

  @Get()
  listar(@UsuarioActual() usuario: UsuarioToken) {
    return this.vinculos.hijos(usuario);
  }

  @Get(':estudianteId')
  detalle(
    @Param('estudianteId', ParseIntPipe) estudianteId: number,
    @UsuarioActual() usuario: UsuarioToken,
  ) {
    return this.vinculos.hijo(estudianteId, usuario);
  }
}
