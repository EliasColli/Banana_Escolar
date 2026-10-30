import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { z } from 'zod';
import { Field } from '@/shared/components/form-field';
import { PageHeader, Spinner } from '@/shared/components/ui';
import { useCategories } from '@/shared/hooks/use-catalogs';
import { useCreateReport } from '../hooks/use-reports';

const schema = z.object({
  categoriaId: z.number().int().min(1, 'Selecciona una categoría.'),
  descripcion: z
    .string()
    .trim()
    .min(10, 'Describe la falla con al menos 10 caracteres.')
    .max(2000, 'La descripción es demasiado larga.'),
  ubicacion: z
    .string()
    .trim()
    .min(3, 'Indica la ubicación exacta.')
    .max(190, 'La ubicación es demasiado larga.'),
  prioridad: z.enum(['baja', 'media', 'alta']),
});

type FormValues = z.infer<typeof schema>;

export function NewReportPage() {
  const { data: categories = [], isPending: loadingCategories } = useCategories();
  const mutation = useCreateReport();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { categoriaId: 0, descripcion: '', ubicacion: '', prioridad: 'media' },
  });

  if (mutation.isSuccess) {
    const report = mutation.data;
    return (
      <div className="mx-auto max-w-xl">
        <div className="card p-8 text-center">
          <CheckCircle2 className="mx-auto size-12 text-leaf-600" />
          <h1 className="mt-4 text-xl font-bold text-slate-900">Reporte registrado</h1>
          <p className="mt-2 text-sm text-slate-500">
            Tu incidencia fue registrada con el folio{' '}
            <span className="font-mono font-semibold text-slate-800">{report.folio}</span>. El
            equipo de mantenimiento podrá asignarla a un técnico.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <Link to={`/reports/${report.id}`} className="btn-primary">
              Ver detalle y adjuntar foto
            </Link>
            <Link to="/reports" className="btn-secondary">
              Ir a mis reportes
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl">
      <Link
        to="/reports"
        className="mb-4 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800"
      >
        <ArrowLeft className="size-4" /> Volver
      </Link>
      <PageHeader
        eyebrow="Nueva incidencia"
        title="Registrar reporte"
        description="Describe el desperfecto con el mayor detalle posible. El folio y la fecha se generan automáticamente en el servidor."
      />

      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <form
          className="card space-y-5 p-6"
          onSubmit={form.handleSubmit((values) => mutation.mutate(values))}
          noValidate
        >
          <Field label="Categoría" htmlFor="categoria" error={form.formState.errors.categoriaId?.message}>
            <select
              id="categoria"
              className="input"
              disabled={loadingCategories}
              {...form.register('categoriaId', { valueAsNumber: true })}
            >
              <option value={0}>Selecciona una categoría…</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.nombre}
                </option>
              ))}
            </select>
          </Field>

          <Field
            label="Descripción de la falla"
            htmlFor="descripcion"
            error={form.formState.errors.descripcion?.message}
            hint="Incluye qué ocurre, desde cuándo y si representa un riesgo."
          >
            <textarea
              id="descripcion"
              rows={5}
              className="input resize-y"
              placeholder="Ej. La llave del lavabo del baño del edificio A gotea desde ayer y moja el piso…"
              {...form.register('descripcion')}
            />
          </Field>

          <Field
            label="Ubicación"
            htmlFor="ubicacion"
            error={form.formState.errors.ubicacion?.message}
            hint="Edificio, piso, aula o área específica."
          >
            <input
              id="ubicacion"
              className="input"
              placeholder="Ej. Edificio A, baño de planta baja"
              {...form.register('ubicacion')}
            />
          </Field>

          <Field
            label="Prioridad"
            htmlFor="prioridad"
            error={form.formState.errors.prioridad?.message}
            hint="Si no estás seguro, deja Media. El equipo puede ajustarla."
          >
            <select id="prioridad" className="input" {...form.register('prioridad')}>
              <option value="baja">Baja</option>
              <option value="media">Media</option>
              <option value="alta">Alta</option>
            </select>
          </Field>

          {mutation.isError && (
            <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
              {mutation.error.message}
            </p>
          )}

          <div className="flex justify-end">
            <button type="submit" className="btn-primary" disabled={mutation.isPending}>
              {mutation.isPending && <Spinner className="size-4" />}
              Registrar reporte
            </button>
          </div>
        </form>

        <aside className="space-y-4">
          <div className="card p-5">
            <h2 className="text-sm font-semibold text-slate-800">¿Qué pasa después?</h2>
            <ol className="mt-3 space-y-3 text-sm text-slate-600">
              <li className="flex gap-2">
                <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-banana-100 text-xs font-bold text-banana-800">
                  1
                </span>
                El reporte queda <strong>pendiente</strong> con un folio único.
              </li>
              <li className="flex gap-2">
                <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-banana-100 text-xs font-bold text-banana-800">
                  2
                </span>
                Dirección asigna un técnico (manual o automáticamente).
              </li>
              <li className="flex gap-2">
                <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-banana-100 text-xs font-bold text-banana-800">
                  3
                </span>
                El técnico atiende y registra la solución; el estado cambia a{' '}
                <strong>completado</strong>.
              </li>
            </ol>
          </div>
          <div className="rounded-2xl border border-banana-200 bg-banana-50 p-4 text-xs text-banana-900">
            Puedes adjuntar una fotografía (JPEG, PNG o WebP, máx. 5 MB) desde el detalle del
            reporte una vez registrado.
          </div>
        </aside>
      </div>
    </div>
  );
}
