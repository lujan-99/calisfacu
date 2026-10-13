import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import type { UsuarioToken } from '../../common/decoradores';
import { Actividad, AsignacionMateria, Rol } from '../../database/entities';

/**
 * Reglas de acceso a las notas (RNF-04, M09): solo el profesor asignado a la materia las registra o corrige.
 * El rol ya lo filtró el RolesGuard; aquí se comprueba la asignación profesor–materia (US-18).
 */
@Injectable()
export class AccesoNotasService {
  constructor(
    @InjectRepository(Actividad) private readonly actividades: Repository<Actividad>,
    @InjectRepository(AsignacionMateria)
    private readonly asignaciones: Repository<AsignacionMateria>,
  ) {}

  async actividadDelProfesor(actividadId: number, usuario: UsuarioToken, paraEscribir: boolean) {
    const actividad = await this.actividades.findOne({
      where: { id: actividadId },
      relations: { materia: { curso: true }, trimestre: true, dimension: true },
    });
    if (!actividad) throw new NotFoundException('La actividad no existe');
    await this.verificarMateria(actividad.materia.id, usuario);
    if (paraEscribir && actividad.trimestre.cerrado) {
      throw new UnprocessableEntityException(
        'El trimestre está cerrado: no se pueden registrar ni corregir notas',
      );
    }
    return actividad;
  }

  async verificarMateria(materiaId: number, usuario: UsuarioToken) {
    if (usuario.rol !== Rol.PROFESOR) return;
    const asignacion = await this.asignaciones.findOne({
      where: { materia: { id: materiaId } },
      relations: { profesor: true },
    });
    if (!asignacion || asignacion.profesor.id !== usuario.id) {
      throw new ForbiddenException('Usted no es el profesor asignado a esta materia');
    }
  }
}
