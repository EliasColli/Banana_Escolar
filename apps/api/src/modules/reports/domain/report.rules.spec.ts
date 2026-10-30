import {
  canAssign,
  canChangeStatus,
  canCreateReport,
  canResolve,
  canUploadAttachment,
  canViewReport,
  suggestPriority,
} from './report.rules';
import { Actor, ReportRecord } from './report.types';

const report = (overrides: Partial<ReportRecord> = {}): ReportRecord => ({
  id: 1,
  folio: 'REP-2026-00001',
  usuarioId: 10,
  categoriaId: 1,
  tecnicoId: 5,
  descripcion: 'Descripción de prueba suficientemente larga',
  ubicacion: 'Edificio A',
  prioridad: 'media',
  estado: 'pendiente',
  creadoEn: new Date('2026-10-01T10:00:00Z'),
  asignadoEn: null,
  ...overrides,
});

const actor = (rol: Actor['rol'], id = 1): Actor => ({ id, rol });

describe('report.rules', () => {
  describe('canViewReport', () => {
    it('permite al admin ver cualquier reporte', () => {
      expect(canViewReport(actor('ADMIN'), report()).ok).toBe(true);
    });

    it('permite al solicitante ver su propio reporte', () => {
      expect(canViewReport(actor('USUARIO', 10), report()).ok).toBe(true);
    });

    it('niega al solicitante ver reportes ajenos', () => {
      expect(canViewReport(actor('USUARIO', 11), report()).ok).toBe(false);
    });

    it('solo permite al técnico asignado', () => {
      expect(canViewReport(actor('TECNICO', 5), report()).ok).toBe(true);
      expect(canViewReport(actor('TECNICO', 6), report()).ok).toBe(false);
    });
  });

  describe('transiciones de estado', () => {
    it('permite pendiente → en_proceso al técnico asignado', () => {
      expect(canChangeStatus(actor('TECNICO', 5), report(), 'en_proceso').ok).toBe(true);
    });

    it('rechaza completar por PATCH de estado', () => {
      expect(canChangeStatus(actor('TECNICO', 5), report(), 'completado').ok).toBe(false);
    });

    it('rechaza en_proceso sin técnico', () => {
      const result = canChangeStatus(actor('ADMIN'), report({ tecnicoId: null }), 'en_proceso');
      expect(result.ok).toBe(false);
    });

    it('rechaza transiciones desde completado', () => {
      const result = canChangeStatus(actor('ADMIN'), report({ estado: 'completado' }), 'en_proceso');
      expect(result.ok).toBe(false);
    });
  });

  describe('resolución', () => {
    it('exige estado en_proceso', () => {
      expect(canResolve(actor('TECNICO', 5), report()).ok).toBe(false);
    });

    it('permite al técnico asignado resolver', () => {
      expect(canResolve(actor('TECNICO', 5), report({ estado: 'en_proceso' })).ok).toBe(true);
    });

    it('niega a un técnico no asignado', () => {
      expect(canResolve(actor('TECNICO', 6), report({ estado: 'en_proceso' })).ok).toBe(false);
    });
  });

  describe('permisos complementarios', () => {
    it('solo admin asigna técnicos', () => {
      expect(canAssign(actor('ADMIN')).ok).toBe(true);
      expect(canAssign(actor('TECNICO')).ok).toBe(false);
    });

    it('solo solicitante o admin adjunta imágenes', () => {
      expect(canUploadAttachment(actor('USUARIO', 10), report()).ok).toBe(true);
      expect(canUploadAttachment(actor('TECNICO', 5), report()).ok).toBe(false);
    });

    it('los técnicos no crean reportes', () => {
      expect(canCreateReport(actor('TECNICO')).ok).toBe(false);
      expect(canCreateReport(actor('USUARIO')).ok).toBe(true);
    });
  });

  describe('prioridad sugerida', () => {
    it('respeta la prioridad capturada', () => {
      expect(suggestPriority('Eléctrico', 'corto circuito', 'baja')).toBe('baja');
    });

    it('marca alta ante señales críticas', () => {
      expect(suggestPriority('Plomería', 'hay una fuga de agua', undefined)).toBe('alta');
    });

    it('usa media por defecto', () => {
      expect(suggestPriority('Pintura', 'pintura levantada', undefined)).toBe('media');
    });
  });
});
