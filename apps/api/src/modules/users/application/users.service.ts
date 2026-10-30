import { Injectable, NotFoundException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';

export interface UserSummary {
  id: number;
  nombre: string;
  correo: string;
  rol: Role;
  activo: boolean;
  creadoEn: string;
  reportesAbiertos?: number;
}

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async technicians(): Promise<UserSummary[]> {
    const users = await this.prisma.user.findMany({
      where: { rol: Role.TECNICO, activo: true },
      orderBy: { nombre: 'asc' },
      select: {
        id: true,
        nombre: true,
        correo: true,
        rol: true,
        activo: true,
        creadoEn: true,
        _count: {
          select: { asignaciones: { where: { estado: { not: 'completado' } } } },
        },
      },
    });

    return users.map(({ _count, creadoEn, ...user }) => ({
      ...user,
      creadoEn: creadoEn.toISOString(),
      reportesAbiertos: _count.asignaciones,
    }));
  }

  async findAll(): Promise<UserSummary[]> {
    const users = await this.prisma.user.findMany({
      orderBy: [{ rol: 'asc' }, { nombre: 'asc' }],
      select: { id: true, nombre: true, correo: true, rol: true, activo: true, creadoEn: true },
    });
    return users.map((user) => ({ ...user, creadoEn: user.creadoEn.toISOString() }));
  }

  async setActive(id: number, activo: boolean): Promise<UserSummary> {
    const exists = await this.prisma.user.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException('Usuario no encontrado.');
    const user = await this.prisma.user.update({
      where: { id },
      data: { activo },
      select: { id: true, nombre: true, correo: true, rol: true, activo: true, creadoEn: true },
    });
    return { ...user, creadoEn: user.creadoEn.toISOString() };
  }
}
