import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Category, Role } from '@prisma/client';
import { IsString, MaxLength, MinLength } from 'class-validator';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CategoriesService } from '../application/categories.service';

class CreateCategoryDto {
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  nombre!: string;
}

@ApiTags('categories')
@ApiBearerAuth()
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  @ApiOperation({ summary: 'Catálogo de categorías' })
  findAll(): Promise<Category[]> {
    return this.categoriesService.findAll();
  }

  @Post()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Crear categoría (solo administrador)' })
  create(@Body() dto: CreateCategoryDto): Promise<Category> {
    return this.categoriesService.create(dto.nombre);
  }
}
