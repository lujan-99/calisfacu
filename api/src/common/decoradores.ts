import { createParamDecorator, SetMetadata, type ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import type { Rol } from '../database/entities';

export interface UsuarioToken {
  id: number;
  rol: Rol;
}

export const CLAVE_PUBLICO = 'publico';
export const CLAVE_ROLES = 'roles';

/** La ruta no exige autenticación (salud, inicio de sesión). */
export const Publico = () => SetMetadata(CLAVE_PUBLICO, true);

/** Roles que pueden usar la ruta (US-17). */
export const Roles = (...roles: Rol[]) => SetMetadata(CLAVE_ROLES, roles);

/** Usuario autenticado, tomado del JWT. */
export const UsuarioActual = createParamDecorator((_: unknown, ctx: ExecutionContext) => {
  const req = ctx.switchToHttp().getRequest<Request & { user: UsuarioToken }>();
  return req.user;
});
