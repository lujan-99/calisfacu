import { Controller, Get, NotFoundException, Param, ParseIntPipe } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Repository } from 'typeorm';
import { Roles, UsuarioActual, type UsuarioToken } from '../../common/decoradores';
import {
  DimensionEvaluacion,
  Estudiante,
  Materia,
  Nota,
  Rol,
  Trimestre,
} from '../../database/entities';
import { AccesoNotasService } from '../notas/acceso.service';
import { CalculoService } from './calculo.service';

/** Nota trimestral de cada estudiante de una materia (US-02), calculada al consultar. */
@ApiTags('calculo')
@ApiBearerAuth()
@Controller('calculo')
export class CalculoController {
  constructor(
    private readonly calculo: CalculoService,
    private readonly acceso: AccesoNotasService,
    @InjectRepository(Materia) private readonly materias: Repository<Materia>,
    @InjectRepository(Trimestre) private readonly trimestres: Repository<Trimestre>,
    @InjectRepository(DimensionEvaluacion)
    private readonly dimensiones: Repository<DimensionEvaluacion>,
    @InjectRepository(Estudiante) private readonly estudiantes: Repository<Estudiante>,
    @InjectRepository(Nota) private readonly notas: Repository<Nota>,
  ) {}

  @Roles(Rol.PROFESOR, Rol.SECRETARIA, Rol.ADMINISTRADOR)
  @Get('materias/:materiaId/trimestres/:trimestreId')
  async notasTrimestrales(
    @Param('materiaId', ParseIntPipe) materiaId: number,
    @Param('trimestreId', ParseIntPipe) trimestreId: number,
    @UsuarioActual() usuario: UsuarioToken,
  ) {
    const materia = await this.materias.findOne({
      where: { id: materiaId },
      relations: { curso: { gestion: true } },
    });
    const trimestre = await this.trimestres.findOne({
      where: { id: trimestreId },
      relations: { gestion: true },
    });
    if (!materia || !trimestre || trimestre.gestion.id !== materia.curso.gestion.id) {
      throw new NotFoundException('La materia o el trimestre no existen en la misma gestión');
    }
    await this.acceso.verificarMateria(materia.id, usuario);

    const [dims, estudiantes, notas] = await Promise.all([
      this.dimensiones.find({
        where: { gestion: { id: trimestre.gestion.id } },
        order: { orden: 'ASC' },
      }),
      this.estudiantes.find({
        where: { curso: { id: materia.curso.id } },
        order: { apellidos: 'ASC', nombres: 'ASC' },
      }),
      this.notas.find({
        where: { actividad: { materia: { id: materia.id }, trimestre: { id: trimestre.id } } },
        relations: { estudiante: true, actividad: { dimension: true } },
      }),
    ]);

    return estudiantes.map((e) => {
      const porDimension: Record<string, number[]> = {};
      for (const n of notas.filter((x) => x.estudiante.id === e.id)) {
        (porDimension[n.actividad.dimension.codigo] ??= []).push(n.valor);
      }
      return {
        estudianteId: e.id,
        estudiante: `${e.apellidos}, ${e.nombres}`,
        ...this.calculo.notaTrimestral(dims, porDimension),
      };
    });
  }
}
