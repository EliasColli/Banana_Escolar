import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { Actor, Priority, ReportRecord, ReportRepository } from '../domain/report.types';
import { canCreateReport, suggestPriority } from '../domain/report.rules';
import { REPORT_REPOSITORY } from '../domain/report.repository';

export interface CreateReportCommand {
  categoriaId: number;
  descripcion: string;
  ubicacion: string;
  prioridad?: Priority;
}

@Injectable()
export class CreateReportUseCase {
  constructor(@Inject(REPORT_REPOSITORY) private readonly repository: ReportRepository) {}

  async execute(actor: Actor, command: CreateReportCommand): Promise<ReportRecord> {
    const allowed = canCreateReport(actor);
    if (!allowed.ok) throw new BadRequestException(allowed.reason);

    const descripcion = command.descripcion.trim();
    const ubicacion = command.ubicacion.trim();
    if (descripcion.length < 10) {
      throw new BadRequestException('La descripción debe tener al menos 10 caracteres.');
    }
    if (ubicacion.length < 3) {
      throw new BadRequestException('La ubicación debe tener al menos 3 caracteres.');
    }

    return this.repository.create({
      usuarioId: actor.id,
      categoriaId: command.categoriaId,
      descripcion,
      ubicacion,
      prioridad: suggestPriority('', descripcion, command.prioridad),
    });
  }
}
