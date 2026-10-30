import 'dotenv/config';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { stringify } from 'csv-stringify/sync';
import mysql from 'mysql2/promise';
import { extract } from './extract';
import { load } from './load';
import { validateAndTransform } from './validate';
import { verifyDatabase } from './verify';

const EXPECTED = {
  sourceRows: 10_450,
  valid: 10_000,
  discarded: 450,
  duplicates: 250,
  missing: 120,
  invalid: 80,
  solutions: 8_099,
};

function countByReason(discarded: Array<{ reason: string }>): Record<string, number> {
  return discarded.reduce<Record<string, number>>((accumulator, row) => {
    accumulator[row.reason] = (accumulator[row.reason] ?? 0) + 1;
    return accumulator;
  }, {});
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const reset = args.includes('--reset') || process.env.ETL_RESET === 'true';
  const startedAt = new Date();
  const timings: Record<string, number> = {};
  let cursor = Date.now();

  console.log('ETL Banana Escolar');
  console.log(`Semilla fija: 2026 | reset=${reset}`);

  const extracted = extract();
  timings.extractMs = Date.now() - cursor;
  cursor = Date.now();
  console.log(`Extraídos ${extracted.reports.length} reportes y ${extracted.users.length} usuarios.`);
  console.log(`Checksum reportes: ${extracted.reportsChecksum}`);

  const knownUsers = new Set(extracted.users.map((user) => user.correo.toLowerCase()));
  const knownTechnicians = new Set(
    extracted.users.filter((user) => user.rol === 'TECNICO').map((user) => user.correo.toLowerCase()),
  );

  const { valid, discarded } = validateAndTransform(
    extracted.reports,
    knownUsers,
    knownTechnicians,
  );
  timings.validateMs = Date.now() - cursor;
  cursor = Date.now();

  const reasons = countByReason(discarded);
  console.log(
    `Validación: ${valid.length} válidos, ${discarded.length} descartados (${JSON.stringify(reasons)}).`,
  );

  const errors: string[] = [];
  if (extracted.reports.length !== EXPECTED.sourceRows) {
    errors.push(`Filas crudas ${extracted.reports.length} ≠ ${EXPECTED.sourceRows}`);
  }
  if (valid.length !== EXPECTED.valid) {
    errors.push(`Válidos ${valid.length} ≠ ${EXPECTED.valid}`);
  }
  if (discarded.length !== EXPECTED.discarded) {
    errors.push(`Descartados ${discarded.length} ≠ ${EXPECTED.discarded}`);
  }
  if ((reasons.FOLIO_DUPLICADO ?? 0) !== EXPECTED.duplicates) {
    errors.push(`Duplicados ${reasons.FOLIO_DUPLICADO ?? 0} ≠ ${EXPECTED.duplicates}`);
  }
  if ((reasons.CAMPO_OBLIGATORIO_FALTANTE ?? 0) !== EXPECTED.missing) {
    errors.push(
      `Faltantes ${reasons.CAMPO_OBLIGATORIO_FALTANTE ?? 0} ≠ ${EXPECTED.missing}`,
    );
  }
  const invalidCount =
    (reasons.TIPO_INVALIDO ?? 0) + (reasons.FECHA_INVALIDA ?? 0);
  if (invalidCount !== EXPECTED.invalid) {
    errors.push(`Inválidos ${invalidCount} ≠ ${EXPECTED.invalid}`);
  }
  if (errors.length > 0) {
    console.error('Errores de conteo antes de cargar:');
    errors.forEach((error) => console.error(`  - ${error}`));
    throw new Error('El ETL no cumple los conteos documentados.');
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error('Falta DATABASE_URL en el entorno.');
  const connection = await mysql.createConnection(databaseUrl);

  try {
    const loadResult = await load(connection, valid, extracted.users, { reset });
    timings.loadMs = Date.now() - cursor;
    cursor = Date.now();

    const verification = await verifyDatabase(connection);
    timings.verifyMs = Date.now() - cursor;

    if (verification.totalReportes !== EXPECTED.valid) {
      errors.push(
        `BD reportes ${verification.totalReportes} ≠ ${EXPECTED.valid} (¿datos previos? usa --reset en pruebas)`,
      );
    }
    if (verification.totalSoluciones !== EXPECTED.solutions) {
      errors.push(
        `BD soluciones ${verification.totalSoluciones} ≠ ${EXPECTED.solutions} (¿datos previos? usa --reset en pruebas)`,
      );
    }

    const finishedAt = new Date();
    const runId = randomUUID();
    timings.totalMs = finishedAt.getTime() - startedAt.getTime();
    const report = {
      runId,
      seed: 2026,
      startedAt: startedAt.toISOString(),
      finishedAt: finishedAt.toISOString(),
      source: {
        reportsFile: extracted.reportsPath,
        rows: extracted.reports.length,
        users: extracted.users.length,
        checksum: extracted.reportsChecksum,
      },
      counts: {
        sourceRows: extracted.reports.length,
        valid: valid.length,
        discarded: discarded.length,
        discardedByReason: reasons,
        solutions: verification.totalSoluciones,
      },
      timings,
      load: loadResult,
      verification,
      strict: errors.length === 0,
      errors,
      environment: {
        node: process.version,
        platform: process.platform,
        mysql: verification.mysqlVersion,
      },
    };

    const outputDir = resolve(process.cwd(), 'output');
    mkdirSync(outputDir, { recursive: true });

    const discardedRows = discarded.map((row) => ({
      row_id: row.rowId,
      folio: row.folio,
      motivo: row.reason,
      detalle: row.detail,
      correo_usuario: row.raw.correo_usuario,
      categoria: row.raw.categoria,
      estado: row.raw.estado,
      creado_en: row.raw.creado_en,
      tecnico_correo: row.raw.tecnico_correo,
    }));
    writeFileSync(
      resolve(outputDir, 'descartados.csv'),
      stringify(discardedRows, {
        header: true,
        columns: [
          'row_id',
          'folio',
          'motivo',
          'detalle',
          'correo_usuario',
          'categoria',
          'estado',
          'creado_en',
          'tecnico_correo',
        ],
      }),
      'utf8',
    );
    writeFileSync(
      resolve(outputDir, 'reporte_etl.json'),
      JSON.stringify(report, null, 2),
      'utf8',
    );

    await connection.query(
      `INSERT INTO etl_runs
         (run_id, started_at, finished_at, source_rows, inserted_rows, discarded_rows, checksum, report_json)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        runId,
        startedAt,
        finishedAt,
        extracted.reports.length,
        valid.length,
        discarded.length,
        extracted.reportsChecksum,
        JSON.stringify(report),
      ],
    );

    timings.totalMs = Date.now() - startedAt.getTime();

    console.log('--- Resultado ETL ---');
    console.log(`Reportes en BD: ${verification.totalReportes}`);
    console.log(`Soluciones en BD: ${verification.totalSoluciones}`);
    console.log(
      `Usuarios: ${verification.totalUsuarios.map((row) => `${row.rol}=${row.count}`).join(', ')}`,
    );
    console.log(`Descartados: ${discarded.length} → output/descartados.csv`);
    console.log(`Reporte: output/reporte_etl.json`);
    console.log(`Tiempo total: ${timings.totalMs} ms`);

    if (errors.length > 0) {
      console.error('El ETL terminó con advertencias:');
      errors.forEach((error) => console.error(`  - ${error}`));
      process.exitCode = 1;
    } else {
      console.log('ETL verificado: los conteos coinciden con la meta documentada.');
    }
  } finally {
    await connection.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
