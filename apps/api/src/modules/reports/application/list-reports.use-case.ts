import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { Actor, ReportFilters, ReportPage, ReportRepository } from '../domain/report.types';
import { REPORT_REPOSITORY } from '../domain/report.repository';

export interface ListReportsCommand {
  page?: number;
  limit?: number;
  categoryId?: number;
  status?: 'pendiente' | 'en_proceso' | 'completado';
  priority?: 'baja' | 'media' | 'alta';
  from?: string;
  to?: string;
  search?: string;
  assignment?: 'me' | 'unassigned' | 'all';
}

@Injectable()
export class ListReportsUseCase {
  constructor(@Inject(REPORT_REPOSITORY) private readonly repository: ReportRepository) {}

  execute(actor: Actor, command: ListReportsCommand): Promise<ReportPage> {
    const page = Math.max(1, command.page ?? 1);
    const limit = Math.min(50, Math.max(1, command.limit ?? 20));

    const filters: ReportFilters = {
      categoryId: command.categoryId,
      status: command.status,
      priority: command.priority,
      search: command.search,
      assignment: command.assignment,
      from: this.parseDate(command.from, false),
      to: this.parseDate(command.to, true),
    };

    if (filters.from && filters.to && filters.from > filters.to) {
      throw new BadRequestException('El rango de fechas es inválido (from > to).');
    }

    return this.repository.list({ actor, page, limit, filters });
  }

  private parseDate(value?: string, endOfDay = false): Date | undefined {
    if (!value) return undefined;
    const date = /^\d{4}-\d{2}-\d{2}$/.test(value)
      ? new Date(`${value}T${endOfDay ? '23:59:59.999' : '00:00:00.000'}Z`)
      : new Date(value);
    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException(`Fecha inválida: ${value}`);
    }
    return date;
  }
}
