import type { Priority, ReportStatus, Role } from '@banana/api-client';

export const ROLE_LABELS: Record<Role, string> = {
  ADMIN: 'Administrador',
  TECNICO: 'Técnico',
  USUARIO: 'Solicitante',
};

export const STATUS_LABELS: Record<ReportStatus, string> = {
  pendiente: 'Pendiente',
  en_proceso: 'En proceso',
  completado: 'Completado',
};

export const STATUS_STYLES: Record<ReportStatus, string> = {
  pendiente: 'bg-amber-100 text-amber-800 ring-amber-200',
  en_proceso: 'bg-sky-100 text-sky-800 ring-sky-200',
  completado: 'bg-emerald-100 text-emerald-800 ring-emerald-200',
};

export const PRIORITY_LABELS: Record<Priority, string> = {
  baja: 'Baja',
  media: 'Media',
  alta: 'Alta',
};

export const PRIORITY_STYLES: Record<Priority, string> = {
  baja: 'bg-slate-100 text-slate-600 ring-slate-200',
  media: 'bg-orange-100 text-orange-700 ring-orange-200',
  alta: 'bg-red-100 text-red-700 ring-red-200',
};

const dateFormatter = new Intl.DateTimeFormat('es-MX', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
});

const dateTimeFormatter = new Intl.DateTimeFormat('es-MX', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

export function formatDate(value: string | null | undefined, withTime = false): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return (withTime ? dateTimeFormatter : dateFormatter).format(date);
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat('es-MX').format(value);
}

export function formatDays(value: number | null): string {
  if (value === null || Number.isNaN(value)) return '—';
  return `${value.toFixed(1)} días`;
}

export function formatWeek(value: string): string {
  const date = new Date(`${value}T00:00:00Z`);
  return new Intl.DateTimeFormat('es-MX', {
    day: '2-digit',
    month: 'short',
    timeZone: 'UTC',
  }).format(date);
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
