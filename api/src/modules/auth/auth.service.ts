import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as argon2 from 'argon2';
import type { Repository } from 'typeorm';
import { Usuario } from '../../database/entities';

export const MAX_INTENTOS = 5;
export const MINUTOS_BLOQUEO = 15;
const CREDENCIALES_INVALIDAS = 'Credenciales inválidas';

/** Módulo crítico: autenticación (US-17). El mensaje de error no revela si el correo existe. */
@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(Usuario) private readonly usuarios: Repository<Usuario>,
    private readonly jwt: JwtService,
    private readonly ahora: () => Date = () => new Date(),
  ) {}

  static hash(contrasena: string): Promise<string> {
    return argon2.hash(contrasena);
  }

  async login(email: string, contrasena: string) {
    const usuario = await this.usuarios.findOne({
      where: { email: email.toLowerCase().trim() },
      select: [
        'id',
        'email',
        'nombre',
        'rol',
        'activo',
        'hashContrasena',
        'intentosFallidos',
        'bloqueadoHasta',
      ],
    });
    if (!usuario || !usuario.activo) throw new UnauthorizedException(CREDENCIALES_INVALIDAS);

    const ahora = this.ahora();
    if (usuario.bloqueadoHasta && usuario.bloqueadoHasta > ahora) {
      throw new UnauthorizedException(
        `Cuenta bloqueada por ${MAX_INTENTOS} intentos fallidos. Intente de nuevo en ${MINUTOS_BLOQUEO} minutos.`,
      );
    }

    if (!(await argon2.verify(usuario.hashContrasena, contrasena))) {
      const intentos = usuario.intentosFallidos + 1;
      const bloquear = intentos >= MAX_INTENTOS;
      await this.usuarios.update(usuario.id, {
        intentosFallidos: bloquear ? 0 : intentos,
        bloqueadoHasta: bloquear ? new Date(ahora.getTime() + MINUTOS_BLOQUEO * 60_000) : null,
      });
      throw new UnauthorizedException(CREDENCIALES_INVALIDAS);
    }

    if (usuario.intentosFallidos > 0 || usuario.bloqueadoHasta) {
      await this.usuarios.update(usuario.id, { intentosFallidos: 0, bloqueadoHasta: null });
    }
    const token = await this.jwt.signAsync({ sub: usuario.id, rol: usuario.rol });
    return { token, usuario: { id: usuario.id, nombre: usuario.nombre, rol: usuario.rol } };
  }
}
