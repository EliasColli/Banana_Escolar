import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'admin@banana.local' })
  @IsEmail()
  correo!: string;

  @ApiProperty({ example: 'Admin123!' })
  @IsString()
  @MinLength(8)
  password!: string;
}

export class RefreshDto {
  @ApiPropertyOptional({
    description: 'Solo para clientes móviles. El web usa la cookie HttpOnly.',
  })
  @IsOptional()
  @IsString()
  refreshToken?: string;
}

export class LogoutDto extends RefreshDto {}
