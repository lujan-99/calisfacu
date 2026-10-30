import {
  Controller,
  Get,
  Header,
  HttpCode,
  Param,
  ParseIntPipe,
  Post,
  StreamableFile,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles, UsuarioActual, type UsuarioToken } from '../../common/decoradores';
import { Rol } from '../../database/entities';
import { BoletinService } from './boletin.service';
import { ColaBoletinesService } from './cola-boletines.service';
import { generarPdfBoletines } from './pdf';

const QUIENES_GENERAN = [Rol.PROFESOR, Rol.SECRETARIA, Rol.ADMINISTRADOR] as const;
const pdf = (datos: Buffer, nombre: string) =>
  new StreamableFile(datos, {
    type: 'application/pdf',
    disposition: `attachment; filename="${nombre}"`,
  });

/** Boletín de notas en PDF (US-07): uno por estudiante en la petición y los de un curso en la cola. */
@ApiTags('boletin')
@ApiBearerAuth()
@Roles(...QUIENES_GENERAN)
@Controller('boletines')
export class BoletinController {
  constructor(
    private readonly boletines: BoletinService,
    private readonly cola: ColaBoletinesService,
  ) {}

  /** Los datos que lleva el PDF (criterio 1). */
  @Get('estudiantes/:id')
  datos(@Param('id', ParseIntPipe) id: number, @UsuarioActual() usuario: UsuarioToken) {
    return this.boletines.datos(id, usuario);
  }

  @Get('estudiantes/:id/pdf')
  @Header('X-Content-Type-Options', 'nosniff')
  async pdfEstudiante(
    @Param('id', ParseIntPipe) id: number,
    @UsuarioActual() usuario: UsuarioToken,
  ) {
    const datos = await this.boletines.datos(id, usuario);
    return pdf(await generarPdfBoletines([datos]), `Boletin_${datos.estudiante.codigoRude}.pdf`);
  }

  /** Criterio 3: los boletines del curso se generan en la cola; responde de inmediato con el trabajo. */
  @Post('cursos/:id/cola')
  @HttpCode(202)
  encolar(@Param('id', ParseIntPipe) id: number, @UsuarioActual() usuario: UsuarioToken) {
    return this.cola.encolar(id, usuario);
  }

  @Get('trabajos/:jobId')
  estado(@Param('jobId') jobId: string, @UsuarioActual() usuario: UsuarioToken) {
    return this.cola.estado(jobId, usuario);
  }

  @Get('trabajos/:jobId/pdf')
  @Header('X-Content-Type-Options', 'nosniff')
  async pdfCurso(@Param('jobId') jobId: string, @UsuarioActual() usuario: UsuarioToken) {
    const { datos, nombre } = await this.cola.pdf(jobId, usuario);
    return pdf(datos, nombre);
  }
}
