import { Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { In, type DataSource } from 'typeorm';
import { Actividad, DimensionEvaluacion, Gestion, Nota } from '../../database/entities';
import { CalculoService } from './calculo.service';
import type { ConfigurarDimensionesDto } from './dimensiones.dto';

export const GESTION_CON_NOTAS =
  'La gestión ya tiene notas registradas: no se pueden cambiar sus dimensiones';

/**
 * Módulo crítico: dimensiones de evaluación por gestión (US-18, criterios 6 y 7; RNF-01; T-015).
 * Los puntajes los fija la resolución vigente del Ministerio y se configuran aquí, nunca en el código.
 */
@Injectable()
export class DimensionesService {
  constructor(
    private readonly calculo: CalculoService,
    @InjectDataSource() private readonly db: DataSource,
  ) {}

  async listar(gestionId: number) {
    if (!(await this.db.getRepository(Gestion).existsBy({ id: gestionId }))) {
      throw new NotFoundException('La gestión no existe');
    }
    const dims = await this.db.getRepository(DimensionEvaluacion).find({
      where: { gestion: { id: gestionId } },
      order: { orden: 'ASC', id: 'ASC' },
    });
    return dims.map(({ id, codigo, nombre, puntajeMaximo, orden }) => ({
      id,
      codigo,
      nombre,
      puntajeMaximo,
      orden,
    }));
  }

  /**
   * Reemplaza el conjunto de dimensiones de la gestión en una transacción.
   * La fila de la gestión se bloquea: el registro de notas la toma en modo compartido (NotasService), así que
   * ninguna nota puede guardarse mientras cambian los puntajes, ni los puntajes cambiar con notas a medio guardar.
   */
  async configurar(gestionId: number, dto: ConfigurarDimensionesDto) {
    this.calculo.validarDimensiones(dto.dimensiones);
    await this.db.transaction(async (tx) => {
      const gestion = await tx.findOne(Gestion, {
        where: { id: gestionId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!gestion) throw new NotFoundException('La gestión no existe');

      const conNotas = await tx
        .createQueryBuilder(Nota, 'n')
        .innerJoin('n.actividad', 'a')
        .innerJoin('a.trimestre', 't')
        .where('t.gestion_id = :gestionId', { gestionId })
        .getExists();
      if (conNotas) throw new UnprocessableEntityException(GESTION_CON_NOTAS);

      const actuales = await tx.find(DimensionEvaluacion, {
        where: { gestion: { id: gestionId } },
      });
      const nuevas = new Set(dto.dimensiones.map((d) => d.codigo));
      const quitar = actuales.filter((d) => !nuevas.has(d.codigo));
      if (quitar.length > 0) {
        const usadas = await tx.find(Actividad, {
          where: { dimension: { id: In(quitar.map((d) => d.id)) } },
          relations: { dimension: true },
        });
        if (usadas.length > 0) {
          const codigos = [...new Set(usadas.map((a) => a.dimension.codigo))].join(', ');
          throw new UnprocessableEntityException(
            `No se puede quitar ${codigos}: ya tiene actividades registradas`,
          );
        }
        await tx.delete(DimensionEvaluacion, { id: In(quitar.map((d) => d.id)) });
      }

      const idPorCodigo = new Map(actuales.map((d) => [d.codigo, d.id]));
      await tx.save(
        DimensionEvaluacion,
        dto.dimensiones.map((d, i) => ({
          id: idPorCodigo.get(d.codigo),
          gestion: { id: gestionId },
          codigo: d.codigo,
          nombre: d.nombre.trim(),
          puntajeMaximo: d.puntajeMaximo,
          orden: d.orden ?? i + 1,
        })),
      );
    });
    return this.listar(gestionId);
  }
}
