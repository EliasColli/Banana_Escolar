import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { canAssign } from '../domain/report.rules';
import { Actor, ReportRecord, ReportRepository } from '../domain/report.types';
import { REPORT_REPOSITORY } from '../domain/report.repository';

export interface AssignTechnicianCommand {
  tecnicoId?: number;
}

@Injectable()
export class AssignTechnicianUseCase {
  constructor(@Inject(REPORT_REPOSITORY) private readonly repository: ReportRepository) {}

  async execute(actor: Actor, reportId: number, command: AssignTechnicianCommand): Promise<ReportRecord> {
    const allowed = canAssign(actor);
    if (!allowed.ok) throw new ForbiddenException(allowed.reason);

    const report = await this.repository.findById(reportId);
    if (!report) throw new NotFoundException('Reporte no encontrado.');

    const tecnicoId = command.tecnicoId ?? (await this.repository.findLeastLoadedTechnician());
    if (!tecnicoId) {
      throw new NotFoundException('No hay técnicos activos disponibles para asignar.');
    }

    const technician = await this.repository.findActiveTechnician(tecnicoId);
    if (!technician) {
      throw new NotFoundException('El técnico indicado no existe o está inactivo.');
    }

    return this.repository.assign(reportId, technician.id);
  }
}
