import { describe, expect, it } from 'vitest';
import {
  formatDays,
  formatNumber,
  formatWeek,
  PRIORITY_LABELS,
  STATUS_LABELS,
} from './labels';

describe('etiquetas de dominio', () => {
  it('traduce estados y prioridades', () => {
    expect(STATUS_LABELS.pendiente).toBe('Pendiente');
    expect(STATUS_LABELS.en_proceso).toBe('En proceso');
    expect(PRIORITY_LABELS.alta).toBe('Alta');
  });

  it('formatea números y días', () => {
    expect(formatNumber(10000)).toContain('10');
    expect(formatDays(7.47)).toBe('7.5 días');
    expect(formatDays(null)).toBe('—');
  });

  it('etiqueta el inicio de semana', () => {
    expect(formatWeek('2026-10-26')).toMatch(/26/);
  });
});
