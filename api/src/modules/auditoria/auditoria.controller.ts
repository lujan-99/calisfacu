import { Body, Controller, Get, Param, ParseIntPipe, Patch } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles, UsuarioActual, type UsuarioToken } from '../../common/decoradores';
import { Rol } from '../../database/entities';
import { CorregirNotaDto } from './auditoria.dto';
import { AuditoriaService } from './auditoria.service';

/** No existen rutas para editar ni borrar registros de auditoría (US-04, criterio 2). */
@ApiTags('auditoria')
@ApiBearerAuth()
@Controller('notas')
export class AuditoriaController {
  constructor(private readonly auditoria: AuditoriaService) {}

  @Roles(Rol.PROFESOR)
  @Patch(':id/correccion')
  corregir(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CorregirNotaDto,
    @UsuarioActual() usuario: UsuarioToken,
  ) {
    return this.auditoria.corregir(id, dto.valor, dto.motivo, usuario);
  }

  @Roles(Rol.PROFESOR, Rol.ADMINISTRADOR)
  @Get(':id/historial')
  historial(@Param('id', ParseIntPipe) id: number, @UsuarioActual() usuario: UsuarioToken) {
    return this.auditoria.historial(id, usuario);
  }
}
