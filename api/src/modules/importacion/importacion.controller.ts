import {
  Controller,
  Get,
  Header,
  Param,
  ParseIntPipe,
  Post,
  StreamableFile,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { Roles, UsuarioActual, type UsuarioToken } from '../../common/decoradores';
import { Rol } from '../../database/entities';
import { IMPORTACION_MAX_BYTES, ImportacionService } from './importacion.service';

/** Lo único que la subida de archivos aporta aquí: el contenido. */
interface ArchivoSubido {
  buffer: Buffer;
}

const TIPO_XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const subida = () =>
  UseInterceptors(
    FileInterceptor('archivo', { limits: { fileSize: IMPORTACION_MAX_BYTES, files: 1 } }),
  );
const cuerpo = () =>
  ApiBody({
    schema: { type: 'object', properties: { archivo: { type: 'string', format: 'binary' } } },
  });

/** Importación de notas desde Excel (US-05). Solo el profesor asignado a la materia de la actividad. */
@ApiTags('importacion')
@ApiBearerAuth()
@Controller('importaciones')
export class ImportacionController {
  constructor(private readonly importacion: ImportacionService) {}

  @Roles(Rol.PROFESOR)
  @Get('actividades/:id/plantilla')
  @Header('X-Content-Type-Options', 'nosniff')
  async plantilla(@Param('id', ParseIntPipe) id: number, @UsuarioActual() usuario: UsuarioToken) {
    const { datos, nombre } = await this.importacion.plantilla(id, usuario);
    return new StreamableFile(datos, {
      type: TIPO_XLSX,
      disposition: `attachment; filename="${nombre}"`,
    });
  }

  /** Criterio 1: vista previa; no guarda nada. */
  @Roles(Rol.PROFESOR)
  @Post('actividades/:id/vista-previa')
  @ApiConsumes('multipart/form-data')
  @cuerpo()
  @subida()
  vistaPrevia(
    @Param('id', ParseIntPipe) id: number,
    @UsuarioActual() usuario: UsuarioToken,
    @UploadedFile() archivo?: ArchivoSubido,
  ) {
    return this.importacion.vistaPrevia(id, archivo?.buffer, usuario);
  }

  /** Criterios 2 y 3: vuelve a validar el mismo archivo y guarda las filas válidas. */
  @Roles(Rol.PROFESOR)
  @Post('actividades/:id/confirmar')
  @ApiConsumes('multipart/form-data')
  @cuerpo()
  @subida()
  confirmar(
    @Param('id', ParseIntPipe) id: number,
    @UsuarioActual() usuario: UsuarioToken,
    @UploadedFile() archivo?: ArchivoSubido,
  ) {
    return this.importacion.confirmar(id, archivo?.buffer, usuario);
  }
}
