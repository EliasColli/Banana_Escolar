import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import {
  CreateReportData,
  ReportListQuery,
  ReportRecord,
  ReportRepository,
  ResolveReportData,
} from '../domain/report.types';

const reportSelect = {
  id: true,
  folio: true,
  usuarioId: true,
  categoriaId: true,
  tecnicoId: true,
  descripcion: true,
  ubicacion: true,
  prioridad: true,
  estado: true,
  creadoEn: true,
  asignadoEn: true,
  categoria: { select: { id: true, nombre: true } },
  usuario: { select: { id: true, nombre: true, correo: true } },
  tecnico: { select: { id: true, nombre: true } },
  solucion: {
    select: {
      id: true,
      reporteId: true,
      tecnicoId: true,
      descripcion: true,
      observaciones: true,
      resueltoEn: true,
      tecnico: { select: { id: true, nombre: true } },
    },
  },
  adjuntos: {
    select: {
      id: true,
      reporteId: true,
      storageKey: true,
      mimeType: true,
      sizeBytes: true,
      uploadedBy: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'asc' as const },
  },
} satisfies Prisma.ReportSelect;

type ReportRow = Prisma.ReportGetPayload<{ select: typeof reportSelect }>;

function toRecord(row: ReportRow): ReportRecord {
  return {
    id: row.id,
    folio: row.folio,
    usuarioId: row.usuarioId,
    categoriaId: row.categoriaId,
    tecnicoId: row.tecnicoId,
    descripcion: row.descripcion,
    ubicacion: row.ubicacion,
    prioridad: row.prioridad,
    estado: row.estado,
    creadoEn: row.creadoEn,
    asignadoEn: row.asignadoEn,
    categoria: row.categoria,
    usuario: row.usuario,
    tecnico: row.tecnico,
    solucion: row.solucion,
    adjuntos: row.adjuntos,
  };
}

@Injectable()
export class PrismaReportRepository implements ReportRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateReportData): Promise<ReportRecord> {
    const category = await this.prisma.category.findUnique({ where: { id: data.categoriaId } });
    if (!category) throw new NotFoundException('La categoría no existe.');

    const year = new Date().getUTCFullYear();
    const report = await this.prisma.$transaction(async (tx) => {
      // Contador transaccional: evita colisiones de folio (nunca COUNT(*)+1).
      const counter = await tx.folioCounter.upsert({
        where: { year },
        create: { year, lastValue: 1 },
        update: { lastValue: { increment: 1 } },
      });
      const folio = `REP-${year}-${String(counter.lastValue).padStart(5, '0')}`;

      return tx.report.create({
        data: {
          folio,
          usuarioId: data.usuarioId,
          categoriaId: data.categoriaId,
          descripcion: data.descripcion,
          ubicacion: data.ubicacion,
          prioridad: data.prioridad,
          estado: 'pendiente',
        },
        select: reportSelect,
      });
    });

    return toRecord(report);
  }

  async findById(id: number): Promise<ReportRecord | null> {
    const report = await this.prisma.report.findUnique({ where: { id }, select: reportSelect });
    return report ? toRecord(report) : null;
  }

  async list(query: ReportListQuery): Promise<{ data: ReportRecord[]; total: number }> {
    const { actor, filters, page, limit } = query;
    const where: Prisma.ReportWhereInput = {};

    if (actor.rol === 'USUARIO') {
      where.usuarioId = actor.id;
    } else if (actor.rol === 'TECNICO') {
      where.tecnicoId = actor.id;
    } else if (filters.assignment === 'me') {
      where.usuarioId = actor.id;
    }

    if (filters.assignment === 'unassigned') where.tecnicoId = null;
    if (filters.categoryId) where.categoriaId = filters.categoryId;
    if (filters.status) where.estado = filters.status;
    if (filters.priority) where.prioridad = filters.priority;

    if (filters.from || filters.to) {
      where.creadoEn = {
        ...(filters.from ? { gte: filters.from } : {}),
        ...(filters.to ? { lte: filters.to } : {}),
      };
    }

    if (filters.search?.trim()) {
      const search = filters.search.trim();
      where.OR = [
        { descripcion: { contains: search } },
        { ubicacion: { contains: search } },
        { folio: { contains: search } },
      ];
    }

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.report.findMany({
        where,
        select: reportSelect,
        orderBy: [{ creadoEn: 'desc' }, { id: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.report.count({ where }),
    ]);

    return { data: rows.map(toRecord), total };
  }

  async assign(id: number, tecnicoId: number): Promise<ReportRecord> {
    const updated = await this.prisma.$transaction(async (tx) => {
      const report = await tx.report.findUnique({ where: { id } });
      if (!report) throw new NotFoundException('Reporte no encontrado.');
      if (report.estado === 'completado') {
        throw new ConflictException('No se puede reasignar un reporte completado.');
      }

      return tx.report.update({
        where: { id },
        data: {
          tecnicoId,
          asignadoEn: report.asignadoEn ?? new Date(),
          estado: report.estado === 'pendiente' ? 'en_proceso' : report.estado,
        },
        select: reportSelect,
      });
    });

    return toRecord(updated);
  }

  async changeStatus(id: number, status: 'pendiente' | 'en_proceso' | 'completado'): Promise<ReportRecord> {
    const updated = await this.prisma.$transaction(async (tx) => {
      const report = await tx.report.findUnique({ where: { id }, select: { estado: true } });
      if (!report) throw new NotFoundException('Reporte no encontrado.');

      const result = await tx.report.updateMany({
        where: { id, estado: report.estado },
        data: { estado: status },
      });
      if (result.count !== 1) {
        throw new ConflictException('El reporte cambió de estado. Recarga e inténtalo de nuevo.');
      }

      return tx.report.findUniqueOrThrow({ where: { id }, select: reportSelect });
    });

    return toRecord(updated);
  }

  async resolve(id: number, data: ResolveReportData): Promise<ReportRecord> {
    const updated = await this.prisma.$transaction(async (tx) => {
      const report = await tx.report.findUnique({
        where: { id },
        select: { id: true, estado: true, tecnicoId: true },
      });
      if (!report) throw new NotFoundException('Reporte no encontrado.');
      if (report.estado === 'completado') {
        throw new ConflictException('El reporte ya está completado.');
      }
      if (report.estado !== 'en_proceso' || !report.tecnicoId) {
        throw new ConflictException('Solo un reporte en proceso con técnico puede resolverse.');
      }

      const existing = await tx.solution.findUnique({ where: { reporteId: id } });
      if (existing) throw new ConflictException('El reporte ya tiene una solución registrada.');

      await tx.solution.create({
        data: {
          reporteId: id,
          tecnicoId: report.tecnicoId,
          descripcion: data.descripcion,
          observaciones: data.observaciones ?? null,
          resueltoEn: new Date(),
        },
      });

      await tx.report.update({
        where: { id },
        data: { estado: 'completado' },
      });

      return tx.report.findUniqueOrThrow({ where: { id }, select: reportSelect });
    });

    return toRecord(updated);
  }

  async findLeastLoadedTechnician(): Promise<number | null> {
    const rows = await this.prisma.$queryRaw<Array<{ id: number }>>`
      SELECT u.id
      FROM usuarios u
      LEFT JOIN reportes r
        ON r.tecnico_id = u.id AND r.estado <> 'completado'
      WHERE u.rol = 'TECNICO' AND u.activo = 1
      GROUP BY u.id
      ORDER BY COUNT(r.id) ASC, u.id ASC
      LIMIT 1
    `;
    return rows[0]?.id ?? null;
  }

  async findActiveTechnician(id: number): Promise<{ id: number; nombre: string } | null> {
    return this.prisma.user.findFirst({
      where: { id, rol: 'TECNICO', activo: true },
      select: { id: true, nombre: true },
    });
  }
}
