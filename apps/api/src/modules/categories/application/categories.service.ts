import { ConflictException, Injectable } from '@nestjs/common';
import { Category } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(): Promise<Category[]> {
    return this.prisma.category.findMany({ orderBy: { nombre: 'asc' } });
  }

  async create(nombre: string): Promise<Category> {
    const normalized = nombre.trim();
    const existing = await this.prisma.category.findUnique({ where: { nombre: normalized } });
    if (existing) throw new ConflictException('La categoría ya existe.');
    return this.prisma.category.create({ data: { nombre: normalized } });
  }
}
