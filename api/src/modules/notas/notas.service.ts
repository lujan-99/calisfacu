import { Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { In, type DataSource, type Repository } from 'typeorm';
import type { UsuarioToken } from '../../common/decoradores';
import {
  Actividad,
  DimensionEvaluacion,
  Estudiante,
  Materia,
  Nota,
  OrigenCambio,
  RegistroAuditoria,
  Trimestre,
} from '../../database/entities';
import { AccesoNotasService } from './acceso.service';
import type { CrearActividadDto, RegistrarPlanillaDto } from './notas.dto';

/** Módulo crítico: registro de notas (US-01). */
@Injectable()
export class NotasService {
  constructor(
    private readonly acceso: AccesoNotasService,
    @InjectDataSource() private readonly db: DataSource,
    @InjectRepository(Estudiante) private readonly estudiantes: Repository<Estudiante>,
    @InjectRepository(Nota) private readonly notas: Repository<Nota>,
  ) {}

  /** El profesor asignado crea una actividad de su materia en una dimensión y un trimestre abierto (US-01). */
  async crearActividad(dto: CrearActividadDto, usuario: UsuarioToken) {
    await this.acceso.verificarMateria(dto.materiaId, usuario);
    const [materia, trimestre, dimension] = await Promise.all([
      this.db
        .getRepository(Materia)
        .findOne({ where: { id: dto.materiaId }, relations: { curso: { gestion: true } } }),
      this.db
        .getRepository(Trimestre)
        .findOne({ where: { id: dto.trimestreId }, relations: { gestion: true } }),
      this.db
        .getRepository(DimensionEvaluacion)
        .findOne({ where: { id: dto.dimensionId }, relations: { gestion: true } }),
    ]);
    if (!materia || !trimestre || !dimension) {
      throw new NotFoundException('La materia, el trimestre o la dimensión no existen');
    }
    const gestion = materia.curso.gestion.id;
    if (trimestre.gestion.id !== gestion || dimension.gestion.id !== gestion) {
      throw new UnprocessableEntityException(
        'La materia, el trimestre y la dimensión deben ser de la misma gestión',
      );
    }
    if (trimestre.cerrado) {
      throw new UnprocessableEntityException(
        'El trimestre está cerrado: no se pueden crear actividades',
      );
    }
    const actividad = await this.db
      .getRepository(Actividad)
      .save({ nombre: dto.nombre.trim(), materia, trimestre, dimension });
    return { id: actividad.id, nombre: actividad.nombre };
  }

  /**
   * Actividades de la materia en el trimestre, en el orden de las dimensiones, con cuántas notas tienen sobre el
   * total de estudiantes del curso (la pantalla muestra "28/30 notas").
   */
  async actividades(materiaId: number, trimestreId: number, usuario: UsuarioToken) {
    await this.acceso.verificarMateria(materiaId, usuario);
    const [materia, trimestre] = await Promise.all([
      this.db
        .getRepository(Materia)
        .findOne({ where: { id: materiaId }, relations: { curso: { gestion: true } } }),
      this.db
        .getRepository(Trimestre)
        .findOne({ where: { id: trimestreId }, relations: { gestion: true } }),
    ]);
    if (!materia || !trimestre || trimestre.gestion.id !== materia.curso.gestion.id) {
      throw new NotFoundException('La materia o el trimestre no existen en la misma gestión');
    }
    const [filas, estudiantes] = await Promise.all([
      this.db
        .getRepository(Actividad)
        .createQueryBuilder('a')
        .innerJoin('a.dimension', 'd')
        .leftJoin(Nota, 'n', 'n.actividad_id = a.id')
        .select(['a.id AS id', 'a.nombre AS nombre'])
        .addSelect(['d.id AS "dimensionId"', 'd.codigo AS codigo', 'd.nombre AS "dimensionNombre"'])
        .addSelect('count(n.id)::int', 'notasRegistradas')
        .where('a.materia_id = :materiaId AND a.trimestre_id = :trimestreId', {
          materiaId,
          trimestreId,
        })
        .groupBy('a.id, d.id')
        .orderBy('d.orden', 'ASC')
        .addOrderBy('a.id', 'ASC')
        .getRawMany<{
          id: number;
          nombre: string;
          dimensionId: number;
          codigo: string;
          dimensionNombre: string;
          notasRegistradas: number;
        }>(),
      this.estudiantes.countBy({ curso: { id: materia.curso.id } }),
    ]);
    return {
      estudiantes,
      actividades: filas.map((f) => ({
        id: f.id,
        nombre: f.nombre,
        dimension: { id: f.dimensionId, codigo: f.codigo, nombre: f.dimensionNombre },
        notasRegistradas: f.notasRegistradas,
      })),
    };
  }

  /** Planilla de una actividad: todos los estudiantes del curso con su nota, si ya la tienen. */
  async planilla(actividadId: number, usuario: UsuarioToken) {
    const actividad = await this.acceso.actividadDelProfesor(actividadId, usuario, false);
    const [estudiantes, notas] = await Promise.all([
      this.estudiantes.find({
        where: { curso: { id: actividad.materia.curso.id } },
        order: { apellidos: 'ASC', nombres: 'ASC' },
      }),
      this.notas.find({
        where: { actividad: { id: actividadId } },
        relations: { estudiante: true },
      }),
    ]);
    const porEstudiante = new Map(notas.map((n) => [n.estudiante.id, n.valor]));
    return {
      actividad: {
        id: actividad.id,
        nombre: actividad.nombre,
        dimension: actividad.dimension.nombre,
        materia: actividad.materia.nombre,
      },
      filas: estudiantes.map((e) => ({
        estudianteId: e.id,
        estudiante: `${e.apellidos}, ${e.nombres}`,
        valor: porEstudiante.get(e.id) ?? null,
      })),
    };
  }

  /**
   * US-01, criterio 3: se guardan todas las notas o ninguna (una transacción).
   * Cada nota nueva deja un registro de auditoría con origen REGISTRO (M15).
   * Una nota que ya existe no se sobrescribe aquí: se corrige con motivo (US-04).
   */
  async registrarPlanilla(
    dto: RegistrarPlanillaDto,
    usuario: UsuarioToken,
    origen = OrigenCambio.REGISTRO,
  ) {
    const actividad = await this.acceso.actividadDelProfesor(dto.actividadId, usuario, true);
    const ids = dto.notas.map((n) => n.estudianteId);
    if (new Set(ids).size !== ids.length) {
      throw new UnprocessableEntityException('Un estudiante aparece más de una vez en la planilla');
    }

    return this.db.transaction(async (tx) => {
      // La gestión se toma en modo compartido: mientras se guardan notas no pueden cambiar los puntajes de sus
      // dimensiones (US-18, criterio 7; DimensionesService la bloquea en modo exclusivo).
      await tx.query(
        'SELECT g.id FROM gestiones g JOIN cursos c ON c.gestion_id = g.id WHERE c.id = $1 FOR SHARE OF g',
        [actividad.materia.curso.id],
      );
      const delCurso = await tx.count(Estudiante, {
        where: { id: In(ids), curso: { id: actividad.materia.curso.id } },
      });
      if (delCurso !== ids.length) {
        throw new UnprocessableEntityException(
          'La planilla incluye estudiantes que no son del curso',
        );
      }
      const existentes = await tx.find(Nota, {
        where: { actividad: { id: actividad.id }, estudiante: { id: In(ids) } },
        relations: { estudiante: true },
      });
      if (existentes.length > 0) {
        throw new UnprocessableEntityException(
          `Ya tienen nota ${existentes.length} estudiante(s); use la corrección con motivo (US-04)`,
        );
      }
      for (const n of dto.notas) {
        const nota = await tx.save(Nota, {
          actividad: { id: actividad.id },
          estudiante: { id: n.estudianteId },
          valor: n.valor,
        });
        await tx.insert(RegistroAuditoria, {
          nota: { id: nota.id },
          usuario: { id: usuario.id },
          valorAnterior: null,
          valorNuevo: n.valor,
          motivo: null,
          origen,
        });
      }
      return { guardadas: dto.notas.length };
    });
  }
}
