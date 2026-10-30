import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { CurrentUser, AuthUser } from '../../../common/decorators/current-user.decorator';
import { Public } from '../../../common/decorators/public.decorator';
import { AuthResult, AuthService, PublicUser } from '../application/auth.service';
import { LoginDto, LogoutDto, RefreshDto } from './dto/auth.dto';

const REFRESH_COOKIE = 'banana_refresh';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  private readonly cookieSecure: boolean;
  private readonly cookieSameSite: 'lax' | 'strict' | 'none';

  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {
    this.cookieSecure = this.configService.get<boolean>('cookie.secure') ?? false;
    this.cookieSameSite = this.configService.get<'lax' | 'strict' | 'none'>('cookie.sameSite') ?? 'lax';
  }

  private setRefreshCookie(response: Response, token: string): void {
    response.cookie(REFRESH_COOKIE, token, {
      httpOnly: true,
      secure: this.cookieSecure,
      sameSite: this.cookieSameSite,
      path: '/v1/auth',
      maxAge: this.authService.refreshTtlSeconds * 1000,
    });
  }

  private clearRefreshCookie(response: Response): void {
    response.clearCookie(REFRESH_COOKIE, {
      httpOnly: true,
      secure: this.cookieSecure,
      sameSite: this.cookieSameSite,
      path: '/v1/auth',
    });
  }

  @Public()
  @Post('login')
  @HttpCode(200)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({ summary: 'Autenticación con correo y contraseña' })
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AuthResult> {
    const result = await this.authService.login(dto.correo, dto.password);
    this.setRefreshCookie(response, result.refreshToken);
    return result;
  }

  @Public()
  @Post('refresh')
  @HttpCode(200)
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  @ApiOperation({ summary: 'Rotación del refresh token (cookie web o body móvil)' })
  async refresh(
    @Body() dto: RefreshDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AuthResult> {
    const cookies = (request as Request & { cookies?: Record<string, string> }).cookies;
    const token = dto.refreshToken ?? cookies?.[REFRESH_COOKIE];
    if (!token) {
      throw new UnauthorizedException('No hay refresh token.');
    }
    const result = await this.authService.refresh(token);
    this.setRefreshCookie(response, result.refreshToken);
    return result;
  }

  @Public()
  @Post('logout')
  @HttpCode(204)
  @ApiOperation({ summary: 'Revoca el refresh token activo y limpia la cookie' })
  async logout(
    @Body() dto: LogoutDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<void> {
    const cookies = (request as Request & { cookies?: Record<string, string> }).cookies;
    await this.authService.logout(dto.refreshToken ?? cookies?.[REFRESH_COOKIE]);
    this.clearRefreshCookie(response);
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Perfil y rol del usuario autenticado' })
  me(@CurrentUser() user: AuthUser): Promise<PublicUser> {
    return this.authService.me(user.id);
  }
}
