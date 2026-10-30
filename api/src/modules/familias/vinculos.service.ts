import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import type { DataSource } from 'typeorm';
import type { UsuarioToken } from '../../common/decoradores';
import { esDuplicado } from '../../common/transformaciones';
import { Estudiante, Parentesco, Rol, Usuario, VinculoPadre } from '../../database/entities';
import { nombreCurso, resumenGestion } from '../academico/formato';
import { GestionesService } from '../academico/gestiones.service';
import { AccesoFamiliarService } from './acceso-familiar.service';
import type { CrearVinculoDto, FiltroVinculosDto } from './familias.dto';

/**
 * Vinculación padre–estudiante (US-20, T-048; decisión D17). La secretaria vincula cuentas con rol PADRE a uno o más
 * estudiantes; un estudiante puede tener varios padres o tutores. El padre ve solo a sus hijos vinculados.
 */
@Injectable()
export class VinculosService {
  constructor(
    private readonly gestiones: GestionesService,
    private readonly acceso: AccesoFamiliarService,
    @InjectDataSource() private readonly db: DataSource,
  ) {}

  /** Padres de familia activos que se pueden vincular. */
  async padres() {
    const lista = await this.db.getRepository(Usuario).find({
      where: { rol: Rol.PADRE, activo: true },
      order: { nombre: 'ASC' },
    });
    return lista.map(({ id, nombre, email }) => ({ id, nombre, email }));
  }

  async listar(filtro: FiltroVinculosDto) {
    const q = this.db
      .getRepository(VinculoPadre)
      .createQueryBuilder('v')
      .innerJoinAndSelect('v.padre', 'p')
      .innerJoinAndSelect('v.estudiante', 'e')
      .innerJoinAndSelect('e.curso', 'c')
      .innerJoinAndSelect('e.gestion', 'g')
      .orderBy('e.apellidos', 'ASC')
      .addOrderBy('e.nombres', 'ASC')
      .addOrderBy('p.nombre', 'ASC');
    if (filtro.estudianteId) {
      q.where('e.id = :estudianteId', { estudianteId: filtro.estudianteId });
    } else if (filtro.cursoId) {
      q.where('c.id = :cursoId', { cursoId: filtro.cursoId });
    } else {
      const gestion = await this.gestiones.obtener();
      q.where('g.id = :gestionId', { gestionId: gestion.id });
    }
    if (filtro.padreId) q.andWhere('p.id = :padreId', { padreId: filtro.padreId });
    return (await q.getMany()).map((v) => this.vista(v));
  }

  async crear(dto: CrearVinculoDto) {
    const [padre, estudiante] = await Promise.all([
      this.db.getRepository(Usuario).findOneBy({ id: dto.padreId }),
      this.db.getRepository(Estudiante).findOne({
        where: { id: dto.estudianteId },
        relations: { curso: true, gestion: true },
      }),
    ]);
    if (!padre) throw new NotFoundException('El padre de familia no existe');
    if (padre.rol !== Rol.PADRE || !padre.activo) {
      throw new UnprocessableEntityException('La cuenta no es de un padre de familia activo');
    }
    if (!estudiante) throw new NotFoundException('El estudiante no existe');
    // insert y no save: con la clave compuesta, save actualizaría el vínculo existente en vez de rechazarlo.
    const vinculos = this.db.getRepository(VinculoPadre);
    try {
      await vinculos.insert({
        padreId: padre.id,
        estudianteId: estudiante.id,
        parentesco: dto.parentesco ?? Parentesco.PADRE,
      });
    } catch (e) {
      if (!esDuplicado(e)) throw e;
      throw new ConflictException('El estudiante ya está vinculado a este padre de familia');
    }
    const vinculo = await vinculos.findOneByOrFail({
      padreId: padre.id,
      estudianteId: estudiante.id,
    });
    return this.vista({ ...vinculo, padre, estudiante });
  }

  /** El vínculo no es evidencia académica: se puede quitar (por ejemplo, si se vinculó al padre equivocado). */
  async borrar(padreId: number, estudianteId: number) {
    const r = await this.db.getRepository(VinculoPadre).delete({ padreId, estudianteId });
    if (!r.affected) throw new NotFoundException('El vínculo no existe');
  }

  /** "Mis hijos" del padre (US-20, criterio 1): solo los vinculados. */
  async hijos(usuario: UsuarioToken) {
    const lista = await this.db
      .getRepository(Estudiante)
      .createQueryBuilder('e')
      .innerJoin(VinculoPadre, 'v', 'v.estudiante_id = e.id AND v.padre_id = :padreId', {
        padreId: usuario.id,
      })
      .innerJoinAndSelect('e.curso', 'c')
      .innerJoinAndSelect('e.gestion', 'g')
      .orderBy('g.anio', 'DESC')
      .addOrderBy('e.apellidos', 'ASC')
      .addOrderBy('e.nombres', 'ASC')
      .getMany();
    return lista.map((e) => this.vistaEstudiante(e));
  }

  async hijo(estudianteId: number, usuario: UsuarioToken) {
    await this.acceso.verificarHijo(estudianteId, usuario);
    const estudiante = await this.db.getRepository(Estudiante).findOneOrFail({
      where: { id: estudianteId },
      relations: { curso: true, gestion: true },
    });
    return this.vistaEstudiante(estudiante);
  }

  private vista(v: VinculoPadre) {
    return {
      padreId: v.padreId,
      estudianteId: v.estudianteId,
      parentesco: v.parentesco,
      creadoEn: v.creadoEn,
      padre: { id: v.padre.id, nombre: v.padre.nombre, email: v.padre.email },
      estudiante: this.vistaEstudiante(v.estudiante),
    };
  }

  private vistaEstudiante(e: Estudiante) {
    return {
      id: e.id,
      codigoRude: e.codigoRude,
      ci: e.ci,
      nombres: e.nombres,
      apellidos: e.apellidos,
      curso: {
        id: e.curso.id,
        nombre: nombreCurso(e.curso),
        nivel: e.curso.nivel,
        anioEscolaridad: e.curso.anioEscolaridad,
        paralelo: e.curso.paralelo,
      },
      gestion: resumenGestion(e.gestion),
    };
  }
}
