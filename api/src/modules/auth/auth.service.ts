import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as argon2 from 'argon2';
import type { Repository } from 'typeorm';
import { Usuario } from '../../database/entities';

export const MAX_INTENTOS = 5;
export const MINUTOS_BLOQUEO = 15;
/** Único mensaje de error del login: no revela si el correo existe ni si la cuenta está bloqueada. */
export const CREDENCIALES_INVALIDAS = 'Credenciales inválidas';
export const SESION_EXPIRADA = 'Su sesión expiró; vuelva a ingresar';

/** Módulo crítico: autenticación (US-17). El mensaje de error no revela si el correo existe. */
@Injectable()
export class AuthService {
  /** Hash de relleno: se verifica contra él cuando el usuario no existe, para que el tiempo de respuesta sea el mismo. */
  private hashRelleno?: Promise<string>;

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
    if (!usuario || !usuario.activo) {
      this.hashRelleno ??= AuthService.hash('relleno-sin-usuario');
      await argon2.verify(await this.hashRelleno, contrasena);
      throw new UnauthorizedException(CREDENCIALES_INVALIDAS);
    }

    const ahora = this.ahora();
    const contrasenaValida = await argon2.verify(usuario.hashContrasena, contrasena);
    if (usuario.bloqueadoHasta && usuario.bloqueadoHasta > ahora) {
      throw new UnauthorizedException(CREDENCIALES_INVALIDAS);
    }
    if (!contrasenaValida) {
      await this.registrarIntentoFallido(usuario.id, ahora);
      throw new UnauthorizedException(CREDENCIALES_INVALIDAS);
    }

    if (usuario.intentosFallidos > 0 || usuario.bloqueadoHasta) {
      await this.usuarios.update(usuario.id, { intentosFallidos: 0, bloqueadoHasta: null });
    }
    return this.sesion(usuario);
  }

  /**
   * US-17, criterio 4 (D11): la web renueva el token mientras el usuario trabaja; la sesión vence a los 30 minutos
   * sin peticiones. Se vuelve a leer el usuario para que una cuenta desactivada no pueda seguir renovando.
   */
  async renovar(usuarioId: number) {
    const usuario = await this.usuarios.findOneBy({ id: usuarioId });
    if (!usuario || !usuario.activo) throw new UnauthorizedException(SESION_EXPIRADA);
    return this.sesion(usuario);
  }

  private async sesion(usuario: Pick<Usuario, 'id' | 'nombre' | 'rol'>) {
    const token = await this.jwt.signAsync({ sub: usuario.id, rol: usuario.rol });
    return { token, usuario: { id: usuario.id, nombre: usuario.nombre, rol: usuario.rol } };
  }

  /**
   * Suma el intento y bloquea al llegar a MAX_INTENTOS en una sola sentencia atómica: con peticiones en paralelo
   * cada intento se cuenta una vez y nadie prueba más contraseñas de las permitidas.
   */
  private async registrarIntentoFallido(id: number, ahora: Date) {
    const hasta = new Date(ahora.getTime() + MINUTOS_BLOQUEO * 60_000);
    await this.usuarios.query(
      `UPDATE usuarios
          SET intentos_fallidos = CASE WHEN intentos_fallidos + 1 >= $2 THEN 0 ELSE intentos_fallidos + 1 END,
              bloqueado_hasta   = CASE WHEN intentos_fallidos + 1 >= $2 THEN $3::timestamptz ELSE bloqueado_hasta END
        WHERE id = $1`,
      [id, MAX_INTENTOS, hasta],
    );
  }
}
