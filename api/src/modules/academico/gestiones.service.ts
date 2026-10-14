import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import { Gestion, Trimestre } from '../../database/entities';
import { resumenGestion } from './formato';

/** Gestiones y trimestres: los selectores de las pantallas del profesor, la secretaria y el administrador. */
@Injectable()
export class GestionesService {
  constructor(
    @InjectRepository(Gestion) private readonly gestiones: Repository<Gestion>,
    @InjectRepository(Trimestre) private readonly trimestres: Repository<Trimestre>,
  ) {}

  async listar() {
    const todas = await this.gestiones.find({ order: { anio: 'DESC' } });
    return todas.map(resumenGestion);
  }

  /** La gestión pedida o, si no se indica, la más reciente (la que se está cursando). */
  async obtener(gestionId?: number): Promise<Gestion> {
    const [gestion] = await this.gestiones.find({
      where: gestionId ? { id: gestionId } : {},
      order: { anio: 'DESC' },
      take: 1,
    });
    if (!gestion) throw new NotFoundException('La gestión no existe');
    return gestion;
  }

  /** Trimestres con su estado: un trimestre cerrado no admite notas (US-18, criterio 4). */
  async trimestresDe(gestionId: number) {
    await this.obtener(gestionId);
    const lista = await this.trimestres.find({
      where: { gestion: { id: gestionId } },
      order: { numero: 'ASC' },
    });
    return lista.map(({ id, numero, cerrado }) => ({ id, numero, cerrado }));
  }
}
