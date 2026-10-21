import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles, UsuarioActual, type UsuarioToken } from '../../common/decoradores';
import { Rol } from '../../database/entities';
import { HistorialService } from './historial.service';

/** Historial académico del estudiante (US-03). El profesor solo ve a los estudiantes a los que da clases. */
@ApiTags('calculo')
@ApiBearerAuth()
@Controller('estudiantes')
export class HistorialController {
  constructor(private readonly historial: HistorialService) {}

  @Roles(Rol.PROFESOR, Rol.SECRETARIA, Rol.ADMINISTRADOR)
  @Get(':id/historial')
  deEstudiante(@Param('id', ParseIntPipe) id: number, @UsuarioActual() usuario: UsuarioToken) {
    return this.historial.deEstudiante(id, usuario);
  }
}
