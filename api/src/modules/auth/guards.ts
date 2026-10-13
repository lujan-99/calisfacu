import {
  ForbiddenException,
  Injectable,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import type { Request } from 'express';
import { CLAVE_PUBLICO, CLAVE_ROLES, type UsuarioToken } from '../../common/decoradores';
import type { Rol } from '../../database/entities';

/** Toda ruta exige JWT salvo las marcadas con @Publico() (responde 401 sin token). */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  canActivate(ctx: ExecutionContext) {
    const publico = this.reflector.getAllAndOverride<boolean>(CLAVE_PUBLICO, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    return publico ? true : super.canActivate(ctx);
  }
}

/** Rechaza con 403 al usuario cuyo rol no está en @Roles() (M09). */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    const roles = this.reflector.getAllAndOverride<Rol[] | undefined>(CLAVE_ROLES, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (!roles || roles.length === 0) return true;
    const usuario = ctx.switchToHttp().getRequest<Request & { user?: UsuarioToken }>().user;
    if (!usuario || !roles.includes(usuario.rol)) {
      throw new ForbiddenException('Su rol no tiene permiso para esta operación');
    }
    return true;
  }
}
