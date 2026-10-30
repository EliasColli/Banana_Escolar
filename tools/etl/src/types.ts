export interface RawUserRow {
  id: string;
  nombre: string;
  correo: string;
  rol: string;
  password: string;
  activo: string;
}

export interface RawReportRow {
  row_id: string;
  folio: string;
  correo_usuario: string;
  categoria: string;
  descripcion: string;
  ubicacion: string;
  prioridad: string;
  estado: string;
  creado_en: string;
  asignado_en: string;
  tecnico_correo: string;
  solucion_descripcion: string;
  solucion_observaciones: string;
  resuelto_en: string;
}

export type DiscardReason =
  | 'CAMPO_OBLIGATORIO_FALTANTE'
  | 'FECHA_INVALIDA'
  | 'TIPO_INVALIDO'
  | 'FOLIO_DUPLICADO'
  | 'CATEGORIA_DESCONOCIDA'
  | 'USUARIO_DESCONOCIDO'
  | 'TECNICO_INVALIDO'
  | 'SOLUCION_INCOMPLETA';

export interface DiscardedRow {
  rowId: string;
  folio: string;
  reason: DiscardReason;
  detail: string;
  raw: RawReportRow;
}

export interface NormalizedReport {
  rowId: string;
  folio: string;
  correoUsuario: string;
  categoria: string;
  descripcion: string;
  ubicacion: string;
  prioridad: 'baja' | 'media' | 'alta';
  estado: 'pendiente' | 'en_proceso' | 'completado';
  creadoEn: Date;
  asignadoEn: Date | null;
  tecnicoCorreo: string | null;
  solucionDescripcion: string | null;
  solucionObservaciones: string | null;
  resueltoEn: Date | null;
}

export interface ValidationOutcome {
  valid: NormalizedReport[];
  discarded: DiscardedRow[];
}

export const REQUIRED_FIELDS: Array<keyof RawReportRow> = [
  'folio',
  'correo_usuario',
  'categoria',
  'descripcion',
  'ubicacion',
  'prioridad',
  'estado',
  'creado_en',
];

export const STATUS_ALIASES: Record<string, NormalizedReport['estado']> = {
  pendiente: 'pendiente',
  'en proceso': 'en_proceso',
  en_proceso: 'en_proceso',
  'en-proceso': 'en_proceso',
  completado: 'completado',
  completada: 'completado',
  resuelto: 'completado',
  resuelta: 'completado',
};

export const PRIORITY_ALIASES: Record<string, NormalizedReport['prioridad']> = {
  baja: 'baja',
  media: 'media',
  alta: 'alta',
  low: 'baja',
  medium: 'media',
  high: 'alta',
};
