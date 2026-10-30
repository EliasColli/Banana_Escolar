import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';

export interface AnalyticsSummary {
  total: number;
  pendiente: number;
  enProceso: number;
  completado: number;
  semanaActual: number;
  semanaAnterior: number;
  variacionPct: number | null;
  tiempoPromedioDias: number | null;
}

export interface WeeklyReportPoint {
  weekStart: string;
  count: number;
}

export interface ResolutionByCategory {
  categoryId: number;
  categoria: string;
  avgDays: number | null;
  completedCount: number;
}

export interface TopLocation {
  ubicacion: string;
  count: number;
}

const DAY_MS = 86_400_000;

function startOfWeekUtc(date: Date): Date {
  const copy = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
  const day = copy.getUTCDay(); // 0 domingo … 6 sábado
  const diff = day === 0 ? 6 : day - 1;
  copy.setUTCDate(copy.getUTCDate() - diff);
  return copy;
}

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async summary(): Promise<AnalyticsSummary> {
    const now = new Date();
    const currentWeek = startOfWeekUtc(now);
    const previousWeek = new Date(currentWeek.getTime() - 7 * DAY_MS);
    const nextWeek = new Date(currentWeek.getTime() + 7 * DAY_MS);

    const [statusGroups, current, previous, avgRows] = await Promise.all([
      this.prisma.report.groupBy({ by: ['estado'], _count: { _all: true } }),
      this.prisma.report.count({
        where: { creadoEn: { gte: currentWeek, lt: nextWeek } },
      }),
      this.prisma.report.count({
        where: { creadoEn: { gte: previousWeek, lt: currentWeek } },
      }),
      this.prisma.$queryRaw<Array<{ avgDays: string | number | null }>>`
        SELECT ROUND(AVG(TIMESTAMPDIFF(SECOND, r.creado_en, s.resuelto_en)) / 86400, 2) AS avgDays
        FROM reportes r
        JOIN soluciones s ON s.reporte_id = r.id
      `,
    ]);

    const countByStatus = new Map(statusGroups.map((group) => [group.estado, group._count._all]));
    const total = statusGroups.reduce((sum, group) => sum + group._count._all, 0);
    const variation =
      previous === 0 ? null : Number((((current - previous) / previous) * 100).toFixed(2));
    const avgDays = avgRows[0]?.avgDays;

    return {
      total,
      pendiente: countByStatus.get('pendiente') ?? 0,
      enProceso: countByStatus.get('en_proceso') ?? 0,
      completado: countByStatus.get('completado') ?? 0,
      semanaActual: current,
      semanaAnterior: previous,
      variacionPct: variation,
      tiempoPromedioDias: avgDays === null || avgDays === undefined ? null : Number(avgDays),
    };
  }

  async weeklyReports(): Promise<WeeklyReportPoint[]> {
    const currentWeek = startOfWeekUtc(new Date());
    const firstWeek = new Date(currentWeek.getTime() - 11 * 7 * DAY_MS);

    const rows = await this.prisma.$queryRaw<Array<{ day: string; count: bigint | number }>>`
      SELECT DATE_FORMAT(creado_en, '%Y-%m-%d') AS day, COUNT(*) AS count
      FROM reportes
      WHERE creado_en >= ${firstWeek}
      GROUP BY DATE_FORMAT(creado_en, '%Y-%m-%d')
      ORDER BY day ASC
    `;

    const buckets = new Map<string, number>();
    for (let index = 0; index < 12; index += 1) {
      const weekStart = new Date(firstWeek.getTime() + index * 7 * DAY_MS);
      buckets.set(isoDate(weekStart), 0);
    }

    for (const row of rows) {
      const day = new Date(`${row.day}T00:00:00.000Z`);
      const bucket = isoDate(startOfWeekUtc(day));
      if (buckets.has(bucket)) {
        buckets.set(bucket, (buckets.get(bucket) ?? 0) + Number(row.count));
      }
    }

    return Array.from(buckets.entries()).map(([weekStart, count]) => ({ weekStart, count }));
  }

  async resolutionByCategory(): Promise<ResolutionByCategory[]> {
    const rows = await this.prisma.$queryRaw<
      Array<{
        categoryId: number;
        categoria: string;
        avgDays: string | number | null;
        completedCount: bigint | number;
      }>
    >`
      SELECT
        c.id AS categoryId,
        c.nombre AS categoria,
        ROUND(AVG(TIMESTAMPDIFF(SECOND, r.creado_en, s.resuelto_en)) / 86400, 2) AS avgDays,
        COUNT(*) AS completedCount
      FROM reportes r
      JOIN categorias c ON c.id = r.categoria_id
      JOIN soluciones s ON s.reporte_id = r.id
      GROUP BY c.id, c.nombre
      ORDER BY avgDays DESC
    `;

    return rows.map((row) => ({
      categoryId: Number(row.categoryId),
      categoria: row.categoria,
      avgDays: row.avgDays === null ? null : Number(row.avgDays),
      completedCount: Number(row.completedCount),
    }));
  }

  async topLocations(limit = 10): Promise<TopLocation[]> {
    const safeLimit = Math.min(50, Math.max(1, limit));
    const rows = await this.prisma.$queryRaw<Array<{ ubicacion: string; count: bigint | number }>>(
      Prisma.sql`
        SELECT ubicacion, COUNT(*) AS count
        FROM reportes
        GROUP BY ubicacion
        ORDER BY count DESC, ubicacion ASC
        LIMIT ${safeLimit}
      `,
    );

    return rows.map((row) => ({ ubicacion: row.ubicacion, count: Number(row.count) }));
  }
}
