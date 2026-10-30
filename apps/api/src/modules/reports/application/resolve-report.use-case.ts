import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { canResolve } from '../domain/report.rules';
import { Actor, ReportRecord, ReportRepository } from '../domain/report.types';
import { REPORT_REPOSITORY } from '../domain/report.repository';

export interface ResolveReportCommand {
  descripcion: string;
  observaciones?: string;
}

@Injectable()
export class ResolveReportUseCase {
  constructor(@Inject(REPORT_REPOSITORY) private readonly repository: ReportRepository) {}

  async execute(actor: Actor, reportId: number, command: ResolveReportCommand): Promise<ReportRecord> {
    const report = await this.repository.findById(reportId);
    if (!report) throw new NotFoundException('Reporte no encontrado.');

    const allowed = canResolve(actor, report);
    if (!allowed.ok) throw new ForbiddenException(allowed.reason);

    return this.repository.resolve(reportId, {
      actor,
      descripcion: command.descripcion.trim(),
      observaciones: command.observaciones?.trim(),
    });
  }
}
