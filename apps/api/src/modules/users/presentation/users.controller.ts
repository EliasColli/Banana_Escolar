import { Body, Controller, Get, Param, ParseIntPipe, Patch } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { IsBoolean } from 'class-validator';
import { Roles } from '../../../common/decorators/roles.decorator';
import { UsersService, UserSummary } from '../application/users.service';

class SetActiveDto {
  @IsBoolean()
  activo!: boolean;
}

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('technicians')
  @Roles(Role.ADMIN, Role.TECNICO)
  @ApiOperation({ summary: 'Técnicos activos con reportes abiertos' })
  technicians(): Promise<UserSummary[]> {
    return this.usersService.technicians();
  }

  @Get()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Listado de usuarios (solo administrador)' })
  findAll(): Promise<UserSummary[]> {
    return this.usersService.findAll();
  }

  @Patch(':id/active')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Activar o desactivar una cuenta' })
  setActive(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: SetActiveDto,
  ): Promise<UserSummary> {
    return this.usersService.setActive(id, dto.activo);
  }
}
