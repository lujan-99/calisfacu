import {
  Body,
  Controller,
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
import { EjecutarCentralizacionDto } from './centralizacion.dto';
import { CentralizacionService } from './centralizacion.service';
import { generarExcelPlanilla, generarPdfPlanilla, type DatosExportacion } from './exportacion';

const XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const nombreArchivo = (d: DatosExportacion, extension: string) =>
  `Centralizador_${d.curso.nivelNombre}_${d.curso.anioEscolaridad}${d.curso.paralelo}_T${d.trimestre}_${d.gestion}.${extension}`;

/** Centralización de notas (US-09): la hacen la secretaria y el administrador. */
@ApiTags('centralizacion')
@ApiBearerAuth()
@Roles(Rol.SECRETARIA, Rol.ADMINISTRADOR)
@Controller('centralizador')
export class CentralizacionController {
  constructor(private readonly centralizacion: CentralizacionService) {}

  /** Criterio 1: planilla consolidada del curso en el trimestre, con las materias pendientes (criterio 3). */
  @Get('cursos/:cursoId')
  planilla(
    @Param('cursoId', ParseIntPipe) cursoId: number,
    @Query('trimestreId', ParseIntPipe) trimestreId: number,
  ) {
    return this.centralizacion.planilla(cursoId, trimestreId);
  }

  /** Criterios 1 y 3: centraliza (y, si se pide, cierra el trimestre) solo sin materias pendientes. */
  @Post('cursos/:cursoId/ejecutar')
  @HttpCode(200)
  ejecutar(
    @Param('cursoId', ParseIntPipe) cursoId: number,
    @Body() dto: EjecutarCentralizacionDto,
    @UsuarioActual() usuario: UsuarioToken,
  ) {
    return this.centralizacion.ejecutar(
      cursoId,
      dto.trimestreId,
      dto.cerrarTrimestre ?? false,
      usuario,
    );
  }

  /** Criterio 2: planilla oficial en PDF. */
  @Get('cursos/:cursoId/pdf')
  @Header('X-Content-Type-Options', 'nosniff')
  async pdf(
    @Param('cursoId', ParseIntPipe) cursoId: number,
    @Query('trimestreId', ParseIntPipe) trimestreId: number,
  ) {
    const datos = await this.centralizacion.exportacion(cursoId, trimestreId);
    return new StreamableFile(await generarPdfPlanilla(datos), {
      type: 'application/pdf',
      disposition: `attachment; filename="${nombreArchivo(datos, 'pdf')}"`,
    });
  }

  /** Criterio 2: planilla oficial en Excel (.xlsx). */
  @Get('cursos/:cursoId/excel')
  @Header('X-Content-Type-Options', 'nosniff')
  async excel(
    @Param('cursoId', ParseIntPipe) cursoId: number,
    @Query('trimestreId', ParseIntPipe) trimestreId: number,
  ) {
    const datos = await this.centralizacion.exportacion(cursoId, trimestreId);
    return new StreamableFile(await generarExcelPlanilla(datos), {
      type: XLSX,
      disposition: `attachment; filename="${nombreArchivo(datos, 'xlsx')}"`,
    });
  }
}
