import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { useLocation, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { useAuth } from '../auth-context';
import { Field } from '@/shared/components/form-field';
import { Spinner } from '@/shared/components/ui';
import { ROLE_LABELS } from '@/shared/lib/labels';

const schema = z.object({
  correo: z.email('Escribe un correo válido.'),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres.'),
});

type LoginValues = z.infer<typeof schema>;

const DEMO_ACCOUNTS = [
  { label: 'Admin', correo: 'admin@banana.local', password: 'Admin123!' },
  { label: 'Técnico', correo: 'tecnico1@banana.local', password: 'Tecnico123!' },
  { label: 'Solicitante', correo: 'usuario1@banana.local', password: 'Usuario123!' },
];

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const form = useForm<LoginValues>({
    resolver: zodResolver(schema),
    defaultValues: { correo: '', password: '' },
  });

  const mutation = useMutation({
    mutationFn: (values: LoginValues) => login(values.correo, values.password),
    onSuccess: (user) => {
      const from = (location.state as { from?: string } | null)?.from;
      const fallback =
        user.rol === 'ADMIN' ? '/dashboard' : user.rol === 'TECNICO' ? '/inbox' : '/reports';
      navigate(from ?? fallback, { replace: true });
    },
  });

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
      <section className="relative hidden overflow-hidden bg-ink-900 p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div
          aria-hidden
          className="absolute -top-24 -right-20 size-96 rounded-full bg-banana-400/20 blur-3xl"
        />
        <div
          aria-hidden
          className="absolute bottom-0 left-0 size-80 rounded-full bg-leaf-500/20 blur-3xl"
        />
        <div className="relative">
          <div className="mb-16 flex items-center gap-3">
            <span className="flex size-11 items-center justify-center rounded-2xl bg-banana-400 text-2xl">
              🍌
            </span>
            <div>
              <p className="text-lg font-bold tracking-tight">Banana Escolar</p>
              <p className="text-xs text-slate-400">Gestión de incidencias</p>
            </div>
          </div>
          <h1 className="max-w-lg text-4xl leading-tight font-bold tracking-tight">
            Un solo lugar para reportar, atender y analizar las fallas del plantel.
          </h1>
          <p className="mt-5 max-w-md text-sm leading-relaxed text-slate-300">
            Solicitantes registran incidencias, técnicos las resuelven y la dirección consulta
            indicadores reales calculados desde MySQL.
          </p>
          <ul className="mt-10 space-y-4 text-sm text-slate-200">
            <li className="flex items-start gap-3">
              <span className="mt-0.5 text-banana-300">◆</span>
              Folios únicos, asignación automática y trazabilidad de estados.
            </li>
            <li className="flex items-start gap-3">
              <span className="mt-0.5 text-banana-300">◆</span>
              Búsqueda y filtros combinados con paginación en servidor.
            </li>
            <li className="flex items-start gap-3">
              <span className="mt-0.5 text-banana-300">◆</span>
              Dashboard con reportes semanales, tiempos de resolución y ubicaciones.
            </li>
          </ul>
        </div>
        <p className="relative text-xs text-slate-500">
          Datos de demostración ficticios · MySQL 8+ / NestJS / React
        </p>
      </section>

      <section className="flex items-center justify-center px-5 py-10 sm:px-10">
        <div className="w-full max-w-md">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <span className="flex size-10 items-center justify-center rounded-xl bg-banana-200 text-xl">
              🍌
            </span>
            <p className="text-lg font-bold text-slate-900">Banana Escolar</p>
          </div>

          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Inicia sesión</h2>
          <p className="mt-1 text-sm text-slate-500">
            Usa tu cuenta institucional para continuar.
          </p>

          <form
            className="mt-8 space-y-5"
            onSubmit={form.handleSubmit((values) => mutation.mutate(values))}
            noValidate
          >
            <Field label="Correo" htmlFor="correo" error={form.formState.errors.correo?.message}>
              <input
                id="correo"
                type="email"
                autoComplete="email"
                className="input"
                placeholder="usuario@banana.local"
                {...form.register('correo')}
              />
            </Field>

            <Field
              label="Contraseña"
              htmlFor="password"
              error={form.formState.errors.password?.message}
            >
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                className="input"
                placeholder="••••••••"
                {...form.register('password')}
              />
            </Field>

            {mutation.isError && (
              <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
                {mutation.error.message}
              </p>
            )}

            <button type="submit" className="btn-primary w-full" disabled={mutation.isPending}>
              {mutation.isPending ? <Spinner className="size-4 border-white/40 border-t-white" /> : null}
              Entrar al sistema
            </button>
          </form>

          <div className="mt-8 rounded-2xl border border-dashed border-slate-300 bg-white p-4">
            <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
              Cuentas de demostración
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {DEMO_ACCOUNTS.map((account) => (
                <button
                  key={account.correo}
                  type="button"
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:border-banana-300 hover:bg-banana-50"
                  onClick={() =>
                    form.reset({ correo: account.correo, password: account.password })
                  }
                >
                  {account.label}
                </button>
              ))}
            </div>
            <p className="mt-3 text-xs text-slate-400">
              {ROLE_LABELS.ADMIN}: admin@banana.local / Admin123! · Los datos son ficticios.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
