import type { Priority, ReportStatus, Role } from '@banana/api-client';
import clsx from 'clsx';
import type { ReactNode } from 'react';
import {
  PRIORITY_LABELS,
  PRIORITY_STYLES,
  ROLE_LABELS,
  STATUS_LABELS,
  STATUS_STYLES,
} from '@/shared/lib/labels';

export function StatusBadge({ status }: { status: ReportStatus }) {
  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset',
        STATUS_STYLES[status],
      )}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}

export function PriorityBadge({ priority }: { priority: Priority }) {
  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset',
        PRIORITY_STYLES[priority],
      )}
    >
      {PRIORITY_LABELS[priority]}
    </span>
  );
}

export function RoleBadge({ role }: { role: Role }) {
  const styles: Record<Role, string> = {
    ADMIN: 'bg-banana-100 text-banana-800 ring-banana-200',
    TECNICO: 'bg-sky-100 text-sky-800 ring-sky-200',
    USUARIO: 'bg-slate-100 text-slate-700 ring-slate-200',
  };
  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset',
        styles[role],
      )}
    >
      {ROLE_LABELS[role]}
    </span>
  );
}

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      className={clsx(
        'inline-block size-5 animate-spin rounded-full border-2 border-slate-300 border-t-banana-600',
        className,
      )}
      role="status"
      aria-label="Cargando"
    />
  );
}

export function LoadingState({ label = 'Cargando información…' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 py-16 text-sm text-slate-500">
      <Spinner />
      {label}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
      <div className="flex size-12 items-center justify-center rounded-2xl bg-banana-100 text-2xl">
        🍌
      </div>
      <h3 className="text-base font-semibold text-slate-800">{title}</h3>
      <p className="max-w-md text-sm text-slate-500">{description}</p>
      {action}
    </div>
  );
}

export function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-red-200 bg-red-50 px-6 py-12 text-center">
      <div className="text-2xl">⚠️</div>
      <h3 className="text-base font-semibold text-red-800">No se pudo cargar la información</h3>
      <p className="max-w-lg text-sm text-red-700">{message}</p>
      {onRetry && (
        <button type="button" className="btn-secondary" onClick={onRetry}>
          Reintentar
        </button>
      )}
    </div>
  );
}

export function PageHeader({
  title,
  description,
  actions,
  eyebrow,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  eyebrow?: string;
}) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow && (
          <p className="mb-1 text-xs font-semibold tracking-widest text-banana-700 uppercase">
            {eyebrow}
          </p>
        )}
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">{title}</h1>
        {description && <p className="mt-1 max-w-2xl text-sm text-slate-500">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Pagination({
  page,
  totalPages,
  total,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  total: number;
  onPageChange: (page: number) => void;
}) {
  const canPrev = page > 1;
  const canNext = page < totalPages;
  return (
    <div className="flex flex-col items-center justify-between gap-3 border-t border-slate-200 px-4 py-3 sm:flex-row">
      <p className="text-xs text-slate-500">
        Página <span className="font-semibold text-slate-700">{page}</span> de{' '}
        <span className="font-semibold text-slate-700">{Math.max(totalPages, 1)}</span> · {total}{' '}
        registros
      </p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          className="btn-secondary px-3 py-1.5 text-xs"
          disabled={!canPrev}
          onClick={() => onPageChange(page - 1)}
        >
          Anterior
        </button>
        <button
          type="button"
          className="btn-secondary px-3 py-1.5 text-xs"
          disabled={!canNext}
          onClick={() => onPageChange(page + 1)}
        >
          Siguiente
        </button>
      </div>
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
  tone = 'default',
}: {
  label: string;
  value: string | number;
  hint?: string;
  tone?: 'default' | 'warning' | 'info' | 'success';
}) {
  const tones = {
    default: 'bg-white',
    warning: 'bg-amber-50',
    info: 'bg-sky-50',
    success: 'bg-emerald-50',
  };
  return (
    <div className={clsx('card p-5', tones[tone])}>
      <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">{label}</p>
      <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900">{value}</p>
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}
