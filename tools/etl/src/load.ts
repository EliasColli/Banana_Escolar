import bcrypt from 'bcryptjs';
import type { Connection, ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { formatMysqlDate } from './rng';
import type { NormalizedReport, RawUserRow } from './types';

export interface LoadResult {
  insertedReports: number;
  insertedSolutions: number;
  users: number;
}

const TABLES_TO_RESET = [
  'report_attachments',
  'soluciones',
  'reportes',
  'refresh_tokens',
  'folio_counters',
  'etl_runs',
  'usuarios',
  'categorias',
];

export async function resetDatabase(connection: Connection): Promise<void> {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('ETL_RESET está prohibido en producción.');
  }
  await connection.query('SET FOREIGN_KEY_CHECKS = 0');
  for (const table of TABLES_TO_RESET) {
    await connection.query(`TRUNCATE TABLE \`${table}\``);
  }
  await connection.query('SET FOREIGN_KEY_CHECKS = 1');
}

function chunk<T>(values: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let index = 0; index < values.length; index += size) {
    result.push(values.slice(index, index + size));
  }
  return result;
}

async function upsertUsers(
  connection: Connection,
  users: RawUserRow[],
): Promise<{ byEmail: Map<string, number>; technicians: Set<string> }> {
  const hashByPassword = new Map<string, string>();
  for (const user of users) {
    if (!hashByPassword.has(user.password)) {
      hashByPassword.set(user.password, await bcrypt.hash(user.password, 12));
    }
  }

  const rows = users.map((user) => [
    user.nombre.trim(),
    user.correo.trim().toLowerCase(),
    hashByPassword.get(user.password),
    user.rol,
    user.activo === '1' ? 1 : 0,
  ]);

  for (const batch of chunk(rows, 250)) {
    await connection.query(
      `INSERT INTO usuarios (nombre, correo, password_hash, rol, activo)
       VALUES ?
       ON DUPLICATE KEY UPDATE
         nombre = VALUES(nombre),
         password_hash = VALUES(password_hash),
         rol = VALUES(rol),
         activo = VALUES(activo)`,
      [batch],
    );
  }

  const [stored] = await connection.query<RowDataPacket[]>(
    'SELECT id, correo, rol FROM usuarios',
  );
  const byEmail = new Map<string, number>();
  const technicians = new Set<string>();
  for (const row of stored) {
    const email = String(row.correo);
    byEmail.set(email, Number(row.id));
    if (row.rol === 'TECNICO') technicians.add(email);
  }

  return { byEmail, technicians };
}

async function upsertCategories(connection: Connection): Promise<Map<string, number>> {
  const names = [
    'Eléctrico',
    'Plomería',
    'Mobiliario',
    'Pintura',
    'Limpieza',
    'Tecnología',
    'Seguridad',
  ];
  await connection.query('INSERT IGNORE INTO categorias (nombre) VALUES ?', [names.map((n) => [n])]);

  const [rows] = await connection.query<RowDataPacket[]>('SELECT id, nombre FROM categorias');
  return new Map(rows.map((row) => [String(row.nombre), Number(row.id)]));
}

export async function load(
  connection: Connection,
  reports: NormalizedReport[],
  users: RawUserRow[],
  options: { reset?: boolean } = {},
): Promise<LoadResult> {
  if (options.reset) {
    console.log('ADVERTENCIA: reiniciando datos (solo ambiente de pruebas).');
    await resetDatabase(connection);
  }

  await connection.beginTransaction();
  try {
    const { byEmail } = await upsertUsers(connection, users);
    const categories = await upsertCategories(connection);

    let insertedReports = 0;
    let insertedSolutions = 0;
    const solutionRows: Array<Array<unknown>> = [];

    for (const batch of chunk(reports, 500)) {
      const values = batch.map((report) => {
        const userId = byEmail.get(report.correoUsuario);
        const categoryId = categories.get(report.categoria);
        const technicianId = report.tecnicoCorreo ? byEmail.get(report.tecnicoCorreo) : null;
        if (!userId || !categoryId) {
          throw new Error(`Referencia no resuelta para ${report.folio}`);
        }
        return [
          report.folio,
          userId,
          categoryId,
          technicianId ?? null,
          report.descripcion,
          report.ubicacion,
          report.prioridad,
          report.estado,
          formatMysqlDate(report.creadoEn),
          report.asignadoEn ? formatMysqlDate(report.asignadoEn) : null,
        ];
      });

      const [result] = await connection.query<ResultSetHeader>(
        `INSERT INTO reportes
           (folio, usuario_id, categoria_id, tecnico_id, descripcion, ubicacion, prioridad, estado, creado_en, asignado_en)
         VALUES ?
         ON DUPLICATE KEY UPDATE
           usuario_id = VALUES(usuario_id),
           categoria_id = VALUES(categoria_id),
           tecnico_id = VALUES(tecnico_id),
           descripcion = VALUES(descripcion),
           ubicacion = VALUES(ubicacion),
           prioridad = VALUES(prioridad),
           estado = VALUES(estado),
           creado_en = VALUES(creado_en),
           asignado_en = VALUES(asignado_en)`,
        [values],
      );
      insertedReports += Number(result.affectedRows ?? 0);

      const folios = batch.map((report) => report.folio);
      const [idRows] = await connection.query<RowDataPacket[]>(
        'SELECT id, folio FROM reportes WHERE folio IN (?)',
        [folios],
      );
      const idByFolio = new Map(idRows.map((row) => [String(row.folio), Number(row.id)]));

      for (const report of batch) {
        if (report.estado !== 'completado' || !report.solucionDescripcion || !report.resueltoEn) {
          continue;
        }
        const reportId = idByFolio.get(report.folio);
        const technicianId = report.tecnicoCorreo ? byEmail.get(report.tecnicoCorreo) : null;
        if (!reportId || !technicianId) {
          throw new Error(`No se pudo resolver la solución de ${report.folio}`);
        }
        solutionRows.push([
          reportId,
          technicianId,
          report.solucionDescripcion,
          report.solucionObservaciones ?? null,
          formatMysqlDate(report.resueltoEn),
        ]);
      }
    }

    for (const batch of chunk(solutionRows, 500)) {
      const [result] = await connection.query<ResultSetHeader>(
        `INSERT INTO soluciones (reporte_id, tecnico_id, descripcion, observaciones, resuelto_en)
         VALUES ?
         ON DUPLICATE KEY UPDATE
           tecnico_id = VALUES(tecnico_id),
           descripcion = VALUES(descripcion),
           observaciones = VALUES(observaciones),
           resuelto_en = VALUES(resuelto_en)`,
        [batch],
      );
      insertedSolutions += Number(result.affectedRows ?? 0);
    }

    // El contador de folios debe quedar por delante de los folios importados.
    const years = new Map<number, number>();
    for (const report of reports) {
      const match = /^REP-(\d{4})-(\d+)$/.exec(report.folio);
      if (!match) continue;
      const year = Number(match[1]);
      const sequence = Number(match[2]);
      years.set(year, Math.max(years.get(year) ?? 0, sequence));
    }
    for (const [year, lastValue] of years) {
      await connection.query(
        `INSERT INTO folio_counters (\`year\`, \`last_value\`) VALUES (?, ?)
         ON DUPLICATE KEY UPDATE \`last_value\` = GREATEST(\`last_value\`, VALUES(\`last_value\`))`,
        [year, lastValue],
      );
    }

    await connection.commit();
    return { insertedReports, insertedSolutions, users: users.length };
  } catch (error) {
    await connection.rollback();
    throw error;
  }
}
