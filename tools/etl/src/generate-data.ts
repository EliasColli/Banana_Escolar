import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { stringify } from 'csv-stringify/sync';
import {
  CATEGORIES,
  DESCRIPTIONS,
  FIRST_NAMES,
  LAST_NAMES,
  LOCATIONS,
  LOCATION_WEIGHTS,
  RESOLUTION_DAYS_BY_CATEGORY,
  SEED,
  SOLUTION_NOTES,
  SOLUTION_TEXTS,
} from './constants';
import {
  addDays,
  addHours,
  createRng,
  formatMysqlDate,
  pick,
  pickWeighted,
  randomInt,
  shuffle,
} from './rng';
import type { RawReportRow, RawUserRow } from './types';

const TARGET_VALID = 10_000;
const TARGET_DUPLICATES = 250;
const TARGET_MISSING = 120;
const TARGET_INVALID = 80;
const TOTAL_ROWS = TARGET_VALID + TARGET_DUPLICATES + TARGET_MISSING + TARGET_INVALID;

const rng = createRng(SEED);

function buildName(index: number): string {
  const first = FIRST_NAMES[index % FIRST_NAMES.length];
  const last = LAST_NAMES[(index * 3 + 7) % LAST_NAMES.length];
  return `${first} ${last}`;
}

function generateUsers(): RawUserRow[] {
  const rows: RawUserRow[] = [];

  for (let index = 0; index < 2; index += 1) {
    rows.push({
      id: String(index + 1),
      nombre: index === 0 ? 'Administrador Banana' : 'Administrador Académico',
      correo: index === 0 ? 'admin@banana.local' : `admin${index + 1}@banana.local`,
      rol: 'ADMIN',
      password: 'Admin123!',
      activo: '1',
    });
  }

  for (let index = 1; index <= 8; index += 1) {
    rows.push({
      id: String(100 + index),
      nombre: `Técnico ${buildName(index + 30)}`,
      correo: `tecnico${index}@banana.local`,
      rol: 'TECNICO',
      password: 'Tecnico123!',
      activo: '1',
    });
  }

  for (let index = 1; index <= 200; index += 1) {
    rows.push({
      id: String(200 + index),
      nombre: buildName(index),
      correo: `usuario${index}@banana.local`,
      rol: 'USUARIO',
      password: 'Usuario123!',
      activo: '1',
    });
  }

  return rows;
}

function emptySolution(): Pick<
  RawReportRow,
  'tecnico_correo' | 'solucion_descripcion' | 'solucion_observaciones' | 'resuelto_en' | 'asignado_en'
> {
  return {
    asignado_en: '',
    tecnico_correo: '',
    solucion_descripcion: '',
    solucion_observaciones: '',
    resuelto_en: '',
  };
}

function generateBaseReport(index: number, status: RawReportRow['estado']): RawReportRow {
  const folio = `REP-2026-${String(index + 1).padStart(5, '0')}`;
  const categoria = CATEGORIES[index % CATEGORIES.length];
  const descripcion = DESCRIPTIONS[categoria][index % DESCRIPTIONS[categoria].length];
  const ubicacion = pickWeighted(rng, LOCATIONS, LOCATION_WEIGHTS);
  const prioridadRoll = rng();
  const prioridad = prioridadRoll < 0.2 ? 'alta' : prioridadRoll < 0.75 ? 'media' : 'baja';
  const createdAt = addHours(new Date('2026-01-05T08:00:00.000Z'), randomInt(rng, 0, 7150));

  const base: RawReportRow = {
    row_id: '',
    folio,
    correo_usuario: `usuario${(index % 200) + 1}@banana.local`,
    categoria,
    descripcion,
    ubicacion,
    prioridad,
    estado: status,
    creado_en: formatMysqlDate(createdAt),
    ...emptySolution(),
  };

  if (status === 'pendiente') return base;

  const tecnicoIndex = (index % 8) + 1;
  const assignedAt = addHours(createdAt, randomInt(rng, 1, 48));
  base.asignado_en = formatMysqlDate(assignedAt);
  base.tecnico_correo = `tecnico${tecnicoIndex}@banana.local`;

  if (status === 'completado') {
    const baseDays = RESOLUTION_DAYS_BY_CATEGORY[categoria] ?? 5;
    const resolvedAt = addDays(assignedAt, baseDays + randomInt(rng, 0, 4));
    base.solucion_descripcion = pick(rng, SOLUTION_TEXTS);
    base.solucion_observaciones = pick(rng, SOLUTION_NOTES) ?? '';
    base.resuelto_en = formatMysqlDate(resolvedAt);
  }

  return base;
}

function generateBaseReports(): RawReportRow[] {
  const statuses = shuffle(rng, [
    ...Array<RawReportRow['estado']>(8099).fill('completado'),
    ...Array<RawReportRow['estado']>(1200).fill('en_proceso'),
    ...Array<RawReportRow['estado']>(701).fill('pendiente'),
  ]);

  return statuses.map((status, index) => generateBaseReport(index, status));
}

function generateDuplicates(base: RawReportRow[]): RawReportRow[] {
  const indexes = shuffle(
    rng,
    Array.from({ length: base.length }, (_value, index) => index),
  ).slice(0, TARGET_DUPLICATES);

  return indexes.map((index) => ({ ...base[index] }));
}

function generateMissingRows(): RawReportRow[] {
  const fields: Array<keyof RawReportRow> = ['descripcion', 'ubicacion', 'correo_usuario'];
  return Array.from({ length: TARGET_MISSING }, (_value, index) => {
    const row = generateBaseReport(0, 'pendiente');
    row.folio = `REP-2026-${String(90001 + index)}`;
    row[fields[index % fields.length]] = '';
    return row;
  });
}

function generateInvalidRows(): RawReportRow[] {
  const invalidDates = ['31/02/2026', 'no-disponible', '2026-13-45 10:00:00'];
  const rows: RawReportRow[] = [];

  for (let index = 0; index < TARGET_INVALID; index += 1) {
    const row = generateBaseReport(0, 'pendiente');
    row.folio = `REP-2026-${String(91001 + index)}`;

    if (index < 40) {
      row.creado_en = invalidDates[index % invalidDates.length];
    } else if (index < 60) {
      row.prioridad = 'muy alta';
    } else {
      row.estado = 'abierto';
    }

    rows.push(row);
  }

  return rows;
}

function writeCsv(path: string, rows: Array<Record<string, unknown>>, columns: string[]): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, stringify(rows, { header: true, columns }), 'utf8');
  console.log(`Escrito ${path} (${rows.length} filas)`);
}

function main(): void {
  const dataDir = resolve(process.cwd(), 'data');

  const users = generateUsers();
  const base = generateBaseReports();
  const duplicates = generateDuplicates(base);
  const missing = generateMissingRows();
  const invalid = generateInvalidRows();

  const all = shuffle(rng, [...base, ...duplicates, ...missing, ...invalid]);
  if (all.length !== TOTAL_ROWS) {
    throw new Error(`Filas generadas ${all.length}; esperadas ${TOTAL_ROWS}.`);
  }

  const reports = all.map((row, index) => ({ ...row, row_id: String(index + 1) }));

  writeCsv(resolve(dataDir, 'usuarios.csv'), users as unknown as Array<Record<string, unknown>>, [
    'id',
    'nombre',
    'correo',
    'rol',
    'password',
    'activo',
  ]);
  writeCsv(
    resolve(dataDir, 'reportes_crudos.csv'),
    reports as unknown as Array<Record<string, unknown>>,
    [
      'row_id',
      'folio',
      'correo_usuario',
      'categoria',
      'descripcion',
      'ubicacion',
      'prioridad',
      'estado',
      'creado_en',
      'asignado_en',
      'tecnico_correo',
      'solucion_descripcion',
      'solucion_observaciones',
      'resuelto_en',
    ],
  );

  console.log('--- Resumen de generación ---');
  console.log(`Semilla: ${SEED}`);
  console.log(`Usuarios: ${users.length} (200 solicitantes, 8 técnicos, 2 admin)`);
  console.log(`Reportes crudos: ${reports.length}`);
  console.log(`  Válidos esperados: ${TARGET_VALID}`);
  console.log(`  Duplicados: ${TARGET_DUPLICATES}`);
  console.log(`  Obligatorios faltantes: ${TARGET_MISSING}`);
  console.log(`  Tipos/fechas inválidos: ${TARGET_INVALID}`);
  console.log(`  Descartados esperados: ${TARGET_DUPLICATES + TARGET_MISSING + TARGET_INVALID}`);
  console.log('  Soluciones esperadas: 8099');
}

main();
