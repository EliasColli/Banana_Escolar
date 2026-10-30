import 'dotenv/config';
import mysql from 'mysql2/promise';
import { verifyDatabase } from './verify';

async function main(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error('Falta DATABASE_URL en el entorno.');

  const connection = await mysql.createConnection(databaseUrl);
  try {
    const result = await verifyDatabase(connection);
    console.log(JSON.stringify(result, null, 2));
  } finally {
    await connection.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
