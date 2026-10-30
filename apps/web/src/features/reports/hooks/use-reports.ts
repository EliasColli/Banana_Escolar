import type { ListReportsParams, ReportStatus } from '@banana/api-client';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { reportService } from '../api/report-service';

export const reportKeys = {
  all: ['reports'] as const,
  list: (params: ListReportsParams) => ['reports', 'list', params] as const,
  detail: (id: number) => ['reports', 'detail', id] as const,
};

export function useReports(params: ListReportsParams) {
  return useQuery({
    queryKey: reportKeys.list(params),
    queryFn: () => reportService.list(params),
    placeholderData: keepPreviousData,
  });
}

export function useReport(id: number) {
  return useQuery({
    queryKey: reportKeys.detail(id),
    queryFn: () => reportService.get(id),
    enabled: Number.isFinite(id) && id > 0,
  });
}

function useInvalidateReport(id?: number) {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: reportKeys.all });
    if (id) void queryClient.invalidateQueries({ queryKey: reportKeys.detail(id) });
    void queryClient.invalidateQueries({ queryKey: ['analytics'] });
  };
}

export function useCreateReport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: reportService.create,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: reportKeys.all });
    },
  });
}

export function useAssignReport(id: number) {
  const invalidate = useInvalidateReport(id);
  return useMutation({
    mutationFn: (tecnicoId?: number) => reportService.assign(id, tecnicoId),
    onSuccess: invalidate,
  });
}

export function useChangeStatus(id: number) {
  const invalidate = useInvalidateReport(id);
  return useMutation({
    mutationFn: (estado: ReportStatus) => reportService.changeStatus(id, estado),
    onSuccess: invalidate,
  });
}

export function useResolveReport(id: number) {
  const invalidate = useInvalidateReport(id);
  return useMutation({
    mutationFn: (input: { descripcion: string; observaciones?: string }) =>
      reportService.resolve(id, input),
    onSuccess: invalidate,
  });
}

export function useUploadAttachment(id: number) {
  const invalidate = useInvalidateReport(id);
  return useMutation({
    mutationFn: (file: File) => reportService.upload(id, file),
    onSuccess: invalidate,
  });
}
