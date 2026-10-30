import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { AuthUser, CurrentUser } from '../../../common/decorators/current-user.decorator';
import { Roles } from '../../../common/decorators/roles.decorator';
import { AssignTechnicianUseCase } from '../application/assign-technician.use-case';
import { ChangeStatusUseCase } from '../application/change-status.use-case';
import { CreateReportUseCase } from '../application/create-report.use-case';
import { GetReportUseCase } from '../application/get-report.use-case';
import { ListReportsUseCase } from '../application/list-reports.use-case';
import { ResolveReportUseCase } from '../application/resolve-report.use-case';
import {
  AssignReportDto,
  ChangeStatusDto,
  CreateReportDto,
  CreateSolutionDto,
  ListReportsQueryDto,
} from './dto/report.dto';
import { PaginatedReportsResponse, ReportResponse, toReportResponse } from './report.mapper';

@ApiTags('reports')
@ApiBearerAuth()
@Controller('reports')
export class ReportsController {
  constructor(
    private readonly createReport: CreateReportUseCase,
    private readonly listReports: ListReportsUseCase,
    private readonly getReport: GetReportUseCase,
    private readonly assignTechnician: AssignTechnicianUseCase,
    private readonly changeStatus: ChangeStatusUseCase,
    private readonly resolveReport: ResolveReportUseCase,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Listado paginado con filtros y alcance por rol' })
  async findAll(
    @CurrentUser() actor: AuthUser,
    @Query() query: ListReportsQueryDto,
  ): Promise<PaginatedReportsResponse> {
    const result = await this.listReports.execute(actor, query);
    const limit = Math.min(50, Math.max(1, query.limit ?? 20));
    return {
      data: result.data.map(toReportResponse),
      meta: {
        page: Math.max(1, query.page ?? 1),
        limit,
        total: result.total,
        totalPages: Math.ceil(result.total / limit),
      },
    };
  }

  @Post()
  @Roles(Role.USUARIO, Role.ADMIN)
  @ApiOperation({ summary: 'Registrar un reporte (folio generado en servidor)' })
  async create(
    @CurrentUser() actor: AuthUser,
    @Body() dto: CreateReportDto,
  ): Promise<ReportResponse> {
    return toReportResponse(await this.createReport.execute(actor, dto));
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalle con RBAC por fila' })
  async findOne(
    @CurrentUser() actor: AuthUser,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<ReportResponse> {
    return toReportResponse(await this.getReport.execute(actor, id));
  }

  @Patch(':id/assignment')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Asignación manual o automática (técnico con menos carga)' })
  async assign(
    @CurrentUser() actor: AuthUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AssignReportDto,
  ): Promise<ReportResponse> {
    return toReportResponse(await this.assignTechnician.execute(actor, id, dto));
  }

  @Patch(':id/status')
  @Roles(Role.TECNICO, Role.ADMIN)
  @ApiOperation({ summary: 'Transición pendiente → en_proceso (completar vía solución)' })
  async updateStatus(
    @CurrentUser() actor: AuthUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ChangeStatusDto,
  ): Promise<ReportResponse> {
    return toReportResponse(await this.changeStatus.execute(actor, id, dto.estado));
  }

  @Post(':id/solution')
  @Roles(Role.TECNICO, Role.ADMIN)
  @ApiOperation({ summary: 'Registrar solución y completar el reporte de forma atómica' })
  async resolve(
    @CurrentUser() actor: AuthUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateSolutionDto,
  ): Promise<ReportResponse> {
    return toReportResponse(await this.resolveReport.execute(actor, id, dto));
  }
}
