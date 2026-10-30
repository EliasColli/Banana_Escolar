export type ReportStatus = 'pendiente' | 'en_proceso' | 'completado';
export type Priority = 'baja' | 'media' | 'alta';
export type ActorRole = 'ADMIN' | 'TECNICO' | 'USUARIO';

export interface Actor {
  id: number;
  rol: ActorRole;
}

export interface ReportFilters {
  categoryId?: number;
  status?: ReportStatus;
  priority?: Priority;
  from?: Date;
  to?: Date;
  search?: string;
  assignment?: 'me' | 'unassigned' | 'all';
}

export interface ReportListQuery {
  actor: Actor;
  page: number;
  limit: number;
  filters: ReportFilters;
}

export interface SolutionRecord {
  id: number;
  reporteId: number;
  tecnicoId: number;
  descripcion: string;
  observaciones: string | null;
  resueltoEn: Date;
  tecnico?: { id: number; nombre: string };
}

export interface AttachmentRecord {
  id: number;
  reporteId: number;
  storageKey: string;
  mimeType: string;
  sizeBytes: number;
  uploadedBy: number;
  createdAt: Date;
}

export interface ReportRecord {
  id: number;
  folio: string;
  usuarioId: number;
  categoriaId: number;
  tecnicoId: number | null;
  descripcion: string;
  ubicacion: string;
  prioridad: Priority;
  estado: ReportStatus;
  creadoEn: Date;
  asignadoEn: Date | null;
  categoria?: { id: number; nombre: string };
  usuario?: { id: number; nombre: string; correo: string };
  tecnico?: { id: number; nombre: string } | null;
  solucion?: SolutionRecord | null;
  adjuntos?: AttachmentRecord[];
}

export interface CreateReportData {
  usuarioId: number;
  categoriaId: number;
  descripcion: string;
  ubicacion: string;
  prioridad: Priority;
}

export interface ResolveReportData {
  actor: Actor;
  descripcion: string;
  observaciones?: string;
}

export interface ReportPage {
  data: ReportRecord[];
  total: number;
}

export interface ReportRepository {
  create(data: CreateReportData): Promise<ReportRecord>;
  findById(id: number): Promise<ReportRecord | null>;
  list(query: ReportListQuery): Promise<ReportPage>;
  assign(id: number, tecnicoId: number): Promise<ReportRecord>;
  changeStatus(id: number, status: ReportStatus): Promise<ReportRecord>;
  resolve(id: number, data: ResolveReportData): Promise<ReportRecord>;
  findLeastLoadedTechnician(): Promise<number | null>;
  findActiveTechnician(id: number): Promise<{ id: number; nombre: string } | null>;
}
