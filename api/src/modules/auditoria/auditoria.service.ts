import { Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import type { DataSource, Repository } from 'typeorm';
import type { UsuarioToken } from '../../common/decoradores';
import {
  EstadoSolicitud,
  Nota,
  OrigenCambio,
  RegistroAuditoria,
  SolicitudEdicionEstudiante,
} from '../../database/entities';
import { AccesoNotasService } from '../notas/acceso.service';

/**
 * Módulo crítico: corrección auditable (US-04, M15).
 * Toda corrección guarda quién, cuándo, valor anterior, valor nuevo y motivo, en la misma transacción
 * que el cambio. La nota trimestral se calcula al consultarla, así que refleja la corrección de inmediato.
 * Cada corrección usa una solicitud de edición aprobada por el administrador (decisión D16).
 */
@Injectable()
export class AuditoriaService {
  constructor(
    private readonly acceso: AccesoNotasService,
    @InjectDataSource() private readonly db: DataSource,
    @InjectRepository(Nota) private readonly notas: Repository<Nota>,
    @InjectRepository(RegistroAuditoria) private readonly registros: Repository<RegistroAuditoria>,
  ) {}

  private async notaConActividad(notaId: number) {
    const nota = await this.notas.findOne({
      where: { id: notaId },
      relations: { actividad: true, estudiante: true },
    });
    if (!nota) throw new NotFoundException('La nota no existe');
    return nota;
  }

  async corregir(notaId: number, valor: number, motivo: string, usuario: UsuarioToken) {
    const nota = await this.notaConActividad(notaId);
    await this.acceso.actividadDelProfesor(nota.actividad.id, usuario, true);
    return this.db.transaction(async (tx) => {
      // El valor anterior se lee con la fila bloqueada: dos correcciones simultáneas se aplican una tras otra
      // y cada registro de auditoría guarda el valor que realmente reemplazó (M15).
      const actual = await tx.findOne(Nota, {
        where: { id: notaId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!actual) throw new NotFoundException('La nota no existe');
      if (actual.valor === valor) {
        throw new UnprocessableEntityException('La nota nueva es igual a la actual');
      }
      // La autorización se bloquea y se marca usada aquí mismo: dos correcciones no pueden usar la misma (D16).
      const autorizacion = await tx
        .getRepository(SolicitudEdicionEstudiante)
        .createQueryBuilder('se')
        .innerJoin('se.solicitud', 's')
        .where('s.actividad_id = :actividad AND se.estudiante_id = :estudiante', {
          actividad: nota.actividad.id,
          estudiante: nota.estudiante.id,
        })
        .andWhere('s.estado = :aprobada AND se.usada_en IS NULL', {
          aprobada: EstadoSolicitud.APROBADA,
        })
        .orderBy('se.id', 'ASC')
        .setLock('pessimistic_write', undefined, ['se'])
        .getOne();
      if (!autorizacion) {
        throw new UnprocessableEntityException(
          'Para corregir esta nota necesita una solicitud de edición aprobada por el administrador',
        );
      }
      await tx.update(SolicitudEdicionEstudiante, { id: autorizacion.id }, { usadaEn: new Date() });
      await tx.update(Nota, { id: notaId }, { valor });
      await tx.insert(RegistroAuditoria, {
        nota: { id: notaId },
        usuario: { id: usuario.id },
        valorAnterior: actual.valor,
        valorNuevo: valor,
        motivo: motivo.trim(),
        origen: OrigenCambio.CORRECCION,
      });
      return { notaId, valorAnterior: actual.valor, valorNuevo: valor };
    });
  }

  async historial(notaId: number, usuario: UsuarioToken) {
    const nota = await this.notaConActividad(notaId);
    await this.acceso.actividadDelProfesor(nota.actividad.id, usuario, false);
    const registros = await this.registros.find({
      where: { nota: { id: notaId } },
      relations: { usuario: true },
      // Por id: el orden en que se aplicaron los cambios (el id se asigna con la fila de la nota bloqueada).
      order: { id: 'ASC' },
    });
    return registros.map((r) => ({
      fecha: r.creadoEn,
      usuario: r.usuario.nombre,
      valorAnterior: r.valorAnterior,
      valorNuevo: r.valorNuevo,
      motivo: r.motivo,
      origen: r.origen,
    }));
  }
}
