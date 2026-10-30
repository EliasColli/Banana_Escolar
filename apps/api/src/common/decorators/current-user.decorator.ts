import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Role } from '@prisma/client';

export interface AuthUser {
  id: number;
  nombre: string;
  correo: string;
  rol: Role;
}

/** Usuario autenticado inyectado por JwtAuthGuard. */
export const CurrentUser = createParamDecorator(
  (data: keyof AuthUser | undefined, ctx: ExecutionContext): AuthUser | AuthUser[keyof AuthUser] => {
    const request = ctx.switchToHttp().getRequest<{ user: AuthUser }>();
    return data ? request.user[data] : request.user;
  },
);
