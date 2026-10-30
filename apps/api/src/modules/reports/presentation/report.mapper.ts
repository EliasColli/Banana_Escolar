import { AttachmentRecord, ReportRecord, SolutionRecord } from '../domain/report.types';

export interface AttachmentResponse {
  id: number;
  reporteId: number;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
  url: string;
}

export interface SolutionResponse extends Omit<SolutionRecord, 'resueltoEn'> {
  resueltoEn: string;
}

export interface ReportResponse
  extends Omit<ReportRecord, 'creadoEn' | 'asignadoEn' | 'solucion' | 'adjuntos'> {
  creadoEn: string;
  asignadoEn: string | null;
  solucion: SolutionResponse | null;
  adjuntos: AttachmentResponse[];
}

function toAttachment(attachment: AttachmentRecord): AttachmentResponse {
  return {
    id: attachment.id,
    reporteId: attachment.reporteId,
    mimeType: attachment.mimeType,
    sizeBytes: attachment.sizeBytes,
    createdAt: attachment.createdAt.toISOString(),
    url: `/v1/reports/${attachment.reporteId}/attachments/${attachment.id}`,
  };
}

export function toReportResponse(report: ReportRecord): ReportResponse {
  return {
    id: report.id,
    folio: report.folio,
    usuarioId: report.usuarioId,
    categoriaId: report.categoriaId,
    tecnicoId: report.tecnicoId,
    descripcion: report.descripcion,
    ubicacion: report.ubicacion,
    prioridad: report.prioridad,
    estado: report.estado,
    creadoEn: report.creadoEn.toISOString(),
    asignadoEn: report.asignadoEn ? report.asignadoEn.toISOString() : null,
    categoria: report.categoria,
    usuario: report.usuario,
    tecnico: report.tecnico,
    solucion: report.solucion
      ? { ...report.solucion, resueltoEn: report.solucion.resueltoEn.toISOString() }
      : null,
    adjuntos: (report.adjuntos ?? []).map(toAttachment),
  };
}

export interface PaginatedReportsResponse {
  data: ReportResponse[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}
