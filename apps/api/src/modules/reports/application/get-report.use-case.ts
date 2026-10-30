import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { canViewReport } from '../domain/report.rules';
import { Actor, ReportRecord, ReportRepository } from '../domain/report.types';
import { REPORT_REPOSITORY } from '../domain/report.repository';

@Injectable()
export class GetReportUseCase {
  constructor(@Inject(REPORT_REPOSITORY) private readonly repository: ReportRepository) {}

  async execute(actor: Actor, id: number): Promise<ReportRecord> {
    const report = await this.repository.findById(id);
    if (!report) throw new NotFoundException('Reporte no encontrado.');

    const allowed = canViewReport(actor, report);
    if (!allowed.ok) throw new ForbiddenException(allowed.reason);
    return report;
  }
}
