import { parseDate, validateAndTransform } from './validate';
import type { RawReportRow } from './types';

const baseRow = (overrides: Partial<RawReportRow> = {}): RawReportRow => ({
  row_id: '1',
  folio: 'REP-2026-00001',
  correo_usuario: 'usuario1@banana.local',
  categoria: 'Eléctrico',
  descripcion: 'Un contacto del aula genera chispas al conectar equipos.',
  ubicacion: 'Edificio A - planta baja',
  prioridad: 'alta',
  estado: 'pendiente',
  creado_en: '2026-03-01 10:00:00',
  asignado_en: '',
  tecnico_correo: '',
  solucion_descripcion: '',
  solucion_observaciones: '',
  resuelto_en: '',
  ...overrides,
});

const users = new Set(['usuario1@banana.local']);
const technicians = new Set(['tecnico1@banana.local']);

describe('parseDate', () => {
  it('acepta formato MySQL', () => {
    expect(parseDate('2026-03-01 10:00:00')?.toISOString()).toBe('2026-03-01T10:00:00.000Z');
  });

  it('acepta ISO', () => {
    expect(parseDate('2026-03-01T10:00:00Z')?.toISOString()).toBe('2026-03-01T10:00:00.000Z');
  });

  it('rechaza fechas imposibles', () => {
    expect(parseDate('31/02/2026')).toBeNull();
    expect(parseDate('2026-02-31 10:00:00')).toBeNull();
  });
});

describe('validateAndTransform', () => {
  it('acepta un reporte válido', () => {
    const { valid, discarded } = validateAndTransform([baseRow()], users, technicians);
    expect(discarded).toHaveLength(0);
    expect(valid).toHaveLength(1);
    expect(valid[0].prioridad).toBe('alta');
  });

  it('descarta campos obligatorios faltantes', () => {
    const { valid, discarded } = validateAndTransform(
      [baseRow({ descripcion: '   ' })],
      users,
      technicians,
    );
    expect(valid).toHaveLength(0);
    expect(discarded[0].reason).toBe('CAMPO_OBLIGATORIO_FALTANTE');
  });

  it('descarta folios duplicados', () => {
    const { valid, discarded } = validateAndTransform(
      [baseRow(), baseRow({ row_id: '2' })],
      users,
      technicians,
    );
    expect(valid).toHaveLength(1);
    expect(discarded).toHaveLength(1);
    expect(discarded[0].reason).toBe('FOLIO_DUPLICADO');
  });

  it('descarta fechas inválidas', () => {
    const { discarded } = validateAndTransform(
      [baseRow({ creado_en: '2026-13-45 10:00:00' })],
      users,
      technicians,
    );
    expect(discarded[0].reason).toBe('FECHA_INVALIDA');
  });

  it('descarta completados sin solución', () => {
    const { discarded } = validateAndTransform(
      [
        baseRow({
          estado: 'completado',
          tecnico_correo: 'tecnico1@banana.local',
          resuelto_en: '2026-03-02 10:00:00',
        }),
      ],
      users,
      technicians,
    );
    expect(discarded[0].reason).toBe('SOLUCION_INCOMPLETA');
  });

  it('acepta completado con técnico y solución', () => {
    const { valid, discarded } = validateAndTransform(
      [
        baseRow({
          estado: 'completado',
          tecnico_correo: 'tecnico1@banana.local',
          asignado_en: '2026-03-01 12:00:00',
          solucion_descripcion: 'Se reparó el contacto y se verificó.',
          resuelto_en: '2026-03-02 10:00:00',
        }),
      ],
      users,
      technicians,
    );
    expect(discarded).toHaveLength(0);
    expect(valid[0].resueltoEn?.toISOString()).toBe('2026-03-02T10:00:00.000Z');
  });
});
