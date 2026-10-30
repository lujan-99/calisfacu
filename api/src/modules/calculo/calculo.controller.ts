import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles, UsuarioActual, type UsuarioToken } from '../../common/decoradores';
import { Rol } from '../../database/entities';
import { NotasTrimestralesService } from './notas-trimestrales.service';

/** Nota trimestral de cada estudiante de una materia (US-02), calculada al consultar. */
@ApiTags('calculo')
@ApiBearerAuth()
@Controller('calculo')
export class CalculoController {
  constructor(private readonly notasTrimestrales: NotasTrimestralesService) {}

  @Roles(Rol.PROFESOR, Rol.SECRETARIA, Rol.ADMINISTRADOR)
  @Get('materias/:materiaId/trimestres/:trimestreId')
  notasDeMateria(
    @Param('materiaId', ParseIntPipe) materiaId: number,
    @Param('trimestreId', ParseIntPipe) trimestreId: number,
    @UsuarioActual() usuario: UsuarioToken,
  ) {
    return this.notasTrimestrales.deMateria(materiaId, trimestreId, usuario);
  }
}
