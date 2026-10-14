import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import type { DataSource } from 'typeorm';
import { esDuplicado } from '../../common/transformaciones';
import { Curso, Estudiante, Materia } from '../../database/entities';
import type { CrearCursoDto, DatosCursoDto, FiltroCursosDto } from './academico.dto';
import { ANIOS_POR_NIVEL, nombreCurso, resumenGestion } from './formato';
import { GestionesService } from './gestiones.service';

/** Cursos de una gestión: nivel + año de escolaridad + paralelo (US-18, criterio 1; T-016). */
@Injectable()
export class CursosService {
  constructor(
    private readonly gestiones: GestionesService,
    @InjectDataSource() private readonly db: DataSource,
  ) {}

  async listar(filtro: FiltroCursosDto) {
    const gestion = await this.gestiones.obtener(filtro.gestionId);
    const cursos = await this.db.getRepository(Curso).find({
      where: { gestion: { id: gestion.id }, ...(filtro.nivel ? { nivel: filtro.nivel } : {}) },
      relations: { gestion: true },
      order: { nivel: 'ASC', anioEscolaridad: 'ASC', paralelo: 'ASC' },
    });
    const [estudiantes, materias] = await Promise.all([
      this.contarPorCurso(Estudiante, gestion.id),
      this.contarPorCurso(Materia, gestion.id),
    ]);
    return cursos.map((c) => this.vista(c, estudiantes.get(c.id) ?? 0, materias.get(c.id) ?? 0));
  }

  async crear(dto: CrearCursoDto) {
    const gestion = await this.gestiones.obtener(dto.gestionId);
    this.validarAnio(dto);
    const curso = await this.guardar({ ...this.datos(dto), gestion }, gestion.anio);
    return this.vista(curso, 0, 0);
  }

  async actualizar(id: number, dto: DatosCursoDto) {
    const curso = await this.obtener(id);
    this.validarAnio(dto);
    const guardado = await this.guardar({ ...curso, ...this.datos(dto) }, curso.gestion.anio);
    const [estudiantes, materias] = await this.contar(id);
    return this.vista(guardado, estudiantes, materias);
  }

  /** Solo se borra un curso vacío: sus estudiantes y materias tienen notas y asistencia que no se pierden. */
  async borrar(id: number) {
    await this.obtener(id);
    const [estudiantes, materias] = await this.contar(id);
    if (estudiantes > 0 || materias > 0) {
      throw new UnprocessableEntityException(
        `El curso tiene ${estudiantes} estudiante(s) y ${materias} materia(s): quítelos antes de borrarlo`,
      );
    }
    await this.db.getRepository(Curso).delete(id);
  }

  async obtener(id: number): Promise<Curso> {
    const curso = await this.db
      .getRepository(Curso)
      .findOne({ where: { id }, relations: { gestion: true } });
    if (!curso) throw new NotFoundException('El curso no existe');
    return curso;
  }

  private datos(dto: DatosCursoDto) {
    return { nivel: dto.nivel, anioEscolaridad: dto.anioEscolaridad, paralelo: dto.paralelo };
  }

  private validarAnio(dto: DatosCursoDto) {
    const maximo = ANIOS_POR_NIVEL[dto.nivel];
    if (dto.anioEscolaridad > maximo) {
      throw new UnprocessableEntityException(
        `El nivel ${dto.nivel.toLowerCase()} tiene ${maximo} años de escolaridad`,
      );
    }
  }

  private async guardar(
    curso: Partial<Curso> & Pick<Curso, 'nivel' | 'anioEscolaridad' | 'paralelo'>,
    anio: number,
  ) {
    try {
      return await this.db.getRepository(Curso).save(curso);
    } catch (e) {
      if (esDuplicado(e)) {
        throw new ConflictException(
          `Ya existe el curso ${nombreCurso(curso)} en la gestión ${anio}`,
        );
      }
      throw e;
    }
  }

  private contar(cursoId: number) {
    return Promise.all([
      this.db.getRepository(Estudiante).countBy({ curso: { id: cursoId } }),
      this.db.getRepository(Materia).countBy({ curso: { id: cursoId } }),
    ]);
  }

  private async contarPorCurso(entidad: typeof Estudiante | typeof Materia, gestionId: number) {
    const filas = await this.db
      .getRepository<Estudiante | Materia>(entidad)
      .createQueryBuilder('x')
      .innerJoin('x.curso', 'c')
      .select('c.id', 'cursoId')
      .addSelect('count(*)::int', 'total')
      .where('c.gestion_id = :gestionId', { gestionId })
      .groupBy('c.id')
      .getRawMany<{ cursoId: number; total: number }>();
    return new Map(filas.map((f) => [f.cursoId, f.total]));
  }

  private vista(c: Curso, estudiantes: number, materias: number) {
    return {
      id: c.id,
      gestion: resumenGestion(c.gestion),
      nivel: c.nivel,
      anioEscolaridad: c.anioEscolaridad,
      paralelo: c.paralelo,
      nombre: nombreCurso(c),
      estudiantes,
      materias,
    };
  }
}
