import { zodResolver } from '@hookform/resolvers/zod';
import type { Report } from '@banana/api-client';
import { Loader2, Play } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Field } from '@/shared/components/form-field';
import { useChangeStatus, useResolveReport } from '../hooks/use-reports';

const schema = z.object({
  descripcion: z
    .string()
    .trim()
    .min(10, 'Describe la solución con al menos 10 caracteres.')
    .max(2000, 'La descripción es demasiado larga.'),
  observaciones: z.string().trim().max(1000, 'Máximo 1000 caracteres.').optional(),
});

type FormValues = z.infer<typeof schema>;

export function TechnicianSolutionPanel({ report }: { report: Report }) {
  const status = useChangeStatus(report.id);
  const resolve = useResolveReport(report.id);
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { descripcion: '', observaciones: '' },
  });

  if (report.estado === 'completado') return null;

  if (report.estado === 'pendiente') {
    return (
      <section className="card p-5">
        <h2 className="text-sm font-semibold text-slate-800">Iniciar atención</h2>
        <p className="mt-1 text-xs text-slate-500">
          {report.tecnico
            ? 'Marca el reporte como en proceso cuando comiences a trabajar en él.'
            : 'Primero debe asignarse un técnico para poder iniciar la atención.'}
        </p>
        <button
          type="button"
          className="btn-primary mt-4 w-full"
          disabled={!report.tecnico || status.isPending}
          onClick={() => status.mutate('en_proceso')}
        >
          {status.isPending ? <Loader2 className="size-4 animate-spin" /> : <Play className="size-4" />}
          Marcar en proceso
        </button>
        {status.isError && <p className="mt-2 text-xs text-red-600">{status.error.message}</p>}
      </section>
    );
  }

  return (
    <section className="card p-5">
      <h2 className="text-sm font-semibold text-slate-800">Registrar solución</h2>
      <p className="mt-1 text-xs text-slate-500">
        Al guardar, el reporte se marcará como completado de forma atómica.
      </p>
      <form
        className="mt-4 space-y-4"
        onSubmit={form.handleSubmit((values) =>
          resolve.mutate({
            descripcion: values.descripcion,
            observaciones: values.observaciones || undefined,
          }),
        )}
        noValidate
      >
        <Field
          label="Solución aplicada"
          htmlFor="solucion"
          error={form.formState.errors.descripcion?.message}
        >
          <textarea
            id="solucion"
            rows={3}
            className="input resize-y"
            placeholder="Describe qué se reparó y cómo se verificó…"
            {...form.register('descripcion')}
          />
        </Field>
        <Field
          label="Observaciones (opcional)"
          htmlFor="observaciones"
          error={form.formState.errors.observaciones?.message}
        >
          <textarea
            id="observaciones"
            rows={2}
            className="input resize-y"
            placeholder="Recomendaciones o material utilizado…"
            {...form.register('observaciones')}
          />
        </Field>
        {resolve.isError && (
          <p className="text-xs text-red-600" role="alert">
            {resolve.error.message}
          </p>
        )}
        <button type="submit" className="btn-primary w-full" disabled={resolve.isPending}>
          {resolve.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
          Guardar solución y completar
        </button>
      </form>
    </section>
  );
}
