import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  HttpCode,
  Put,
  StreamableFile,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { Publico, Roles } from '../../common/decoradores';
import { Rol } from '../../database/entities';
import { ColoresDto, DatosUnidadEducativaDto } from './academico.dto';
import { LOGO_MAX_BYTES } from './apariencia';
import { UnidadEducativaService } from './unidad-educativa.service';

/** Lo único que la subida de archivos aporta aquí: el contenido. */
interface ArchivoSubido {
  buffer: Buffer;
}

/** Datos públicos de la institución: la web los pide antes de iniciar sesión (ADR-0010). */
@ApiTags('institucion')
@Controller('institucion')
export class InstitucionController {
  constructor(private readonly unidad: UnidadEducativaService) {}

  @Publico()
  @Get()
  institucion() {
    return this.unidad.institucion();
  }

  /** La URL lleva ?v=<logoVersion>: cada logo nuevo tiene otra URL, así se puede guardar en caché un día. */
  @Publico()
  @Get('logo')
  @Header('Cache-Control', 'public, max-age=86400')
  @Header('X-Content-Type-Options', 'nosniff')
  async logo() {
    const { datos, tipo } = await this.unidad.logo();
    return new StreamableFile(datos, { type: tipo });
  }
}

/** Datos de la unidad educativa (US-18, criterio 5) y su apariencia (ADR-0010). */
@ApiTags('institucion')
@ApiBearerAuth()
@Controller('unidad-educativa')
export class UnidadEducativaController {
  constructor(private readonly unidad: UnidadEducativaService) {}

  @Roles(Rol.SECRETARIA, Rol.ADMINISTRADOR)
  @Get()
  datos() {
    return this.unidad.datos();
  }

  @Roles(Rol.SECRETARIA, Rol.ADMINISTRADOR)
  @Put()
  actualizarDatos(@Body() dto: DatosUnidadEducativaDto) {
    return this.unidad.actualizarDatos(dto);
  }

  /** Los colores deben dejar el texto legible (contraste WCAG AA): si no, 400. */
  @Roles(Rol.ADMINISTRADOR)
  @Put('colores')
  actualizarColores(@Body() dto: ColoresDto) {
    return this.unidad.actualizarColores(dto);
  }

  @Roles(Rol.ADMINISTRADOR)
  @Put('logo')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: { type: 'object', properties: { logo: { type: 'string', format: 'binary' } } },
  })
  @UseInterceptors(FileInterceptor('logo', { limits: { fileSize: LOGO_MAX_BYTES, files: 1 } }))
  guardarLogo(@UploadedFile() archivo?: ArchivoSubido) {
    return this.unidad.guardarLogo(archivo?.buffer);
  }

  @Roles(Rol.ADMINISTRADOR)
  @Delete('logo')
  @HttpCode(204)
  quitarLogo() {
    return this.unidad.quitarLogo();
  }
}
