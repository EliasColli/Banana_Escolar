import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parse } from 'csv-parse/sync';
import type { RawReportRow, RawUserRow } from './types';

export interface ExtractedData {
  users: RawUserRow[];
  reports: RawReportRow[];
  reportsChecksum: string;
  reportsPath: string;
}

export function checksumFile(path: string): string {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

export function extract(): ExtractedData {
  const usersPath = resolve(process.cwd(), 'data', 'usuarios.csv');
  const reportsPath = resolve(process.cwd(), 'data', 'reportes_crudos.csv');

  const users = parse(readFileSync(usersPath, 'utf8'), {
    columns: true,
    bom: true,
    skip_empty_lines: true,
    trim: false,
  }) as RawUserRow[];

  const reports = parse(readFileSync(reportsPath, 'utf8'), {
    columns: true,
    bom: true,
    skip_empty_lines: true,
    trim: false,
  }) as RawReportRow[];

  return { users, reports, reportsChecksum: checksumFile(reportsPath), reportsPath };
}
