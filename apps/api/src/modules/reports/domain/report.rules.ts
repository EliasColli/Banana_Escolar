import {
  Actor,
  Priority,
  ReportRecord,
  ReportStatus,
} from './report.types';

export interface RuleResult {
  ok: boolean;
  reason?: string;
}

const OK: RuleResult = { ok: true };

/** Solo pendiente → en_proceso. Completar exige solución atómica (POST /solution). */
export const ALLOWED_TRANSITIONS: Record<ReportStatus, ReportStatus[]> = {
  pendiente: ['en_proceso'],
  en_proceso: [],
  completado: [],
};

export function canViewReport(actor: Actor, report: ReportRecord): RuleResult {
  if (actor.rol === 'ADMIN') return OK;
  if (actor.rol === 'USUARIO' && report.usuarioId === actor.id) return OK;
  if (actor.rol === 'TECNICO' && report.tecnicoId === actor.id) return OK;
  return { ok: false, reason: 'No tienes acceso a este reporte.' };
}

export function canCreateReport(actor: Actor): RuleResult {
  return actor.rol === 'USUARIO' || actor.rol === 'ADMIN'
    ? OK
    : { ok: false, reason: 'Solo usuarios y administradores pueden crear reportes.' };
}

export function canAssign(actor: Actor): RuleResult {
  return actor.rol === 'ADMIN'
    ? OK
    : { ok: false, reason: 'Solo un administrador puede asignar técnicos.' };
}

export function canChangeStatus(actor: Actor, report: ReportRecord, target: ReportStatus): RuleResult {
  if (actor.rol !== 'ADMIN' && !(actor.rol === 'TECNICO' && report.tecnicoId === actor.id)) {
    return { ok: false, reason: 'Solo el técnico asignado o un administrador puede cambiar el estado.' };
  }
  if (!ALLOWED_TRANSITIONS[report.estado].includes(target)) {
    return {
      ok: false,
      reason: `Transición no permitida: ${report.estado} → ${target}. Para completar usa el registro de solución.`,
    };
  }
  if (target === 'en_proceso' && report.tecnicoId === null) {
    return { ok: false, reason: 'Un reporte en proceso requiere técnico asignado.' };
  }
  return OK;
}

export function canResolve(actor: Actor, report: ReportRecord): RuleResult {
  if (report.estado === 'completado') {
    return { ok: false, reason: 'El reporte ya está completado.' };
  }
  if (report.estado !== 'en_proceso') {
    return { ok: false, reason: 'Solo un reporte en proceso puede resolverse.' };
  }
  if (report.tecnicoId === null) {
    return { ok: false, reason: 'El reporte no tiene técnico asignado.' };
  }
  if (actor.rol !== 'ADMIN' && !(actor.rol === 'TECNICO' && report.tecnicoId === actor.id)) {
    return { ok: false, reason: 'Solo el técnico asignado o un administrador puede resolverlo.' };
  }
  return OK;
}

export function canUploadAttachment(actor: Actor, report: ReportRecord): RuleResult {
  if (actor.rol === 'ADMIN' || report.usuarioId === actor.id) return OK;
  return { ok: false, reason: 'Solo el solicitante o un administrador puede adjuntar imágenes.' };
}

/**
 * Prioridad sugerida. La matriz definitiva debe aprobarla el equipo;
 * esta versión solo aplica señales explícitas y mantiene el valor capturado.
 */
export function suggestPriority(
  categoria: string,
  descripcion: string,
  requested?: Priority,
): Priority {
  if (requested) return requested;
  const text = `${categoria} ${descripcion}`.toLowerCase();
  const critical = ['fuga', 'corto circuito', 'incendio', 'peligro', 'urgente', 'inundación'];
  if (critical.some((word) => text.includes(word))) return 'alta';
  return 'media';
}
