import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Role } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { AuthUser } from '../decorators/current-user.decorator';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

interface AccessTokenPayload {
  sub: number;
  correo: string;
  rol: Role;
  type: 'access' | 'refresh';
}

interface RequestWithUser {
  headers: Record<string, string | string[] | undefined>;
  user?: AuthUser;
}

/** Verifica el JWT, el tipo de token y que la cuenta siga activa en MySQL. */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const rawHeader = request.headers.authorization;
    const header = Array.isArray(rawHeader) ? rawHeader[0] : rawHeader;
    if (!header?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Token de acceso requerido.');
    }

    let payload: AccessTokenPayload;
    try {
      payload = await this.jwtService.verifyAsync<AccessTokenPayload>(header.slice(7), {
        secret: this.configService.getOrThrow<string>('jwt.accessSecret'),
      });
    } catch {
      throw new UnauthorizedException('Token inválido o expirado.');
    }

    if (payload.type !== 'access') {
      throw new UnauthorizedException('Tipo de token inválido.');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, nombre: true, correo: true, rol: true, activo: true },
    });

    if (!user?.activo) {
      throw new UnauthorizedException('La cuenta no está activa.');
    }

    request.user = { id: user.id, nombre: user.nombre, correo: user.correo, rol: user.rol };
    return true;
  }
}
