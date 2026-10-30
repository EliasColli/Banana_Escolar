import { Module } from '@nestjs/common';
import { AssignTechnicianUseCase } from './application/assign-technician.use-case';
import { ChangeStatusUseCase } from './application/change-status.use-case';
import { CreateReportUseCase } from './application/create-report.use-case';
import { GetReportUseCase } from './application/get-report.use-case';
import { ListReportsUseCase } from './application/list-reports.use-case';
import { ResolveReportUseCase } from './application/resolve-report.use-case';
import { REPORT_REPOSITORY } from './domain/report.repository';
import { PrismaReportRepository } from './infrastructure/prisma-report.repository';
import { ReportsController } from './presentation/reports.controller';

@Module({
  controllers: [ReportsController],
  providers: [
    PrismaReportRepository,
    { provide: REPORT_REPOSITORY, useExisting: PrismaReportRepository },
    CreateReportUseCase,
    ListReportsUseCase,
    GetReportUseCase,
    AssignTechnicianUseCase,
    ChangeStatusUseCase,
    ResolveReportUseCase,
  ],
  exports: [REPORT_REPOSITORY, PrismaReportRepository],
})
export class ReportsModule {}
