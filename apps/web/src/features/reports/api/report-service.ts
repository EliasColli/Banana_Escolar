import type {
  CreateReportInput,
  ListReportsParams,
  ReportStatus,
} from '@banana/api-client';
import { api } from '@/shared/api/client';

export const reportService = {
  list: (params: ListReportsParams) => api.reports(params),
  get: (id: number) => api.report(id),
  create: (input: CreateReportInput) => api.createReport(input),
  assign: (id: number, tecnicoId?: number) => api.assignReport(id, tecnicoId),
  changeStatus: (id: number, estado: ReportStatus) => api.changeStatus(id, estado),
  resolve: (id: number, input: { descripcion: string; observaciones?: string }) =>
    api.resolveReport(id, input),
  upload: (id: number, file: File) => api.uploadAttachment(id, file),
  download: (reportId: number, attachmentId: number) =>
    api.downloadAttachment(reportId, attachmentId),
};
