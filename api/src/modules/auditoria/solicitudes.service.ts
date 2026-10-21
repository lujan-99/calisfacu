import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { type DataSource, type EntityManager, In } from 'typeorm';
import type { UsuarioToken } from '../../common/decoradores';
import {
  EstadoSolicitud,
  Nota,
  Rol,
  SolicitudEdicion,
  SolicitudEdicionEstudiante,
} from '../../database/entities';
import { nombreCurso } from '../academico/formato';
import { AccesoNotasService } from '../notas/acceso.service';
import type { CrearSolicitudDto, FiltroSolicitudesDto } from './solicitudes.dto';

const RELACIONES = {
  actividad: { materia: { curso: true }, dimension: true },
  profesor: true,
  estudiantes: { estudiante: true },
} as const;

/**
 * Solicitudes de edición (decisión D16). Una nota registrada se corrige solo con una solicitud aprobada por el
 * administrador; AuditoriaService la marca usada en la misma transacción que la corrección.
 */
@Injectable()
export class SolicitudesService {
  constructor(
    private readonly acceso: AccesoNotasService,
    @InjectDataSource() private readonly db: DataSource,
  ) {}

  async crear(dto: CrearSolicitudDto, usuario: UsuarioToken) {
    const actividad = await this.acceso.actividadDelProfesor(dto.actividadId, usuario, true);
    const id = await this.db.transaction(async (tx) => {
      // La actividad se bloquea: dos solicitudes simultáneas no pueden abrir el mismo estudiante dos veces.
      await tx.query('SELECT id FROM actividades WHERE id = $1 FOR UPDATE', [actividad.id]);
      const conNota = await tx.count(Nota, {
        where: { actividad: { id: actividad.id }, estudiante: { id: In(dto.estudianteIds) } },
      });
      if (conNota !== dto.estudianteIds.length) {
        throw new UnprocessableEntityException(
          'Solo se puede pedir la edición de notas ya registradas',
        );
      }
      const abierta = await tx
        .getRepository(SolicitudEdicionEstudiante)
        .createQueryBuilder('se')
        .innerJoin('se.solicitud', 's')
        .innerJoinAndSelect('se.estudiante', 'e')
        .where('s.actividad_id = :actividad AND se.estudiante_id IN (:...ids)', {
          actividad: actividad.id,
          ids: dto.estudianteIds,
        })
        .andWhere('(s.estado = :pendiente OR (s.estado = :aprobada AND se.usada_en IS NULL))', {
          pendiente: EstadoSolicitud.PENDIENTE,
          aprobada: EstadoSolicitud.APROBADA,
        })
        .getOne();
      if (abierta) {
        throw new ConflictException(
          `Ya hay una solicitud abierta para ${abierta.estudiante.apellidos}, ` +
            `${abierta.estudiante.nombres} en esta actividad`,
        );
      }
      const solicitud = await tx.save(SolicitudEdicion, {
        actividad: { id: actividad.id },
        profesor: { id: usuario.id },
        motivo: dto.motivo,
      });
      await tx.insert(
        SolicitudEdicionEstudiante,
        dto.estudianteIds.map((estudianteId) => ({ solicitud, estudiante: { id: estudianteId } })),
      );
      return solicitud.id;
    });
    return this.vista(await this.obtener(this.db.manager, id));
  }

  /** El profesor ve sus solicitudes; el administrador, todas. Las más recientes primero. */
  async listar(filtro: FiltroSolicitudesDto, usuario: UsuarioToken) {
    const solicitudes = await this.db.getRepository(SolicitudEdicion).find({
      where: {
        ...(usuario.rol === Rol.PROFESOR ? { profesor: { id: usuario.id } } : {}),
        ...(filtro.actividadId ? { actividad: { id: filtro.actividadId } } : {}),
        ...(filtro.estado ? { estado: filtro.estado } : {}),
      },
      relations: RELACIONES,
      order: { id: 'DESC', estudiantes: { id: 'ASC' } },
    });
    return this.vistas(solicitudes);
  }

  /** Solo el administrador resuelve, y solo una solicitud pendiente. Rechazar exige una observación. */
  async resolver(id: number, usuario: UsuarioToken, aprobar: boolean, observacion?: string) {
    await this.db.transaction(async (tx) => {
      const s = await tx.findOne(SolicitudEdicion, {
        where: { id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!s) throw new NotFoundException('La solicitud no existe');
      if (s.estado !== EstadoSolicitud.PENDIENTE) {
        throw new ConflictException('La solicitud ya fue resuelta');
      }
      await tx.update(
        SolicitudEdicion,
        { id },
        {
          estado: aprobar ? EstadoSolicitud.APROBADA : EstadoSolicitud.RECHAZADA,
          observacion: aprobar ? null : (observacion ?? null),
          resueltoEn: new Date(),
          resueltoPor: { id: usuario.id },
        },
      );
    });
    return this.vista(await this.obtener(this.db.manager, id));
  }

  private async obtener(tx: EntityManager, id: number) {
    const s = await tx.findOne(SolicitudEdicion, {
      where: { id },
      relations: RELACIONES,
      order: { estudiantes: { id: 'ASC' } },
    });
    if (!s) throw new NotFoundException('La solicitud no existe');
    return s;
  }

  private async vista(s: SolicitudEdicion) {
    return (await this.vistas([s]))[0];
  }

  /** Con la nota actual de cada estudiante, leída en una sola consulta. */
  private async vistas(solicitudes: SolicitudEdicion[]) {
    if (solicitudes.length === 0) return [];
    const notas = await this.db.getRepository(Nota).find({
      where: { actividad: { id: In(solicitudes.map((s) => s.actividad.id)) } },
      relations: { actividad: true, estudiante: true },
    });
    const notaDe = new Map(notas.map((n) => [`${n.actividad.id}-${n.estudiante.id}`, n.valor]));
    return solicitudes.map((s) => ({
      id: s.id,
      profesorId: s.profesor.id,
      profesorNombre: s.profesor.nombre,
      actividadId: s.actividad.id,
      actividadNombre: s.actividad.nombre,
      materiaId: s.actividad.materia.id,
      materiaNombre: s.actividad.materia.nombre,
      cursoNombre: nombreCurso(s.actividad.materia.curso),
      dimension: s.actividad.dimension.nombre,
      estudiantes: s.estudiantes.map((x) => ({
        estudianteId: x.estudiante.id,
        estudianteNombre: `${x.estudiante.apellidos}, ${x.estudiante.nombres}`,
        notaActual: notaDe.get(`${s.actividad.id}-${x.estudiante.id}`) ?? null,
        usada: x.usadaEn !== null,
      })),
      motivo: s.motivo,
      fechaSolicitud: s.creadoEn.toISOString(),
      estado: s.estado,
      fechaResolucion: s.resueltoEn?.toISOString() ?? null,
      observacionAdmin: s.observacion,
    }));
  }
}
