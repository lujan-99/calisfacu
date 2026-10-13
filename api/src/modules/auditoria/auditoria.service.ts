import { Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import type { DataSource, Repository } from 'typeorm';
import type { UsuarioToken } from '../../common/decoradores';
import { Nota, OrigenCambio, RegistroAuditoria } from '../../database/entities';
import { AccesoNotasService } from '../notas/acceso.service';

/**
 * Módulo crítico: corrección auditable (US-04, M15).
 * Toda corrección guarda quién, cuándo, valor anterior, valor nuevo y motivo, en la misma transacción
 * que el cambio. La nota trimestral se calcula al consultarla, así que refleja la corrección de inmediato.
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
      relations: { actividad: true },
    });
    if (!nota) throw new NotFoundException('La nota no existe');
    return nota;
  }

  async corregir(notaId: number, valor: number, motivo: string, usuario: UsuarioToken) {
    const nota = await this.notaConActividad(notaId);
    await this.acceso.actividadDelProfesor(nota.actividad.id, usuario, true);
    if (nota.valor === valor) {
      throw new UnprocessableEntityException('La nota nueva es igual a la actual');
    }
    return this.db.transaction(async (tx) => {
      await tx.update(Nota, { id: notaId }, { valor });
      await tx.insert(RegistroAuditoria, {
        nota: { id: notaId },
        usuario: { id: usuario.id },
        valorAnterior: nota.valor,
        valorNuevo: valor,
        motivo: motivo.trim(),
        origen: OrigenCambio.CORRECCION,
      });
      return { notaId, valorAnterior: nota.valor, valorNuevo: valor };
    });
  }

  async historial(notaId: number, usuario: UsuarioToken) {
    const nota = await this.notaConActividad(notaId);
    await this.acceso.actividadDelProfesor(nota.actividad.id, usuario, false);
    const registros = await this.registros.find({
      where: { nota: { id: notaId } },
      relations: { usuario: true },
      order: { creadoEn: 'ASC', id: 'ASC' },
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
