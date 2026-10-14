import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import type { DataSource, EntityManager } from 'typeorm';
import type { UsuarioToken } from '../../common/decoradores';
import { esDuplicado } from '../../common/transformaciones';
import { Actividad, AsignacionMateria, Materia, Rol, Usuario } from '../../database/entities';
import { AccesoNotasService } from '../notas/acceso.service';
import type { CrearMateriaDto, DatosMateriaDto, FiltroMateriasDto } from './academico.dto';
import { CursosService } from './cursos.service';
import { nombreCurso, resumenCurso, resumenGestion, resumenUsuario } from './formato';
import { GestionesService } from './gestiones.service';

/**
 * Materias de cada curso con su profesor (T-016). Una materia tiene un solo profesor, y solo él registra sus notas
 * (US-18, criterio 2; RNF-04): por eso la materia y su asignación se guardan juntas, en una transacción.
 */
@Injectable()
export class MateriasService {
  constructor(
    private readonly gestiones: GestionesService,
    private readonly cursos: CursosService,
    private readonly acceso: AccesoNotasService,
    @InjectDataSource() private readonly db: DataSource,
  ) {}

  async listar(filtro: FiltroMateriasDto) {
    const where = filtro.cursoId
      ? { materia: { curso: { id: filtro.cursoId } } }
      : {
          materia: {
            curso: { gestion: { id: (await this.gestiones.obtener(filtro.gestionId)).id } },
          },
        };
    return this.buscar(where);
  }

  /** "Mis materias": solo las asignadas al profesor que inició sesión (US-18, criterio 2). */
  mias(usuario: UsuarioToken) {
    return this.buscar({ profesor: { id: usuario.id } });
  }

  async detalle(id: number, usuario: UsuarioToken) {
    await this.acceso.verificarMateria(id, usuario);
    const [materia] = await this.buscar({ materia: { id } });
    if (!materia) throw new NotFoundException('La materia no existe');
    return materia;
  }

  /** Usuarios que se pueden asignar a una materia. */
  async profesores() {
    const lista = await this.db.getRepository(Usuario).find({
      where: { rol: Rol.PROFESOR, activo: true },
      order: { nombre: 'ASC' },
    });
    return lista.map(resumenUsuario);
  }

  async crear(dto: CrearMateriaDto) {
    const curso = await this.cursos.obtener(dto.cursoId);
    return this.db.transaction(async (tx) => {
      const profesor = await this.profesorActivo(tx, dto.profesorId);
      const materia = await this.guardar(tx, { nombre: dto.nombre, curso });
      await tx.save(AsignacionMateria, { materia, profesor });
      return this.vistaDe(tx, materia.id);
    });
  }

  async actualizar(id: number, dto: DatosMateriaDto) {
    return this.db.transaction(async (tx) => {
      const materia = await this.obtener(tx, id);
      const profesor = await this.profesorActivo(tx, dto.profesorId);
      await this.guardar(tx, { ...materia, nombre: dto.nombre });
      const asignacion = await tx.findOneBy(AsignacionMateria, { materia: { id } });
      await tx.save(AsignacionMateria, { id: asignacion?.id, materia, profesor });
      return this.vistaDe(tx, id);
    });
  }

  /** Una materia con actividades tiene notas o las tendrá: no se borra (las notas son evidencia, RNF-05). */
  async borrar(id: number) {
    await this.db.transaction(async (tx) => {
      await this.obtener(tx, id);
      if (await tx.existsBy(Actividad, { materia: { id } })) {
        throw new UnprocessableEntityException(
          'La materia ya tiene actividades registradas: no se puede borrar',
        );
      }
      await tx.delete(AsignacionMateria, { materia: { id } });
      await tx.delete(Materia, id);
    });
  }

  private async obtener(tx: EntityManager, id: number) {
    const materia = await tx.findOne(Materia, { where: { id }, relations: { curso: true } });
    if (!materia) throw new NotFoundException('La materia no existe');
    return materia;
  }

  private async profesorActivo(tx: EntityManager, id: number) {
    const profesor = await tx.findOneBy(Usuario, { id, rol: Rol.PROFESOR, activo: true });
    if (!profesor)
      throw new UnprocessableEntityException('El usuario elegido no es un profesor activo');
    return profesor;
  }

  private async guardar(
    tx: EntityManager,
    materia: Partial<Materia> & Pick<Materia, 'nombre' | 'curso'>,
  ) {
    try {
      return await tx.save(Materia, materia);
    } catch (e) {
      if (esDuplicado(e)) {
        throw new ConflictException(
          `El curso ${nombreCurso(materia.curso)} ya tiene la materia ${materia.nombre}`,
        );
      }
      throw e;
    }
  }

  private async vistaDe(tx: EntityManager, id: number) {
    const [vista] = await this.buscar({ materia: { id } }, tx);
    return vista;
  }

  private async buscar(where: object, tx: EntityManager = this.db.manager) {
    const asignaciones = await tx.find(AsignacionMateria, {
      where,
      relations: { materia: { curso: { gestion: true } }, profesor: true },
      order: {
        materia: {
          curso: { nivel: 'ASC', anioEscolaridad: 'ASC', paralelo: 'ASC' },
          nombre: 'ASC',
        },
      },
    });
    return asignaciones.map(({ materia, profesor }) => ({
      id: materia.id,
      nombre: materia.nombre,
      curso: resumenCurso(materia.curso),
      gestion: resumenGestion(materia.curso.gestion),
      profesor: resumenUsuario(profesor),
    }));
  }
}
