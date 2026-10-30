import 'dotenv/config';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import os from 'node:os';
import mysql from 'mysql2/promise';
import type { Connection, RowDataPacket } from 'mysql2/promise';

const WARMUPS = 3;
const DEFAULT_REPEATS = 30;

const QUERY_A = `SELECT id, folio, categoria_id, estado, creado_en
FROM reportes
WHERE categoria_id = ?
  AND estado = ?
  AND creado_en >= ?
  AND creado_en < ?
ORDER BY creado_en DESC, id DESC
LIMIT 20 OFFSET 0`;

const QUERY_B1 = `SELECT id, folio, descripcion
FROM reportes
WHERE descripcion LIKE ?
ORDER BY creado_en DESC, id DESC
LIMIT 20`;

const QUERY_B2 = `SELECT id, folio, descripcion
FROM reportes
WHERE MATCH(descripcion) AGAINST (? IN NATURAL LANGUAGE MODE)
ORDER BY creado_en DESC, id DESC
LIMIT 20`;

interface Stats {
  runs: number;
  avgMs: number;
  medianMs: number;
  p95Ms: number;
  minMs: number;
  maxMs: number;
  rows: number;
}

interface MeasureResult {
  stats: Stats | null;
  error: string | null;
}

function percentile(sorted: number[], value: number): number {
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil(value * sorted.length) - 1));
  return sorted[index];
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

async function measure(
  connection: Connection,
  sql: string,
  params: unknown[],
  repeats: number,
): Promise<MeasureResult> {
  let rows = 0;
  try {
    for (let index = 0; index < WARMUPS; index += 1) {
      await connection.query(sql, params);
    }
    const times: number[] = [];
    for (let index = 0; index < repeats; index += 1) {
      const start = process.hrtime.bigint();
      const [result] = await connection.query<RowDataPacket[]>(sql, params);
      const elapsed = Number(process.hrtime.bigint() - start) / 1_000_000;
      times.push(elapsed);
      rows = result.length;
    }
    const sorted = [...times].sort((left, right) => left - right);
    const average = times.reduce((sum, value) => sum + value, 0) / times.length;
    return {
      stats: {
        runs: times.length,
        avgMs: round(average),
        medianMs: round(percentile(sorted, 0.5)),
        p95Ms: round(percentile(sorted, 0.95)),
        minMs: round(sorted[0]),
        maxMs: round(sorted[sorted.length - 1]),
        rows,
      },
      error: null,
    };
  } catch (error) {
    return { stats: null, error: error instanceof Error ? error.message : String(error) };
  }
}

async function indexExists(connection: Connection, name: string): Promise<boolean> {
  const [rows] = await connection.query<RowDataPacket[]>(
    `SELECT 1 FROM information_schema.statistics
     WHERE table_schema = DATABASE() AND table_name = 'reportes' AND index_name = ? LIMIT 1`,
    [name],
  );
  return rows.length > 0;
}

async function dropIndexIfExists(connection: Connection, name: string): Promise<void> {
  if (await indexExists(connection, name)) {
    await connection.query(`DROP INDEX \`${name}\` ON reportes`);
  }
}

async function explain(connection: Connection, sql: string, params: unknown[]): Promise<string> {
  try {
    const [rows] = await connection.query<RowDataPacket[]>(`EXPLAIN ANALYZE ${sql}`, params);
    return String(Object.values(rows[0] ?? {})[0] ?? 'sin plan');
  } catch (error) {
    return `No disponible: ${error instanceof Error ? error.message : String(error)}`;
  }
}

async function tableSizes(connection: Connection) {
  const [rows] = await connection.query<RowDataPacket[]>(
    `SELECT TABLE_ROWS AS tableRows, DATA_LENGTH AS dataBytes, INDEX_LENGTH AS indexBytes
     FROM information_schema.TABLES
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'reportes'`,
  );
  const row = rows[0] ?? {};
  return {
    estimatedRows: Number(row.tableRows ?? 0),
    dataBytes: Number(row.dataBytes ?? 0),
    indexBytes: Number(row.indexBytes ?? 0),
  };
}

function improvement(before: Stats | null, after: Stats | null): number | null {
  if (!before || !after || before.avgMs === 0) return null;
  return round(((before.avgMs - after.avgMs) / before.avgMs) * 100);
}

function statsRow(label: string, result: MeasureResult): string {
  if (!result.stats) return `| ${label} | — | — | — | — | ${result.error ?? ''} |`;
  const { stats } = result;
  return `| ${label} | ${stats.avgMs} | ${stats.medianMs} | ${stats.p95Ms} | ${stats.minMs}–${stats.maxMs} | ${stats.runs} × ${stats.rows} filas |`;
}

async function main(): Promise<void> {
  const repeatsArgument = process.argv.find((argument) => argument.startsWith('--repeats='));
  const repeats = Number(repeatsArgument?.split('=')[1] ?? DEFAULT_REPEATS);
  const databaseUrl = process.env.BENCHMARK_DATABASE_URL;
  if (!databaseUrl) throw new Error('Falta BENCHMARK_DATABASE_URL.');

  const connection = await mysql.createConnection(databaseUrl);
  try {
    const [countRows] = await connection.query<RowDataPacket[]>('SELECT COUNT(*) AS total FROM reportes');
    const rows = Number(countRows[0]?.total ?? 0);
    if (rows === 0) throw new Error('La tabla reportes está vacía. Ejecuta seed:10k o seed:1m.');

    const [versionRows] = await connection.query<RowDataPacket[]>('SELECT VERSION() AS version');
    const [schemaRows] = await connection.query<RowDataPacket[]>('SELECT DATABASE() AS db');

    console.log(`Benchmark sobre ${rows.toLocaleString('es-MX')} reportes (${repeats} repeticiones).`);
    console.log('Eliminando índices secundarios para medir el estado base…');
    await dropIndexIfExists(connection, 'idx_reportes_cat_estado_fecha');
    await dropIndexIfExists(connection, 'ft_reportes_descripcion');
    await connection.query('ANALYZE TABLE reportes');

    const queryParams = {
      a: [3, 'completado', '2026-01-01 00:00:00', '2026-10-01 00:00:00'],
      b1: ['%extintor%'],
      b2: ['extintor'],
    };

    const beforeA = await measure(connection, QUERY_A, queryParams.a, repeats);
    const beforeB1 = await measure(connection, QUERY_B1, queryParams.b1, repeats);
    const beforeSizes = await tableSizes(connection);
    const explainB1Before = await explain(connection, QUERY_B1, queryParams.b1);

    console.log('Creando índice compuesto A…');
    const indexStart = process.hrtime.bigint();
    await connection.query(
      `CREATE INDEX idx_reportes_cat_estado_fecha
       ON reportes (categoria_id, estado, creado_en DESC, id DESC)`,
    );
    const secondaryIndexMs = Number(process.hrtime.bigint() - indexStart) / 1_000_000;

    console.log('Creando índice FULLTEXT B2…');
    const fulltextStart = process.hrtime.bigint();
    await connection.query(
      'CREATE FULLTEXT INDEX ft_reportes_descripcion ON reportes (descripcion)',
    );
    const fulltextMs = Number(process.hrtime.bigint() - fulltextStart) / 1_000_000;
    await connection.query('ANALYZE TABLE reportes');

    const afterA = await measure(connection, QUERY_A, queryParams.a, repeats);
    const afterB1 = await measure(connection, QUERY_B1, queryParams.b1, repeats);
    const afterB2 = await measure(connection, QUERY_B2, queryParams.b2, repeats);
    const afterSizes = await tableSizes(connection);

    const explainAAfter = await explain(connection, QUERY_A, queryParams.a);
    const explainB1After = await explain(connection, QUERY_B1, queryParams.b1);
    const explainB2After = await explain(connection, QUERY_B2, queryParams.b2);

    const result = {
      meta: {
        generatedAt: new Date().toISOString(),
        seed: 2026,
        rows,
        repeats,
        warmups: WARMUPS,
        database: String(schemaRows[0]?.db ?? 'banana_benchmark'),
        note: 'B1 (LIKE) y B2 (FULLTEXT) no son equivalentes: una busca subcadenas y la otra términos.',
      },
      environment: {
        mysqlVersion: String(versionRows[0]?.version ?? ''),
        nodeVersion: process.version,
        platform: `${os.platform()} ${os.release()}`,
        cpu: os.cpus()[0]?.model ?? 'desconocido',
        cores: os.cpus().length,
        totalMemoryMb: Math.round(os.totalmem() / (1024 * 1024)),
      },
      queries: {
        A: { sql: QUERY_A, params: queryParams.a },
        B1: { sql: QUERY_B1, params: queryParams.b1 },
        B2: { sql: QUERY_B2, params: queryParams.b2 },
      },
      beforeIndexes: {
        A: beforeA,
        B1: beforeB1,
        sizes: beforeSizes,
      },
      indexCreation: {
        secondaryMs: round(secondaryIndexMs),
        fulltextMs: round(fulltextMs),
      },
      afterIndexes: {
        A: afterA,
        B1: afterB1,
        B2: afterB2,
        sizes: afterSizes,
      },
      improvementsPct: {
        A: improvement(beforeA.stats, afterA.stats),
        B1: improvement(beforeB1.stats, afterB1.stats),
        B2: null,
      },
      explain: {
        A_after: explainAAfter,
        B1_before: explainB1Before,
        B1_after: explainB1After,
        B2_after: explainB2After,
      },
    };

    const resultsDir = resolve(process.cwd(), 'results');
    mkdirSync(resultsDir, { recursive: true });
    const suffix = `${rows}`;
    writeFileSync(
      resolve(resultsDir, `bench-${suffix}.json`),
      JSON.stringify(result, null, 2),
      'utf8',
    );

    const markdown = `# Benchmark MySQL — ${rows.toLocaleString('es-MX')} reportes

Generado: ${result.meta.generatedAt}  
Semilla: 2026 · Repeticiones cronometradas: ${repeats} (+${WARMUPS} de calentamiento)

## Entorno

| Dato | Valor |
|---|---|
| MySQL | ${result.environment.mysqlVersion} |
| Base de datos | ${result.meta.database} |
| Node.js | ${result.environment.nodeVersion} |
| SO | ${result.environment.platform} |
| CPU | ${result.environment.cpu} (${result.environment.cores} núcleos) |
| RAM | ${result.environment.totalMemoryMb} MB |

## Resultados (ms)

| Variante | Antes | Después | Mejora |
|---|---:|---:|---:|
| A · historial con índice compuesto | ${beforeA.stats?.avgMs ?? '—'} | ${afterA.stats?.avgMs ?? '—'} | ${result.improvementsPct.A ?? '—'}% |
| B1 · LIKE '%extintor%' (sin índice especializado) | ${beforeB1.stats?.avgMs ?? '—'} | ${afterB1.stats?.avgMs ?? '—'} | ${result.improvementsPct.B1 ?? '—'}% |
| B2 · MATCH … AGAINST (FULLTEXT) | No ejecutable sin FULLTEXT | ${afterB2.stats?.avgMs ?? '—'} | — |

### Antes de índices secundarios

| Consulta | Promedio | Mediana | p95 | Rango | Ejecuciones |
|---|---:|---:|---:|---:|---|
${statsRow('A', beforeA)}
${statsRow('B1', beforeB1)}

### Después de índices

| Consulta | Promedio | Mediana | p95 | Rango | Ejecuciones |
|---|---:|---:|---:|---:|---|
${statsRow('A', afterA)}
${statsRow('B1', afterB1)}
${statsRow('B2', afterB2)}

## Costo de los índices

- Creación del índice compuesto: ${round(secondaryIndexMs)} ms.
- Creación del índice FULLTEXT: ${round(fulltextMs)} ms.
- Tamaño de datos antes: ${(beforeSizes.dataBytes / (1024 * 1024)).toFixed(2)} MB; después: ${(afterSizes.dataBytes / (1024 * 1024)).toFixed(2)} MB.
- Tamaño de índices antes: ${(beforeSizes.indexBytes / (1024 * 1024)).toFixed(2)} MB; después: ${(afterSizes.indexBytes / (1024 * 1024)).toFixed(2)} MB.

## Planes EXPLAIN ANALYZE

### A — después del índice compuesto

\`\`\`text
${explainAAfter}
\`\`\`

### B1 — antes (LIKE)

\`\`\`text
${explainB1Before}
\`\`\`

### B1 — después (LIKE)

\`\`\`text
${explainB1After}
\`\`\`

### B2 — después (FULLTEXT)

\`\`\`text
${explainB2After}
\`\`\`

## Lectura

- El índice compuesto acelera A cuando el filtro y el orden coinciden con su prefijo.
- B1 con comodín inicial no puede aprovechar un B-tree; el FULLTEXT no promete acelerar \`LIKE '%texto%'\`.
- B2 busca términos con reglas de stopwords y tokens mínimos; no es equivalente a una búsqueda de subcadenas.
- Los resultados son de este equipo y este MySQL; no se copian cifras de PostgreSQL.
`;
    writeFileSync(resolve(resultsDir, `bench-${suffix}.md`), markdown, 'utf8');

    console.log('--- Resultados ---');
    console.log(`A: ${beforeA.stats?.avgMs ?? '—'} → ${afterA.stats?.avgMs ?? '—'} ms`);
    console.log(`B1: ${beforeB1.stats?.avgMs ?? '—'} → ${afterB1.stats?.avgMs ?? '—'} ms`);
    console.log(`B2 FULLTEXT: ${afterB2.stats?.avgMs ?? '—'} ms`);
    console.log(`Guardado en results/bench-${suffix}.json y .md`);
  } finally {
    await connection.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
