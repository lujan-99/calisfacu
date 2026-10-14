import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import { UnidadEducativa } from '../../database/entities';
import type { ColoresDto, DatosUnidadEducativaDto } from './academico.dto';
import { COLORES_PREDETERMINADOS, detectarTipoImagen, validarColores } from './apariencia';

/**
 * La institución: nombre y código SIE que salen en boletines y centralizadores (US-18, criterio 5), y su
 * apariencia en la web (ADR-0010). Una instalación de CalisFacu atiende a una unidad educativa.
 */
@Injectable()
export class UnidadEducativaService {
  constructor(
    @InjectRepository(UnidadEducativa) private readonly unidades: Repository<UnidadEducativa>,
  ) {}

  /** Datos públicos para la pantalla de ingreso y el encabezado (sin sesión). */
  async institucion() {
    const ue = await this.buscar();
    return {
      nombre: ue?.nombre ?? null,
      codigoSie: ue?.codigoSie ?? null,
      colores: ue ? this.colores(ue) : COLORES_PREDETERMINADOS,
      logoVersion: ue?.logoActualizadoEn?.getTime() ?? null,
    };
  }

  async logo() {
    const ue = await this.unidades
      .createQueryBuilder('u')
      .addSelect('u.logo')
      .orderBy('u.id', 'ASC')
      .getOne();
    if (!ue?.logo || !ue.logoTipo) throw new NotFoundException('La institución no tiene logo');
    return { datos: ue.logo, tipo: ue.logoTipo };
  }

  async datos() {
    return this.vista(await this.obtener());
  }

  async actualizarDatos(dto: DatosUnidadEducativaDto) {
    const ue = (await this.buscar()) ?? this.unidades.create();
    return this.vista(
      await this.unidades.save({ ...ue, nombre: dto.nombre, codigoSie: dto.codigoSie }),
    );
  }

  async actualizarColores(dto: ColoresDto) {
    const ue = await this.obtener();
    const c = validarColores(dto);
    return this.vista(
      await this.unidades.save({
        ...ue,
        colorMarca: c.marca,
        colorPrimario: c.primario,
        colorAcento: c.acento,
      }),
    );
  }

  /** El tipo se decide por el contenido del archivo; el tamaño máximo lo controla la subida (413). */
  async guardarLogo(datos: Buffer | undefined) {
    if (!datos) throw new BadRequestException('Falta el archivo del logo (campo "logo")');
    const tipo = detectarTipoImagen(datos);
    if (!tipo) throw new BadRequestException('El logo debe ser una imagen PNG, JPEG o WebP');
    const ue = await this.obtener();
    await this.unidades.update(ue.id, {
      logo: datos,
      logoTipo: tipo,
      logoActualizadoEn: new Date(),
    });
    return this.datos();
  }

  async quitarLogo() {
    const ue = await this.obtener();
    await this.unidades.update(ue.id, { logo: null, logoTipo: null, logoActualizadoEn: null });
  }

  private buscar() {
    return this.unidades.findOne({ where: {}, order: { id: 'ASC' } });
  }

  private async obtener() {
    const ue = await this.buscar();
    if (!ue)
      throw new NotFoundException('Todavía no se registraron los datos de la unidad educativa');
    return ue;
  }

  private colores(ue: UnidadEducativa) {
    return { marca: ue.colorMarca, primario: ue.colorPrimario, acento: ue.colorAcento };
  }

  private vista(ue: UnidadEducativa) {
    return {
      id: ue.id,
      nombre: ue.nombre,
      codigoSie: ue.codigoSie,
      colores: this.colores(ue),
      logoVersion: ue.logoActualizadoEn?.getTime() ?? null,
    };
  }
}
