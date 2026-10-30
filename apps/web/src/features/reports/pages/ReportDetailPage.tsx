import { ArrowLeft, CalendarDays, MapPin, UserRound, Wrench } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '@/features/auth/auth-context';
import { ErrorState, LoadingState, PriorityBadge, StatusBadge } from '@/shared/components/ui';
import { formatDate } from '@/shared/lib/labels';
import { AdminAssignmentPanel } from '../components/AdminAssignmentPanel';
import { AttachmentPanel } from '../components/AttachmentPanel';
import { TechnicianSolutionPanel } from '../components/TechnicianSolutionPanel';
import { useReport } from '../hooks/use-reports';

export function ReportDetailPage() {
  const params = useParams<{ id: string }>();
  const id = Number(params.id);
  const { user } = useAuth();
  const query = useReport(id);

  if (query.isPending) return <LoadingState label="Cargando reporte…" />;
  if (query.isError) {
    return (
      <div>
        <Link
          to="/reports"
          className="mb-4 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800"
        >
          <ArrowLeft className="size-4" /> Volver
        </Link>
        <ErrorState message={query.error.message} onRetry={() => void query.refetch()} />
      </div>
    );
  }

  const report = query.data;
  const isAdmin = user?.rol === 'ADMIN';
  const isOwner = user?.id === report.usuarioId;
  const isAssignedTechnician = user?.rol === 'TECNICO' && user.id === report.tecnicoId;
  const canEditAttachment = isOwner || isAdmin;
  const canOperate = isAdmin || isAssignedTechnician;
  const backTo = isAdmin ? '/history' : user?.rol === 'TECNICO' ? '/inbox' : '/reports';

  return (
    <div>
      <Link
        to={backTo}
        className="mb-4 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800"
      >
        <ArrowLeft className="size-4" /> Volver
      </Link>

      <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-mono text-xs font-semibold tracking-wide text-slate-500">
              {report.folio}
            </p>
            <StatusBadge status={report.estado} />
            <PriorityBadge priority={report.prioridad} />
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
            {report.categoria?.nombre ?? 'Reporte'}
          </h1>
          <p className="mt-1 flex items-center gap-1 text-sm text-slate-500">
            <CalendarDays className="size-4" /> Registrado el {formatDate(report.creadoEn, true)}
          </p>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1.7fr_1fr]">
        <div className="space-y-6">
          <section className="card p-6">
            <h2 className="text-sm font-semibold text-slate-800">Descripción de la incidencia</h2>
            <p className="mt-2 text-sm leading-relaxed whitespace-pre-line text-slate-700">
              {report.descripcion}
            </p>

            <dl className="mt-6 grid gap-4 border-t border-slate-100 pt-5 sm:grid-cols-2">
              <div>
                <dt className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-slate-400 uppercase">
                  <MapPin className="size-3.5" /> Ubicación
                </dt>
                <dd className="mt-1 text-sm text-slate-700">{report.ubicacion}</dd>
              </div>
              <div>
                <dt className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-slate-400 uppercase">
                  <UserRound className="size-3.5" /> Solicitante
                </dt>
                <dd className="mt-1 text-sm text-slate-700">{report.usuario?.nombre ?? '—'}</dd>
              </div>
              <div>
                <dt className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-slate-400 uppercase">
                  <Wrench className="size-3.5" /> Técnico asignado
                </dt>
                <dd className="mt-1 text-sm text-slate-700">
                  {report.tecnico?.nombre ?? (
                    <span className="text-amber-700">Aún sin asignar</span>
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold tracking-wide text-slate-400 uppercase">
                  Fechas
                </dt>
                <dd className="mt-1 space-y-0.5 text-sm text-slate-700">
                  <p>Creado: {formatDate(report.creadoEn, true)}</p>
                  <p>Asignado: {formatDate(report.asignadoEn, true)}</p>
                  {report.solucion && <p>Resuelto: {formatDate(report.solucion.resueltoEn, true)}</p>}
                </dd>
              </div>
            </dl>
          </section>

          {report.solucion && (
            <section className="card border-emerald-200 bg-emerald-50/60 p-6">
              <h2 className="text-sm font-semibold text-emerald-900">Solución registrada</h2>
              <p className="mt-2 text-sm leading-relaxed text-emerald-950">
                {report.solucion.descripcion}
              </p>
              {report.solucion.observaciones && (
                <p className="mt-3 rounded-lg bg-white/70 p-3 text-xs text-emerald-900">
                  <span className="font-semibold">Observaciones:</span>{' '}
                  {report.solucion.observaciones}
                </p>
              )}
              <p className="mt-3 text-xs text-emerald-800">
                Resuelto por {report.solucion.tecnico?.nombre ?? report.tecnico?.nombre ?? '—'} el{' '}
                {formatDate(report.solucion.resueltoEn, true)}
              </p>
            </section>
          )}

          <section className="card p-6">
            <AttachmentPanel report={report} canEdit={canEditAttachment} />
            {!report.adjuntos?.length && !canEditAttachment && (
              <p className="text-sm text-slate-400">Sin fotografía adjunta.</p>
            )}
          </section>
        </div>

        <aside className="space-y-5">
          {canOperate && report.estado !== 'completado' && (
            <TechnicianSolutionPanel report={report} />
          )}
          {isAdmin && <AdminAssignmentPanel report={report} />}
          {!isAdmin && !canOperate && (
            <section className="card p-5 text-sm text-slate-500">
              <h2 className="text-sm font-semibold text-slate-800">Seguimiento</h2>
              <p className="mt-2">
                {report.estado === 'pendiente'
                  ? 'El equipo administrativo asignará un técnico para atender tu reporte.'
                  : report.estado === 'en_proceso'
                    ? 'El técnico asignado está trabajando en la incidencia.'
                    : 'La incidencia fue resuelta. Consulta la solución registrada.'}
              </p>
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}
