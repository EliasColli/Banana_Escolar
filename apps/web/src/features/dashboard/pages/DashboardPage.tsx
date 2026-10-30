import { Info, RefreshCw } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import {
  ErrorState,
  LoadingState,
  PageHeader,
  StatCard,
} from '@/shared/components/ui';
import { formatDays, formatNumber } from '@/shared/lib/labels';
import {
  ResolutionByCategoryChart,
  TopLocationsChart,
  WeeklyReportsChart,
} from '../components/charts';
import {
  useAnalyticsSummary,
  useResolutionByCategory,
  useTopLocations,
  useWeeklyReports,
} from '../hooks/use-dashboard';

function ChartCard({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="card p-5">
      <h2 className="text-sm font-semibold text-slate-800">{title}</h2>
      <p className="mt-0.5 text-xs text-slate-500">{description}</p>
      <div className="mt-4">{children}</div>
    </section>
  );
}

export function DashboardPage() {
  const queryClient = useQueryClient();
  const summary = useAnalyticsSummary();
  const weekly = useWeeklyReports();
  const resolution = useResolutionByCategory();
  const locations = useTopLocations(8);

  if (summary.isPending) return <LoadingState label="Calculando indicadores desde MySQL…" />;
  if (summary.isError) {
    return <ErrorState message={summary.error.message} onRetry={() => void summary.refetch()} />;
  }

  const data = summary.data;
  const completionRate = data.total > 0 ? Math.round((data.completado / data.total) * 100) : 0;

  return (
    <div>
      <PageHeader
        eyebrow="Analítica"
        title="Dashboard de incidencias"
        description="Indicadores calculados en tiempo real desde MySQL. Los datos corresponden a la base de prueba sintética."
        actions={
          <button
            type="button"
            className="btn-secondary"
            onClick={() => void queryClient.invalidateQueries({ queryKey: ['analytics'] })}
          >
            <RefreshCw className="size-4" /> Actualizar
          </button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total recibido"
          value={formatNumber(data.total)}
          hint="Reportes registrados en el sistema"
        />
        <StatCard
          label="Pendientes"
          value={formatNumber(data.pendiente)}
          hint="Aún sin iniciar atención"
          tone="warning"
        />
        <StatCard
          label="En proceso"
          value={formatNumber(data.enProceso)}
          hint="Con técnico asignado"
          tone="info"
        />
        <StatCard
          label="Completados"
          value={formatNumber(data.completado)}
          hint={`${completionRate}% del total`}
          tone="success"
        />
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <div className="card flex items-center justify-between p-5 sm:col-span-2">
          <div>
            <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
              Tiempo promedio de resolución
            </p>
            <p className="mt-1 text-2xl font-bold text-slate-900">
              {formatDays(data.tiempoPromedioDias)}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Desde la creación hasta el registro de la solución.
            </p>
          </div>
          <span className="hidden rounded-2xl bg-leaf-500/10 px-4 py-3 text-3xl sm:block">⏱️</span>
        </div>
        <div className="card flex items-center justify-between p-5">
          <div>
            <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
              Esta semana
            </p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{formatNumber(data.semanaActual)}</p>
            <p className="mt-1 text-xs text-slate-500">
              {data.variacionPct === null
                ? `Semana anterior: ${data.semanaAnterior}`
                : `${data.variacionPct >= 0 ? '▲' : '▼'} ${Math.abs(data.variacionPct)}% vs. semana anterior`}
            </p>
          </div>
          <span className="hidden rounded-2xl bg-banana-100 px-4 py-3 text-3xl sm:block">📈</span>
        </div>
      </div>

      <div className="mt-6 space-y-6">
        <ChartCard
          title="M1 · Reportes creados por semana"
          description="Últimas 12 semanas. Agrupación semanal desde el lunes."
        >
          {weekly.isPending ? (
            <LoadingState label="Cargando serie semanal…" />
          ) : weekly.isError ? (
            <ErrorState message={weekly.error.message} onRetry={() => void weekly.refetch()} />
          ) : (
            <WeeklyReportsChart data={weekly.data} />
          )}
        </ChartCard>

        <div className="grid gap-6 xl:grid-cols-2">
          <ChartCard
            title="M2 · Días promedio de resolución"
            description="Agrupado por categoría, solo reportes con solución registrada."
          >
            {resolution.isPending ? (
              <LoadingState label="Cargando tiempos…" />
            ) : resolution.isError ? (
              <ErrorState
                message={resolution.error.message}
                onRetry={() => void resolution.refetch()}
              />
            ) : (
              <ResolutionByCategoryChart data={resolution.data} />
            )}
          </ChartCard>

          <ChartCard
            title="M3 · Ubicaciones con más incidencias"
            description="Ocho ubicaciones con mayor número de reportes."
          >
            {locations.isPending ? (
              <LoadingState label="Cargando ubicaciones…" />
            ) : locations.isError ? (
              <ErrorState message={locations.error.message} onRetry={() => void locations.refetch()} />
            ) : (
              <TopLocationsChart data={locations.data} />
            )}
          </ChartCard>
        </div>
      </div>

      <div className="mt-6 flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-xs text-slate-500">
        <Info className="mt-0.5 size-4 shrink-0 text-banana-700" />
        <p>
          Datos sintéticos generados con semilla 2026 y cargados por el ETL (10,000 reportes
          válidos). Las cifras no representan una escuela real y se recalculan en cada consulta;
          no hay números codificados en la interfaz.
        </p>
      </div>
    </div>
  );
}
