import type { ListReportsParams } from '@banana/api-client';
import { Plus } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/features/auth/auth-context';
import {
  EmptyState,
  ErrorState,
  LoadingState,
  PageHeader,
  Pagination,
} from '@/shared/components/ui';
import { useDebouncedValue } from '@/shared/hooks/use-debounced-value';
import { ReportFilters } from '../components/ReportFilters';
import { ReportTable } from '../components/ReportTable';
import { useReports } from '../hooks/use-reports';
import { EMPTY_FILTERS, type ReportFilterValues } from '../types/report-filters';

type Variant = 'mine' | 'history' | 'inbox';

const COPY: Record<Variant, { title: string; description: string; eyebrow: string }> = {
  mine: {
    title: 'Mis reportes',
    description: 'Consulta el estado y seguimiento de las incidencias que has registrado.',
    eyebrow: 'Solicitante',
  },
  history: {
    title: 'Historial general',
    description:
      'Todos los reportes del plantel con búsqueda, filtros combinados y paginación en servidor.',
    eyebrow: 'Administración',
  },
  inbox: {
    title: 'Mi bandeja',
    description: 'Incidencias asignadas a ti. Atiende, actualiza el estado y registra soluciones.',
    eyebrow: 'Técnico',
  },
};

export function ReportsListPage({ variant }: { variant: Variant }) {
  const { user } = useAuth();
  const [filters, setFilters] = useState<ReportFilterValues>(EMPTY_FILTERS);
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebouncedValue(filters.search);

  const params = useMemo<ListReportsParams>(() => {
    const parsedCategory = Number(filters.categoryId);
    return {
      page,
      limit: 20,
      search: debouncedSearch || undefined,
      categoryId: Number.isFinite(parsedCategory) && parsedCategory > 0 ? parsedCategory : undefined,
      status: filters.status || undefined,
      priority: filters.priority || undefined,
      from: filters.from || undefined,
      to: filters.to || undefined,
    };
  }, [page, filters, debouncedSearch]);

  const query = useReports(params);
  const copy = COPY[variant];

  return (
    <div>
      <PageHeader
        eyebrow={copy.eyebrow}
        title={copy.title}
        description={copy.description}
        actions={
          variant === 'mine' || user?.rol === 'ADMIN' ? (
            <Link to="/reports/new" className="btn-primary">
              <Plus className="size-4" /> Nuevo reporte
            </Link>
          ) : null
        }
      />

      <ReportFilters
        value={filters}
        onChange={(next) => {
          setFilters(next);
          setPage(1);
        }}
      />

      {query.isPending ? (
        <LoadingState />
      ) : query.isError ? (
        <ErrorState message={query.error.message} onRetry={() => void query.refetch()} />
      ) : query.data.data.length === 0 ? (
        <div className="card">
          <EmptyState
            title="No hay reportes con esos filtros"
            description={
              variant === 'mine'
                ? 'Cuando registres una incidencia aparecerá aquí con su folio y estado.'
                : 'Prueba con otros filtros o limpia la búsqueda para ver más resultados.'
            }
            action={
              variant === 'mine' ? (
                <Link to="/reports/new" className="btn-primary">
                  Registrar incidencia
                </Link>
              ) : null
            }
          />
        </div>
      ) : (
        <div className="card overflow-hidden">
          <ReportTable
            reports={query.data.data}
            showRequester={variant !== 'mine'}
            showTechnician={variant !== 'mine'}
          />
          <Pagination
            page={query.data.meta.page}
            totalPages={query.data.meta.totalPages}
            total={query.data.meta.total}
            onPageChange={setPage}
          />
        </div>
      )}
    </div>
  );
}

export function MyReportsPage() {
  return <ReportsListPage variant="mine" />;
}

export function AdminHistoryPage() {
  return <ReportsListPage variant="history" />;
}

export function TechnicianInboxPage() {
  return <ReportsListPage variant="inbox" />;
}
