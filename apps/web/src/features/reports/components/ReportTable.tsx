import type { Report } from '@banana/api-client';
import { Link } from 'react-router-dom';
import { formatDate } from '@/shared/lib/labels';
import { PriorityBadge, StatusBadge } from '@/shared/components/ui';

export function ReportTable({
  reports,
  showRequester = false,
  showTechnician = true,
}: {
  reports: Report[];
  showRequester?: boolean;
  showTechnician?: boolean;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="table-base w-full min-w-[980px]">
        <thead>
          <tr>
            <th>Folio</th>
            <th>Reporte</th>
            <th>Categoría</th>
            <th>Prioridad</th>
            <th>Estado</th>
            {showTechnician && <th>Técnico</th>}
            {showRequester && <th>Solicitante</th>}
          </tr>
        </thead>
        <tbody>
          {reports.map((report) => (
            <tr key={report.id}>
              <td className="whitespace-nowrap">
                <Link
                  to={`/reports/${report.id}`}
                  className="font-semibold text-banana-800 hover:underline"
                >
                  {report.folio}
                </Link>
                <p className="mt-0.5 text-xs text-slate-400">{formatDate(report.creadoEn, true)}</p>
              </td>
              <td className="w-[34%] max-w-md">
                <p className="line-clamp-2 text-sm text-slate-700">{report.descripcion}</p>
                <p className="mt-1 text-xs text-slate-400">{report.ubicacion}</p>
              </td>
              <td className="text-sm text-slate-600">
                {report.categoria?.nombre ?? '—'}
              </td>
              <td>
                <PriorityBadge priority={report.prioridad} />
              </td>
              <td>
                <StatusBadge status={report.estado} />
              </td>
              {showTechnician && (
                <td className="text-sm text-slate-600">
                  {report.tecnico?.nombre ?? <span className="text-slate-400">Sin asignar</span>}
                </td>
              )}
              {showRequester && (
                <td className="text-sm text-slate-600">{report.usuario?.nombre ?? '—'}</td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
