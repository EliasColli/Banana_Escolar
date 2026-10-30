export const ROLES = ['ADMIN', 'TECNICO', 'USUARIO'] as const;
export type Role = (typeof ROLES)[number];

export const REPORT_STATUSES = ['pendiente', 'en_proceso', 'completado'] as const;
export type ReportStatus = (typeof REPORT_STATUSES)[number];

export const PRIORITIES = ['baja', 'media', 'alta'] as const;
export type Priority = (typeof PRIORITIES)[number];

export interface User {
  id: number;
  nombre: string;
  correo: string;
  rol: Role;
  activo: boolean;
  creadoEn: string;
  reportesAbiertos?: number;
}

export interface Category {
  id: number;
  nombre: string;
}

export interface Attachment {
  id: number;
  reporteId: number;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
  url: string;
}

export interface Solution {
  id: number;
  reporteId: number;
  tecnicoId: number;
  descripcion: string;
  observaciones: string | null;
  resueltoEn: string;
  tecnico?: Pick<User, 'id' | 'nombre'>;
}

export interface Report {
  id: number;
  folio: string;
  usuarioId: number;
  categoriaId: number;
  tecnicoId: number | null;
  descripcion: string;
  ubicacion: string;
  prioridad: Priority;
  estado: ReportStatus;
  creadoEn: string;
  asignadoEn: string | null;
  categoria?: Category;
  usuario?: Pick<User, 'id' | 'nombre' | 'correo'>;
  tecnico?: Pick<User, 'id' | 'nombre'> | null;
  solucion?: Solution | null;
  adjuntos?: Attachment[];
}

export interface Paginated<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

export interface CreateReportInput {
  categoriaId: number;
  descripcion: string;
  ubicacion: string;
  prioridad?: Priority;
}

export interface ListReportsParams {
  page?: number;
  limit?: number;
  categoryId?: number;
  status?: ReportStatus;
  priority?: Priority;
  from?: string;
  to?: string;
  search?: string;
  assignment?: 'me' | 'unassigned' | 'all';
}

export interface AnalyticsSummary {
  total: number;
  pendiente: number;
  enProceso: number;
  completado: number;
  semanaActual: number;
  semanaAnterior: number;
  variacionPct: number | null;
  tiempoPromedioDias: number | null;
}

export interface WeeklyReportPoint {
  weekStart: string;
  count: number;
}

export interface ResolutionByCategory {
  categoryId: number;
  categoria: string;
  avgDays: number | null;
  completedCount: number;
}

export interface TopLocation {
  ubicacion: string;
  count: number;
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export interface ApiClientOptions {
  baseUrl: string;
  getAccessToken?: () => string | null | Promise<string | null>;
  onUnauthorized?: () => void | Promise<void>;
  fetchImpl?: typeof fetch;
}

export class BananaApi {
  private readonly fetchImpl: typeof fetch;

  constructor(private readonly options: ApiClientOptions) {
    this.fetchImpl = options.fetchImpl ?? fetch.bind(globalThis);
  }

  private async headers(extra?: HeadersInit): Promise<HeadersInit> {
    const token = await this.options.getAccessToken?.();
    return {
      Accept: 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...extra,
    };
  }

  /** Descarga binaria autenticada (adjuntos). */
  async blob(path: string): Promise<Blob> {
    const response = await this.fetchImpl(`${this.options.baseUrl}${path}`, {
      credentials: 'include',
      headers: await this.headers({ Accept: 'image/*' }),
    });
    if (!response.ok) {
      if (response.status === 401) await this.options.onUnauthorized?.();
      throw new ApiError(response.status, 'No fue posible descargar el archivo.');
    }
    return response.blob();
  }

  async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    return this.perform<T>(path, init, false);
  }

  private async perform<T>(path: string, init: RequestInit, isRetry: boolean): Promise<T> {
    const response = await this.fetchImpl(`${this.options.baseUrl}${path}`, {
      ...init,
      credentials: 'include',
      headers: await this.headers(init.headers),
    });

    if (response.status === 401 && !isRetry && this.options.onUnauthorized) {
      await this.options.onUnauthorized();
      return this.perform<T>(path, init, true);
    }

    if (!response.ok) {
      let message = `Error HTTP ${response.status}`;
      let details: unknown;
      try {
        const body = (await response.json()) as { message?: string | string[]; error?: string };
        message = Array.isArray(body.message)
          ? body.message.join(', ')
          : (body.message ?? body.error ?? message);
        details = body;
      } catch {
        // respuesta sin cuerpo JSON
      }
      throw new ApiError(response.status, message, details);
    }

    if (response.status === 204) return undefined as T;
    return (await response.json()) as T;
  }

  login(correo: string, password: string) {
    return this.request<LoginResponse>('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ correo, password }),
    });
  }

  refresh(refreshToken?: string) {
    return this.request<LoginResponse>('/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(refreshToken ? { refreshToken } : {}),
    });
  }

  logout() {
    return this.request<void>('/auth/logout', { method: 'POST' });
  }

  me() {
    return this.request<User>('/auth/me');
  }

  categories() {
    return this.request<Category[]>('/categories');
  }

  reports(params: ListReportsParams = {}) {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') query.set(key, String(value));
    });
    const suffix = query.toString() ? `?${query.toString()}` : '';
    return this.request<Paginated<Report>>(`/reports${suffix}`);
  }

  report(id: number) {
    return this.request<Report>(`/reports/${id}`);
  }

  createReport(input: CreateReportInput) {
    return this.request<Report>('/reports', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
  }

  assignReport(id: number, tecnicoId?: number) {
    return this.request<Report>(`/reports/${id}/assignment`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(tecnicoId ? { tecnicoId } : {}),
    });
  }

  changeStatus(id: number, estado: ReportStatus) {
    return this.request<Report>(`/reports/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ estado }),
    });
  }

  resolveReport(id: number, input: { descripcion: string; observaciones?: string }) {
    return this.request<Report>(`/reports/${id}/solution`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
  }

  technicians() {
    return this.request<User[]>('/users/technicians');
  }

  users() {
    return this.request<User[]>('/users');
  }

  setUserActive(id: number, activo: boolean) {
    return this.request<User>(`/users/${id}/active`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ activo }),
    });
  }

  uploadAttachment(id: number, file: File) {
    const body = new FormData();
    body.append('file', file);
    return this.request<Attachment>(`/reports/${id}/attachments`, { method: 'POST', body });
  }

  downloadAttachment(reportId: number, attachmentId: number) {
    return this.blob(`/reports/${reportId}/attachments/${attachmentId}`);
  }

  summary() {
    return this.request<AnalyticsSummary>('/analytics/summary');
  }

  weeklyReports() {
    return this.request<WeeklyReportPoint[]>('/analytics/weekly-reports');
  }

  resolutionByCategory() {
    return this.request<ResolutionByCategory[]>('/analytics/resolution-by-category');
  }

  topLocations(limit = 10) {
    return this.request<TopLocation[]>(`/analytics/top-locations?limit=${limit}`);
  }
}
