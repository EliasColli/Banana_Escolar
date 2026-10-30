import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';
import { Roles } from '../../../common/decorators/roles.decorator';
import {
  AnalyticsService,
  AnalyticsSummary,
  ResolutionByCategory,
  TopLocation,
  WeeklyReportPoint,
} from '../application/analytics.service';

class TopLocationsQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number;
}

@ApiTags('analytics')
@ApiBearerAuth()
@Controller('analytics')
@Roles(Role.ADMIN)
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('summary')
  @ApiOperation({ summary: 'Tarjetas resumen calculadas desde MySQL' })
  summary(): Promise<AnalyticsSummary> {
    return this.analyticsService.summary();
  }

  @Get('weekly-reports')
  @ApiOperation({ summary: 'Reportes creados por semana (últimas 12 semanas)' })
  weeklyReports(): Promise<WeeklyReportPoint[]> {
    return this.analyticsService.weeklyReports();
  }

  @Get('resolution-by-category')
  @ApiOperation({ summary: 'Días promedio de resolución por categoría' })
  resolutionByCategory(): Promise<ResolutionByCategory[]> {
    return this.analyticsService.resolutionByCategory();
  }

  @Get('top-locations')
  @ApiOperation({ summary: 'Ubicaciones con más incidencias' })
  topLocations(@Query() query: TopLocationsQueryDto): Promise<TopLocation[]> {
    return this.analyticsService.topLocations(query.limit ?? 10);
  }
}
