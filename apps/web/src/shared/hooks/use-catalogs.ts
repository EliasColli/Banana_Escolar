import { useQuery } from '@tanstack/react-query';
import { api } from '@/shared/api/client';

export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: () => api.categories(),
    staleTime: 10 * 60_000,
  });
}

export function useTechnicians(enabled = true) {
  return useQuery({
    queryKey: ['users', 'technicians'],
    queryFn: () => api.technicians(),
    staleTime: 60_000,
    enabled,
  });
}

export function useUsers(enabled = true) {
  return useQuery({
    queryKey: ['users', 'all'],
    queryFn: () => api.users(),
    enabled,
  });
}
