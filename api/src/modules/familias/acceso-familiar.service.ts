import { ForbiddenException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import type { UsuarioToken } from '../../common/decoradores';
import { Rol, VinculoPadre } from '../../database/entities';

/**
 * Guard de pertenencia (US-20, criterio 2; RNF-04): un padre solo ve los datos de los estudiantes que la secretaria
 * le vinculó. El rol ya lo filtró el RolesGuard; los demás roles pasan (sus reglas son otras).
 */
@Injectable()
export class AccesoFamiliarService {
  constructor(
    @InjectRepository(VinculoPadre) private readonly vinculos: Repository<VinculoPadre>,
  ) {}

  /** Responde 403 también si el estudiante no existe, para no revelar qué ID existe (decisión D17). */
  async verificarHijo(estudianteId: number, usuario: UsuarioToken) {
    if (usuario.rol !== Rol.PADRE) return;
    const vinculado = await this.vinculos.existsBy({ padreId: usuario.id, estudianteId });
    if (!vinculado) throw new ForbiddenException('Usted no está vinculado a este estudiante');
  }
}
