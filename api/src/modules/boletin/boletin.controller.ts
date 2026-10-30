import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  HttpCode,
  Param,
  ParseIntPipe,
  Post,
  Query,
  StreamableFile,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles, UsuarioActual, type UsuarioToken } from '../../common/decoradores';
import { Rol } from '../../database/entities';
import { BoletinPadreService } from './boletin-padre.service';
import { BoletinService } from './boletin.service';
import { ColaBoletinesService } from './cola-boletines.service';
import { generarPdfBoletines } from './pdf';
import { FiltroPublicacionesDto, PublicarBoletinDto } from './publicaciones.dto';
import { PublicacionesService } from './publicaciones.service';

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

  /** Lista del curso para la pantalla de boletines del profesor. */
  @Get('cursos/:id/estudiantes')
  estudiantesDelCurso(
    @Param('id', ParseIntPipe) id: number,
    @UsuarioActual() usuario: UsuarioToken,
  ) {
    return this.boletines.resumenCurso(id, usuario);
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

/** Publicación del boletín por curso y trimestre (US-11, decisión D20). */
@ApiTags('boletin')
@ApiBearerAuth()
@Roles(Rol.SECRETARIA, Rol.ADMINISTRADOR)
@Controller('boletines/publicaciones')
export class PublicacionesController {
  constructor(private readonly publicaciones: PublicacionesService) {}

  @Get()
  listar(@Query() filtro: FiltroPublicacionesDto) {
    return this.publicaciones.listar(filtro.cursoId);
  }

  @Post()
  publicar(@Body() dto: PublicarBoletinDto, @UsuarioActual() usuario: UsuarioToken) {
    return this.publicaciones.publicar(dto.cursoId, dto.trimestreId, usuario);
  }

  @Delete(':cursoId/:trimestreId')
  @HttpCode(204)
  despublicar(
    @Param('cursoId', ParseIntPipe) cursoId: number,
    @Param('trimestreId', ParseIntPipe) trimestreId: number,
  ) {
    return this.publicaciones.despublicar(cursoId, trimestreId);
  }
}

/** Boletín de sus hijos para el padre de familia (US-11, criterios 1 y 2). */
@ApiTags('boletin')
@ApiBearerAuth()
@Roles(Rol.PADRE)
@Controller('padre/hijos')
export class BoletinPadreController {
  constructor(private readonly boletin: BoletinPadreService) {}

  @Get(':estudianteId/boletin')
  detalle(
    @Param('estudianteId', ParseIntPipe) estudianteId: number,
    @UsuarioActual() usuario: UsuarioToken,
  ) {
    return this.boletin.detalle(estudianteId, usuario);
  }

  @Get(':estudianteId/boletin/pdf')
  @Header('X-Content-Type-Options', 'nosniff')
  async pdf(
    @Param('estudianteId', ParseIntPipe) estudianteId: number,
    @UsuarioActual() usuario: UsuarioToken,
  ) {
    const { datos, nombre } = await this.boletin.pdf(estudianteId, usuario);
    return pdf(datos, nombre);
  }
}
