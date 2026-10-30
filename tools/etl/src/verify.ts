import type { Connection, RowDataPacket } from 'mysql2/promise';

export interface VerificationResult {
  totalReportes: number;
  porEstado: Array<{ estado: string; count: number }>;
  totalSoluciones: number;
  totalUsuarios: Array<{ rol: string; count: number }>;
  q1PorCategoriaEstado: Array<{ categoria: string; estado: string; count: number }>;
  q2ActivosPorTecnico: Array<{ tecnico: string; abiertos: number }>;
  q3ResolucionPorCategoria: Array<{
    categoria: string;
    avgDays: number | null;
    completados: number;
  }>;
  mysqlVersion: string;
}

export async function verifyDatabase(connection: Connection): Promise<VerificationResult> {
  const [versionRows] = await connection.query<RowDataPacket[]>('SELECT VERSION() AS version');
  const [totalRows] = await connection.query<RowDataPacket[]>(
    'SELECT COUNT(*) AS total FROM reportes',
  );
  const [statusRows] = await connection.query<RowDataPacket[]>(
    'SELECT estado, COUNT(*) AS count FROM reportes GROUP BY estado ORDER BY estado',
  );
  const [solutionRows] = await connection.query<RowDataPacket[]>(
    'SELECT COUNT(*) AS total FROM soluciones',
  );
  const [userRows] = await connection.query<RowDataPacket[]>(
    'SELECT rol, COUNT(*) AS count FROM usuarios GROUP BY rol ORDER BY rol',
  );
  const [q1Rows] = await connection.query<RowDataPacket[]>(
    `SELECT c.nombre AS categoria, r.estado, COUNT(*) AS count
     FROM reportes r
     JOIN categorias c ON c.id = r.categoria_id
     GROUP BY c.nombre, r.estado
     ORDER BY c.nombre, r.estado`,
  );
  const [q2Rows] = await connection.query<RowDataPacket[]>(
    `SELECT u.nombre AS tecnico, COUNT(r.id) AS abiertos
     FROM usuarios u
     LEFT JOIN reportes r ON r.tecnico_id = u.id AND r.estado <> 'completado'
     WHERE u.rol = 'TECNICO' AND u.activo = 1
     GROUP BY u.id, u.nombre
     ORDER BY abiertos DESC, u.nombre`,
  );
  const [q3Rows] = await connection.query<RowDataPacket[]>(
    `SELECT c.nombre AS categoria,
            ROUND(AVG(TIMESTAMPDIFF(SECOND, r.creado_en, s.resuelto_en)) / 86400, 2) AS avgDays,
            COUNT(*) AS completados
     FROM reportes r
     JOIN categorias c ON c.id = r.categoria_id
     JOIN soluciones s ON s.reporte_id = r.id
     GROUP BY c.nombre
     ORDER BY avgDays DESC`,
  );

  return {
    totalReportes: Number(totalRows[0]?.total ?? 0),
    porEstado: statusRows.map((row) => ({ estado: String(row.estado), count: Number(row.count) })),
    totalSoluciones: Number(solutionRows[0]?.total ?? 0),
    totalUsuarios: userRows.map((row) => ({ rol: String(row.rol), count: Number(row.count) })),
    q1PorCategoriaEstado: q1Rows.map((row) => ({
      categoria: String(row.categoria),
      estado: String(row.estado),
      count: Number(row.count),
    })),
    q2ActivosPorTecnico: q2Rows.map((row) => ({
      tecnico: String(row.tecnico),
      abiertos: Number(row.abiertos),
    })),
    q3ResolucionPorCategoria: q3Rows.map((row) => ({
      categoria: String(row.categoria),
      avgDays: row.avgDays === null ? null : Number(row.avgDays),
      completados: Number(row.completados),
    })),
    mysqlVersion: String(versionRows[0]?.version ?? 'desconocida'),
  };
}
