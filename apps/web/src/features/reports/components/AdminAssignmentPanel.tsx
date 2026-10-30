import type { Report } from '@banana/api-client';
import { Loader2, Wand2 } from 'lucide-react';
import { useState } from 'react';
import { useTechnicians } from '@/shared/hooks/use-catalogs';
import { useAssignReport } from '../hooks/use-reports';

export function AdminAssignmentPanel({ report }: { report: Report }) {
  const { data: technicians = [], isPending } = useTechnicians();
  const [technicianId, setTechnicianId] = useState<string>(
    report.tecnicoId ? String(report.tecnicoId) : '',
  );
  const mutation = useAssignReport(report.id);
  const locked = report.estado === 'completado';

  return (
    <section className="card p-5">
      <h2 className="text-sm font-semibold text-slate-800">Asignación de técnico</h2>
      <p className="mt-1 text-xs text-slate-500">
        {report.tecnico
          ? `Actualmente asignado a ${report.tecnico.nombre}.`
          : 'El reporte aún no tiene técnico asignado.'}
      </p>

      <div className="mt-4 space-y-3">
        <select
          className="input"
          value={technicianId}
          onChange={(event) => setTechnicianId(event.target.value)}
          disabled={locked || isPending}
          aria-label="Técnico"
        >
          <option value="">Selecciona un técnico…</option>
          {technicians.map((technician) => (
            <option key={technician.id} value={technician.id}>
              {technician.nombre} ({technician.reportesAbiertos ?? 0} abiertos)
            </option>
          ))}
        </select>

        <button
          type="button"
          className="btn-primary w-full"
          disabled={locked || mutation.isPending}
          onClick={() => mutation.mutate(technicianId ? Number(technicianId) : undefined)}
        >
          {mutation.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
          {technicianId ? 'Asignar técnico' : 'Asignar automáticamente'}
        </button>

        <button
          type="button"
          className="btn-secondary w-full"
          disabled={locked || mutation.isPending}
          onClick={() => mutation.mutate(undefined)}
        >
          <Wand2 className="size-4" /> Elegir técnico con menos carga
        </button>

        {mutation.isError && (
          <p className="text-xs text-red-600" role="alert">
            {mutation.error.message}
          </p>
        )}
        {mutation.isSuccess && (
          <p className="text-xs text-leaf-700">Asignación actualizada correctamente.</p>
        )}
        {locked && (
          <p className="text-xs text-slate-400">Un reporte completado no puede reasignarse.</p>
        )}
      </div>
    </section>
  );
}
