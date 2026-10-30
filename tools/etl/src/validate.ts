import { CATEGORIES } from './constants';
import {
  DiscardReason,
  DiscardedRow,
  NormalizedReport,
  PRIORITY_ALIASES,
  RawReportRow,
  REQUIRED_FIELDS,
  STATUS_ALIASES,
  ValidationOutcome,
} from './types';

const CATEGORY_MAP = new Map(CATEGORIES.map((category) => [category.toLowerCase(), category]));
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const FOLIO_REGEX = /^REP-(\d{4})-(\d{5,7})$/;

export function normalizeWhitespace(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

/** Acepta `YYYY-MM-DD`, `YYYY-MM-DD HH:mm:ss` e ISO 8601. Devuelve UTC. */
export function parseDate(value: string): Date | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const match = /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2}):(\d{2}))?(?:\.\d+)?Z?$/.exec(
    trimmed,
  );
  if (!match) return null;

  const [, year, month, day, hour = '00', minute = '00', second = '00'] = match;
  const date = new Date(
    Date.UTC(
      Number(year),
      Number(month) - 1,
      Number(day),
      Number(hour),
      Number(minute),
      Number(second),
    ),
  );

  if (
    date.getUTCFullYear() !== Number(year) ||
    date.getUTCMonth() !== Number(month) - 1 ||
    date.getUTCDate() !== Number(day) ||
    date.getUTCHours() !== Number(hour) ||
    date.getUTCMinutes() !== Number(minute)
  ) {
    return null;
  }

  return date;
}

function discard(
  discarded: DiscardedRow[],
  raw: RawReportRow,
  reason: DiscardReason,
  detail: string,
): void {
  discarded.push({ rowId: raw.row_id, folio: raw.folio, reason, detail, raw });
}

export function validateAndTransform(
  rows: RawReportRow[],
  knownUsers: Set<string>,
  knownTechnicians: Set<string>,
): ValidationOutcome {
  const valid: NormalizedReport[] = [];
  const discarded: DiscardedRow[] = [];
  const seenFolios = new Set<string>();

  for (const raw of rows) {
    const missing = REQUIRED_FIELDS.filter((field) => String(raw[field] ?? '').trim() === '');
    if (missing.length > 0) {
      discard(discarded, raw, 'CAMPO_OBLIGATORIO_FALTANTE', missing.join(', '));
      continue;
    }

    const folio = raw.folio.trim().toUpperCase();
    if (!FOLIO_REGEX.test(folio)) {
      discard(discarded, raw, 'TIPO_INVALIDO', 'Formato de folio inválido');
      continue;
    }

    const descripcion = normalizeWhitespace(raw.descripcion);
    const ubicacion = normalizeWhitespace(raw.ubicacion);
    if (descripcion.length === 0 || descripcion.length > 2000) {
      discard(discarded, raw, 'TIPO_INVALIDO', 'Descripción fuera de rango');
      continue;
    }
    if (ubicacion.length === 0 || ubicacion.length > 190) {
      discard(discarded, raw, 'TIPO_INVALIDO', 'Ubicación fuera de rango');
      continue;
    }

    const categoria = CATEGORY_MAP.get(normalizeWhitespace(raw.categoria).toLowerCase());
    if (!categoria) {
      discard(discarded, raw, 'CATEGORIA_DESCONOCIDA', raw.categoria);
      continue;
    }

    const estado = STATUS_ALIASES[normalizeWhitespace(raw.estado).toLowerCase()];
    if (!estado) {
      discard(discarded, raw, 'TIPO_INVALIDO', `Estado inválido: ${raw.estado}`);
      continue;
    }

    const prioridad = PRIORITY_ALIASES[normalizeWhitespace(raw.prioridad).toLowerCase()];
    if (!prioridad) {
      discard(discarded, raw, 'TIPO_INVALIDO', `Prioridad inválida: ${raw.prioridad}`);
      continue;
    }

    const creadoEn = parseDate(raw.creado_en);
    if (!creadoEn) {
      discard(discarded, raw, 'FECHA_INVALIDA', `creado_en: ${raw.creado_en}`);
      continue;
    }

    const correoUsuario = normalizeWhitespace(raw.correo_usuario).toLowerCase();
    if (!EMAIL_REGEX.test(correoUsuario) || !knownUsers.has(correoUsuario)) {
      discard(discarded, raw, 'USUARIO_DESCONOCIDO', raw.correo_usuario);
      continue;
    }

    const tecnicoCorreo = normalizeWhitespace(raw.tecnico_correo).toLowerCase() || null;
    if (tecnicoCorreo && !knownTechnicians.has(tecnicoCorreo)) {
      discard(discarded, raw, 'TECNICO_INVALIDO', raw.tecnico_correo);
      continue;
    }
    if ((estado === 'en_proceso' || estado === 'completado') && !tecnicoCorreo) {
      discard(discarded, raw, 'TECNICO_INVALIDO', 'El estado requiere técnico');
      continue;
    }

    let asignadoEn: Date | null = null;
    if (raw.asignado_en.trim()) {
      asignadoEn = parseDate(raw.asignado_en);
      if (!asignadoEn) {
        discard(discarded, raw, 'FECHA_INVALIDA', `asignado_en: ${raw.asignado_en}`);
        continue;
      }
    }

    let resueltoEn: Date | null = null;
    if (raw.resuelto_en.trim()) {
      resueltoEn = parseDate(raw.resuelto_en);
      if (!resueltoEn) {
        discard(discarded, raw, 'FECHA_INVALIDA', `resuelto_en: ${raw.resuelto_en}`);
        continue;
      }
    }

    const solucionDescripcion = normalizeWhitespace(raw.solucion_descripcion) || null;
    if (estado === 'completado') {
      if (!solucionDescripcion || !resueltoEn) {
        discard(discarded, raw, 'SOLUCION_INCOMPLETA', 'Completado sin solución o fecha');
        continue;
      }
      if (resueltoEn.getTime() < creadoEn.getTime()) {
        discard(discarded, raw, 'FECHA_INVALIDA', 'resuelto_en anterior a creado_en');
        continue;
      }
    }

    if (seenFolios.has(folio)) {
      discard(discarded, raw, 'FOLIO_DUPLICADO', folio);
      continue;
    }
    seenFolios.add(folio);

    valid.push({
      rowId: raw.row_id,
      folio,
      correoUsuario,
      categoria,
      descripcion,
      ubicacion,
      prioridad,
      estado,
      creadoEn,
      asignadoEn: asignadoEn ?? (estado === 'pendiente' ? null : creadoEn),
      tecnicoCorreo,
      solucionDescripcion: estado === 'completado' ? solucionDescripcion : null,
      solucionObservaciones:
        estado === 'completado'
          ? normalizeWhitespace(raw.solucion_observaciones) || null
          : null,
      resueltoEn: estado === 'completado' ? resueltoEn : null,
    });
  }

  return { valid, discarded };
}
