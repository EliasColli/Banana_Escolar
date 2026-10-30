import { useQuery } from '@tanstack/react-query';
import { api } from '@/shared/api/client';

export function useAnalyticsSummary() {
  return useQuery({ queryKey: ['analytics', 'summary'], queryFn: () => api.summary() });
}

export function useWeeklyReports() {
  return useQuery({ queryKey: ['analytics', 'weekly'], queryFn: () => api.weeklyReports() });
}

export function useResolutionByCategory() {
  return useQuery({
    queryKey: ['analytics', 'resolution'],
    queryFn: () => api.resolutionByCategory(),
  });
}

export function useTopLocations(limit = 8) {
  return useQuery({
    queryKey: ['analytics', 'locations', limit],
    queryFn: () => api.topLocations(limit),
  });
}
