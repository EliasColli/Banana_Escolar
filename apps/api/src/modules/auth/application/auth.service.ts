import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Role, User } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import { fakeVerifyPassword, newJti, parseDurationToSeconds, sha256, verifyPassword } from '../../../common/utils';

interface RefreshPayload {
  sub: number;
  type: 'refresh';
  jti: string;
}

export interface PublicUser {
  id: number;
  nombre: string;
  correo: string;
  rol: Role;
  activo: boolean;
  creadoEn: string;
}

export interface AuthResult {
  accessToken: string;
  refreshToken: string;
  user: PublicUser;
}

@Injectable()
export class AuthService {
  private readonly accessSecret: string;
  private readonly refreshSecret: string;
  private readonly accessTtlSeconds: number;
  readonly refreshTtlSeconds: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {
    this.accessSecret = this.configService.getOrThrow<string>('jwt.accessSecret');
    this.refreshSecret = this.configService.getOrThrow<string>('jwt.refreshSecret');
    this.accessTtlSeconds = parseDurationToSeconds(
      this.configService.get<string>('jwt.accessTtl') ?? '15m',
      900,
    );
    this.refreshTtlSeconds = parseDurationToSeconds(
      this.configService.get<string>('jwt.refreshTtl') ?? '7d',
      604_800,
    );
  }

  private toPublicUser(user: User): PublicUser {
    return {
      id: user.id,
      nombre: user.nombre,
      correo: user.correo,
      rol: user.rol,
      activo: user.activo,
      creadoEn: user.creadoEn.toISOString(),
    };
  }

  async login(correo: string, password: string): Promise<AuthResult> {
    const user = await this.prisma.user.findUnique({ where: { correo: correo.toLowerCase() } });
    if (!user) {
      await fakeVerifyPassword(password);
      throw new UnauthorizedException('Credenciales inválidas.');
    }

    const validPassword = await verifyPassword(password, user.passwordHash);
    if (!validPassword) throw new UnauthorizedException('Credenciales inválidas.');
    if (!user.activo) throw new UnauthorizedException('La cuenta está desactivada.');

    return this.issueTokens(user);
  }

  async refresh(token: string): Promise<AuthResult> {
    let payload: RefreshPayload;
    try {
      payload = await this.jwtService.verifyAsync<RefreshPayload>(token, {
        secret: this.refreshSecret,
      });
    } catch {
      throw new UnauthorizedException('Sesión expirada. Inicia sesión de nuevo.');
    }

    if (payload.type !== 'refresh') throw new UnauthorizedException('Tipo de token inválido.');

    const tokenHash = sha256(token);
    const stored = await this.prisma.refreshToken.findUnique({ where: { tokenHash } });
    if (!stored) throw new UnauthorizedException('Sesión inválida.');

    if (stored.revokedAt) {
      // Posible reutilización de un refresh token rotado: revocar toda la familia.
      await this.prisma.refreshToken.updateMany({
        where: { userId: stored.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      throw new UnauthorizedException('Sesión revocada por seguridad.');
    }

    if (stored.expiresAt.getTime() <= Date.now()) {
      throw new UnauthorizedException('Sesión expirada. Inicia sesión de nuevo.');
    }

    const revoked = await this.prisma.refreshToken.updateMany({
      where: { id: stored.id, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    if (revoked.count !== 1) {
      throw new UnauthorizedException('Sesión inválida.');
    }

    const user = await this.prisma.user.findUnique({ where: { id: stored.userId } });
    if (!user?.activo) throw new UnauthorizedException('La cuenta no está activa.');

    return this.issueTokens(user);
  }

  async logout(token?: string): Promise<void> {
    if (!token) return;
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash: sha256(token), revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async me(userId: number): Promise<PublicUser> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('Usuario no encontrado.');
    return this.toPublicUser(user);
  }

  private async issueTokens(user: User): Promise<AuthResult> {
    const jti = newJti();
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(
        { sub: user.id, correo: user.correo, rol: user.rol, type: 'access' },
        { secret: this.accessSecret, expiresIn: this.accessTtlSeconds },
      ),
      this.jwtService.signAsync(
        { sub: user.id, type: 'refresh', jti },
        { secret: this.refreshSecret, expiresIn: this.refreshTtlSeconds },
      ),
    ]);

    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: sha256(refreshToken),
        expiresAt: new Date(Date.now() + this.refreshTtlSeconds * 1000),
      },
    });

    return { accessToken, refreshToken, user: this.toPublicUser(user) };
  }
}
