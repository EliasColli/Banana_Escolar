import 'dotenv/config';
import mysql from 'mysql2/promise';
import type { ResultSetHeader } from 'mysql2/promise';

const SEED = 2026;
const BATCH_SIZE = 5_000;

const CATEGORIES = [
  'Eléctrico',
  'Plomería',
  'Mobiliario',
  'Pintura',
  'Limpieza',
  'Tecnología',
  'Seguridad',
];

const LOCATIONS = [
  'Edificio A - planta baja',
  'Edificio A - primer piso',
  'Edificio A - segundo piso',
  'Edificio B - laboratorio 1',
  'Edificio B - laboratorio 2',
  'Edificio C - baños',
  'Biblioteca central',
  'Cafetería',
  'Cancha deportiva',
  'Auditorio',
  'Sala de cómputo',
  'Estacionamiento',
  'Dirección académica',
  'Taller de mantenimiento',
  'Patio central',
];

const WORDS = [
  'fuga',
  'agua',
  'lavabo',
  'contacto',
  'eléctrico',
  'chispa',
  'lámpara',
  'pasillo',
  'silla',
  'rota',
  'pared',
  'humedad',
  'basura',
  'olor',
  'proyector',
  'enciende',
  'puerta',
  'seguridad',
  'ventana',
  'cristal',
  'internet',
  'computadora',
  'teclado',
  'pintura',
  'mesa',
  'piso',
  'baño',
  'tubería',
  'cámara',
];

function createRng(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rng = createRng(SEED);
const BASE_DATE = new Date('2025-01-01T06:00:00.000Z').getTime();
const DAY_MS = 86_400_000;

function mysqlDate(timestamp: number): string {
  return new Date(timestamp).toISOString().slice(0, 19).replace('T', ' ');
}

function description(): string {
  const length = 6 + Math.floor(rng() * 7);
  const words: string[] = [];
  for (let index = 0; index < length; index += 1) {
    words.push(WORDS[Math.floor(rng() * WORDS.length)]);
  }
  if (rng() < 0.08) words[Math.floor(rng() * words.length)] = 'fuga';
  if (rng() < 0.005) words[Math.floor(rng() * words.length)] = 'extintor';
  return `Reporte de mantenimiento: ${words.join(' ')}.`;
}

async function main(): Promise<void> {
  const sizeArgument = process.argv.find((argument) => argument.startsWith('--size='));
  const total = Number(sizeArgument?.split('=')[1] ?? 10_000);
  if (!Number.isInteger(total) || total < 1) throw new Error('--size inválido.');

  const databaseUrl = process.env.BENCHMARK_DATABASE_URL;
  if (!databaseUrl) throw new Error('Falta BENCHMARK_DATABASE_URL.');
  const databaseName = decodeURIComponent(new URL(databaseUrl).pathname.replace(/^\//, ''));
  if (!databaseName.toLowerCase().includes('bench')) {
    throw new Error(
      `Seguridad: BENCHMARK_DATABASE_URL apunta a "${databaseName}". Usa una base de laboratorio cuyo nombre contenga "bench".`,
    );
  }
  const connection = await mysql.createConnection(databaseUrl);
  const started = Date.now();

  try {
    console.log(`Sembrando ${total.toLocaleString('es-MX')} filas en banana_benchmark…`);

    await connection.query('SET FOREIGN_KEY_CHECKS = 0');
    await connection.query('DROP TABLE IF EXISTS reportes');
    await connection.query('DROP TABLE IF EXISTS categorias');
    await connection.query('SET FOREIGN_KEY_CHECKS = 1');

    await connection.query(
      `CREATE TABLE categorias (
        id INT NOT NULL,
        nombre VARCHAR(100) NOT NULL,
        PRIMARY KEY (id)
      ) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci`,
    );

    await connection.query(
      `CREATE TABLE reportes (
        id INT NOT NULL AUTO_INCREMENT,
        folio VARCHAR(24) NOT NULL,
        categoria_id INT NOT NULL,
        estado ENUM('pendiente', 'en_proceso', 'completado') NOT NULL,
        prioridad ENUM('baja', 'media', 'alta') NOT NULL,
        descripcion TEXT NOT NULL,
        ubicacion VARCHAR(190) NOT NULL,
        creado_en DATETIME(3) NOT NULL,
        PRIMARY KEY (id),
        UNIQUE KEY uq_reportes_folio (folio)
      ) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci`,
    );

    await connection.query('INSERT INTO categorias (id, nombre) VALUES ?', [
      CATEGORIES.map((nombre, index) => [index + 1, nombre]),
    ]);

    const statuses = ['pendiente', 'en_proceso', 'completado'] as const;
    const priorities = ['baja', 'media', 'alta'] as const;
    let inserted = 0;

    for (let offset = 0; offset < total; offset += BATCH_SIZE) {
      const batchLength = Math.min(BATCH_SIZE, total - offset);
      const rows: Array<Array<unknown>> = [];

      for (let index = 0; index < batchLength; index += 1) {
        const sequence = offset + index + 1;
        const createdAt = BASE_DATE + Math.floor(rng() * 660 * DAY_MS);
        rows.push([
          `BENCH-2026-${String(sequence).padStart(7, '0')}`,
          (sequence % 7) + 1,
          statuses[Math.floor(rng() * statuses.length)],
          priorities[Math.floor(rng() * priorities.length)],
          description(),
          LOCATIONS[Math.floor(rng() * LOCATIONS.length)],
          mysqlDate(createdAt),
        ]);
      }

      const [result] = await connection.query<ResultSetHeader>(
        `INSERT INTO reportes (folio, categoria_id, estado, prioridad, descripcion, ubicacion, creado_en)
         VALUES ?`,
        [rows],
      );
      inserted += result.affectedRows;
      if (offset % (BATCH_SIZE * 20) === 0) {
        console.log(`  ${inserted.toLocaleString('es-MX')} / ${total.toLocaleString('es-MX')}`);
      }
    }

    const elapsed = Date.now() - started;
    console.log(`Listo: ${inserted.toLocaleString('es-MX')} reportes en ${(elapsed / 1000).toFixed(2)} s`);
    console.log(`Seed: ${SEED} | sin índices secundarios (se crean en el benchmark).`);
  } finally {
    await connection.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
