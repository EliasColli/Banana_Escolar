import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { canChangeStatus } from '../domain/report.rules';
import { Actor, ReportRecord, ReportRepository, ReportStatus } from '../domain/report.types';
import { REPORT_REPOSITORY } from '../domain/report.repository';

@Injectable()
export class ChangeStatusUseCase {
  constructor(@Inject(REPORT_REPOSITORY) private readonly repository: ReportRepository) {}

  async execute(actor: Actor, reportId: number, target: ReportStatus): Promise<ReportRecord> {
    if (target === 'completado') {
      throw new ForbiddenException(
        'Para completar un reporte registra la solución con POST /reports/:id/solution.',
      );
    }

    const report = await this.repository.findById(reportId);
    if (!report) throw new NotFoundException('Reporte no encontrado.');

    const allowed = canChangeStatus(actor, report, target);
    if (!allowed.ok) throw new ForbiddenException(allowed.reason);

    return this.repository.changeStatus(reportId, target);
  }
}
