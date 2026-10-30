import { Search, X } from 'lucide-react';
import { useCategories } from '@/shared/hooks/use-catalogs';
import { EMPTY_FILTERS, type ReportFilterValues } from '../types/report-filters';

export function ReportFilters({
  value,
  onChange,
}: {
  value: ReportFilterValues;
  onChange: (value: ReportFilterValues) => void;
}) {
  const { data: categories = [] } = useCategories();

  const update = (patch: Partial<ReportFilterValues>) => onChange({ ...value, ...patch });
  const hasFilters = Object.entries(value).some(([, entry]) => entry !== '');

  return (
    <div className="card mb-5 p-4">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
        <div className="relative md:col-span-2">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            className="input pl-9"
            placeholder="Buscar por folio, descripción o ubicación…"
            aria-label="Buscar reportes"
            value={value.search}
            onChange={(event) => update({ search: event.target.value })}
          />
        </div>

        <select
          className="input"
          aria-label="Categoría"
          value={value.categoryId}
          onChange={(event) => update({ categoryId: event.target.value })}
        >
          <option value="">Todas las categorías</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.nombre}
            </option>
          ))}
        </select>

        <select
          className="input"
          aria-label="Estado"
          value={value.status}
          onChange={(event) => update({ status: event.target.value as ReportFilterValues['status'] })}
        >
          <option value="">Todos los estados</option>
          <option value="pendiente">Pendiente</option>
          <option value="en_proceso">En proceso</option>
          <option value="completado">Completado</option>
        </select>

        <select
          className="input"
          aria-label="Prioridad"
          value={value.priority}
          onChange={(event) =>
            update({ priority: event.target.value as ReportFilterValues['priority'] })
          }
        >
          <option value="">Todas las prioridades</option>
          <option value="alta">Alta</option>
          <option value="media">Media</option>
          <option value="baja">Baja</option>
        </select>

        <div className="flex items-center gap-2">
          <input
            type="date"
            className="input"
            aria-label="Desde"
            value={value.from}
            onChange={(event) => update({ from: event.target.value })}
          />
          <span className="text-xs text-slate-400">a</span>
          <input
            type="date"
            className="input"
            aria-label="Hasta"
            value={value.to}
            onChange={(event) => update({ to: event.target.value })}
          />
        </div>
      </div>

      {hasFilters && (
        <div className="mt-3 flex justify-end">
          <button
            type="button"
            className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-800"
            onClick={() => onChange(EMPTY_FILTERS)}
          >
            <X className="size-3.5" /> Limpiar filtros
          </button>
        </div>
      )}
    </div>
  );
}
