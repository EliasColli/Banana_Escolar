import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Priority, ReportStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateReportDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(1)
  categoriaId!: number;

  @ApiProperty({ example: 'La llave del baño del edificio A no cierra y gotea.' })
  @IsString()
  @MinLength(10)
  @MaxLength(2000)
  descripcion!: string;

  @ApiProperty({ example: 'Edificio A, baño de planta baja' })
  @IsString()
  @MinLength(3)
  @MaxLength(190)
  ubicacion!: string;

  @ApiPropertyOptional({ enum: Priority, default: Priority.media })
  @IsOptional()
  @IsEnum(Priority)
  prioridad?: Priority;
}

export class ListReportsQueryDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ default: 20, maximum: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  categoryId?: number;

  @ApiPropertyOptional({ enum: Priority })
  @IsOptional()
  @IsEnum(Priority)
  priority?: Priority;

  @ApiPropertyOptional({ enum: ReportStatus })
  @IsOptional()
  @IsEnum(ReportStatus)
  status?: ReportStatus;

  @ApiPropertyOptional({ example: '2026-01-01' })
  @IsOptional()
  @IsString()
  from?: string;

  @ApiPropertyOptional({ example: '2026-12-31' })
  @IsOptional()
  @IsString()
  to?: string;

  @ApiPropertyOptional({ example: 'fuga' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;

  @ApiPropertyOptional({ enum: ['me', 'unassigned', 'all'] })
  @IsOptional()
  @IsIn(['me', 'unassigned', 'all'])
  assignment?: 'me' | 'unassigned' | 'all';
}

export class AssignReportDto {
  @ApiPropertyOptional({
    description: 'Si se omite, se elige el técnico activo con menos reportes abiertos.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  tecnicoId?: number;
}

export class ChangeStatusDto {
  @ApiProperty({ enum: ReportStatus, example: ReportStatus.en_proceso })
  @IsEnum(ReportStatus)
  estado!: ReportStatus;
}

export class CreateSolutionDto {
  @ApiProperty({ example: 'Se reemplazó el empaque y se ajustó la llave.' })
  @IsString()
  @MinLength(10)
  @MaxLength(2000)
  descripcion!: string;

  @ApiPropertyOptional({ example: 'Se recomienda revisar la tubería en 3 meses.' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  observaciones?: string;
}
