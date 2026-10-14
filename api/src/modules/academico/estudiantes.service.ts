import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import type { DataSource, EntityManager } from 'typeorm';
import { esDuplicado, escaparLike } from '../../common/transformaciones';
import { Asistencia, Estudiante, Nota, VinculoPadre } from '../../database/entities';
import type { DatosEstudianteDto, FiltroEstudiantesDto } from './academico.dto';
import { CursosService } from './cursos.service';
import { nombreCurso, resumenCurso, resumenGestion } from './formato';
import { GestionesService } from './gestiones.service';

/**
 * Estudiantes inscritos (US-18, criterio 3; T-016). El código RUDE no se repite en una gestión (decisión D10), así
 * un estudiante no queda inscrito en dos cursos de la misma gestión; en otra gestión vuelve a inscribirse.
 */
@Injectable()
export class EstudiantesService {
  constructor(
    private readonly gestiones: GestionesService,
    private readonly cursos: CursosService,
    @InjectDataSource() private readonly db: DataSource,
  ) {}

  async listar(filtro: FiltroEstudiantesDto) {
    const q = this.db
      .getRepository(Estudiante)
      .createQueryBuilder('e')
      .innerJoinAndSelect('e.curso', 'c')
      .innerJoinAndSelect('e.gestion', 'g')
      .orderBy('e.apellidos', 'ASC')
      .addOrderBy('e.nombres', 'ASC');
    if (filtro.cursoId) {
      q.where('c.id = :cursoId', { cursoId: filtro.cursoId });
    } else {
      const gestion = await this.gestiones.obtener(filtro.gestionId);
      q.where('g.id = :gestionId', { gestionId: gestion.id });
    }
    if (filtro.apellido) {
      q.andWhere(`e.apellidos ILIKE :apellido ESCAPE '\\'`, {
        apellido: `%${escaparLike(filtro.apellido)}%`,
      });
    }
    return (await q.getMany()).map((e) => this.vista(e));
  }

  async crear(dto: DatosEstudianteDto) {
    const curso = await this.cursos.obtener(dto.cursoId);
    return this.guardar(this.db.manager, {
      codigoRude: dto.codigoRude,
      nombres: dto.nombres,
      apellidos: dto.apellidos,
      curso,
      gestion: curso.gestion,
    });
  }

  async actualizar(id: number, dto: DatosEstudianteDto) {
    return this.db.transaction(async (tx) => {
      const actual = await this.obtener(tx, id);
      const curso =
        dto.cursoId === actual.curso.id ? actual.curso : await this.cursos.obtener(dto.cursoId);
      if (curso.id !== actual.curso.id) {
        if (curso.gestion.id !== actual.gestion.id) {
          throw new UnprocessableEntityException('El curso nuevo es de otra gestión');
        }
        // Sus notas son de actividades de las materias del curso anterior: cambiarlo las dejaría huérfanas.
        if (await tx.existsBy(Nota, { estudiante: { id } })) {
          throw new UnprocessableEntityException(
            'El estudiante ya tiene notas en su curso: no se puede cambiar de curso',
          );
        }
      }
      return this.guardar(tx, {
        ...actual,
        codigoRude: dto.codigoRude,
        nombres: dto.nombres,
        apellidos: dto.apellidos,
        curso,
      });
    });
  }

  /** No se borra a quien tiene historial: las notas y su auditoría son evidencia oficial (US-04, RNF-05). */
  async borrar(id: number) {
    await this.db.transaction(async (tx) => {
      await this.obtener(tx, id);
      const conHistorial = await Promise.all([
        tx.existsBy(Nota, { estudiante: { id } }),
        tx.existsBy(Asistencia, { estudiante: { id } }),
        tx.existsBy(VinculoPadre, { estudianteId: id }),
      ]);
      if (conHistorial.some(Boolean)) {
        throw new UnprocessableEntityException(
          'El estudiante ya tiene notas, asistencia o padres vinculados: no se puede borrar',
        );
      }
      await tx.delete(Estudiante, id);
    });
  }

  private async obtener(tx: EntityManager, id: number) {
    const estudiante = await tx.findOne(Estudiante, {
      where: { id },
      relations: { curso: { gestion: true }, gestion: true },
    });
    if (!estudiante) throw new NotFoundException('El estudiante no existe');
    return estudiante;
  }

  private async guardar(tx: EntityManager, estudiante: Partial<Estudiante>) {
    try {
      const guardado = await tx.save(Estudiante, estudiante);
      return this.vista(await this.obtener(tx, guardado.id));
    } catch (e) {
      if (!esDuplicado(e)) throw e;
      const otro = await this.db.getRepository(Estudiante).findOne({
        where: { codigoRude: estudiante.codigoRude, gestion: { id: estudiante.gestion?.id } },
        relations: { curso: true, gestion: true },
      });
      throw new ConflictException(
        otro
          ? `El estudiante con RUDE ${otro.codigoRude} ya está inscrito en ${nombreCurso(otro.curso)} ` +
              `en la gestión ${otro.gestion.anio}`
          : 'Ya hay un estudiante con ese código RUDE en la gestión',
      );
    }
  }

  private vista(e: Estudiante) {
    return {
      id: e.id,
      codigoRude: e.codigoRude,
      nombres: e.nombres,
      apellidos: e.apellidos,
      curso: resumenCurso(e.curso),
      gestion: resumenGestion(e.gestion),
    };
  }
}
