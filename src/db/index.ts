import { connect } from '@tidbcloud/serverless';
import { drizzle } from 'drizzle-orm/tidb-serverless';
import * as schema from './schema';

const databaseUrl = process.env.DATABASE_URL?.trim();

export const isDbConfigured = Boolean(databaseUrl && databaseUrl.startsWith('mysql://'));

export const rawClient = isDbConfigured ? connect({ url: databaseUrl! }) : null;

export const db = rawClient ? drizzle(rawClient, { schema }) : null;

if (!isDbConfigured && process.env.VERCEL) {
  console.warn('DATABASE_URL is not set: pins live in memory and vanish on every cold start.');
}

const TABLES = ['jawir_tags', 'jawir_coffee_votes'];

// Columns and indexes added after the first release. Tables created by an older version get only what they miss.
const COLUMN_MIGRATIONS: [table: string, column: string, definition: string][] = [
  ['jawir_tags', 'jawir_number', 'INT NOT NULL DEFAULT 0'],
  ['jawir_tags', 'trah', "VARCHAR(25) NOT NULL DEFAULT 'mataraman'"],
  ['jawir_tags', 'coffee_count', 'INT NOT NULL DEFAULT 0'],
  ['jawir_tags', 'owner_hash', 'VARCHAR(64) NULL'],
  ['jawir_coffee_votes', 'ip_hash', 'VARCHAR(64) NULL'],
];

const INDEX_MIGRATIONS: [table: string, index: string, clause: string][] = [
  // Fails while legacy rows still share jawir_number 0; backfill them first.
  ['jawir_tags', 'idx_jawir_number', 'ADD UNIQUE INDEX idx_jawir_number (jawir_number)'],
  ['jawir_tags', 'idx_owner', 'ADD INDEX idx_owner (owner_hash)'],
  ['jawir_coffee_votes', 'idx_vote_ip', 'ADD INDEX idx_vote_ip (ip_hash, created_at)'],
];

// Indexes from older versions that must go. idx_unique_device blocked every second phone whose fingerprint
// collides with an existing pin. Once duplicate device hashes exist it cannot be re-added without cleanup.
const INDEX_DROPS: [table: string, index: string][] = [['jawir_tags', 'idx_unique_device']];

async function initSchema(client: NonNullable<typeof rawClient>): Promise<void> {
  await client.execute(`
    CREATE TABLE IF NOT EXISTS jawir_tags (
      id VARCHAR(36) PRIMARY KEY,
      jawir_number INT NOT NULL,
      nickname VARCHAR(40) NOT NULL,
      status_tag VARCHAR(120) NOT NULL,
      category VARCHAR(25) NOT NULL DEFAULT 'eksis',
      trah VARCHAR(25) NOT NULL DEFAULT 'mataraman',
      region_status VARCHAR(30) NOT NULL DEFAULT 'kandang',
      lat DECIMAL(9, 6) NOT NULL,
      lng DECIMAL(9, 6) NOT NULL,
      distance_km INT NOT NULL DEFAULT 0,
      coffee_count INT NOT NULL DEFAULT 0,
      device_hash VARCHAR(64) NOT NULL,
      ip_hash VARCHAR(64) NOT NULL,
      owner_hash VARCHAR(64) NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY idx_jawir_number (jawir_number),
      KEY idx_coords (lat, lng),
      KEY idx_distance (distance_km),
      KEY idx_coffee (coffee_count),
      KEY idx_owner (owner_hash)
    );
  `);

  await client.execute(`
    CREATE TABLE IF NOT EXISTS jawir_coffee_votes (
      tag_id VARCHAR(36) NOT NULL,
      device_hash VARCHAR(64) NOT NULL,
      ip_hash VARCHAR(64) NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (tag_id, device_hash),
      KEY idx_vote_ip (ip_hash, created_at)
    );
  `);

  const inList = TABLES.map((t) => `'${t}'`).join(', ');
  const columns = (await client.execute(
    `SELECT TABLE_NAME AS t, COLUMN_NAME AS c FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME IN (${inList})`
  )) as { t: string; c: string }[];
  const indexes = (await client.execute(
    `SELECT DISTINCT TABLE_NAME AS t, INDEX_NAME AS i FROM information_schema.STATISTICS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME IN (${inList})`
  )) as { t: string; i: string }[];

  const haveColumn = new Set(columns.map((r) => `${r.t}.${r.c}`.toLowerCase()));
  const haveIndex = new Set(indexes.map((r) => `${r.t}.${r.i}`.toLowerCase()));

  for (const [table, column, definition] of COLUMN_MIGRATIONS) {
    if (haveColumn.has(`${table}.${column}`)) continue;
    await client.execute(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
  for (const [table, index, clause] of INDEX_MIGRATIONS) {
    if (haveIndex.has(`${table}.${index}`)) continue;
    try {
      await client.execute(`ALTER TABLE ${table} ${clause}`);
    } catch (err) {
      console.error(`Could not add index ${table}.${index}:`, err);
    }
  }
  for (const [table, index] of INDEX_DROPS) {
    if (!haveIndex.has(`${table}.${index}`)) continue;
    try {
      await client.execute(`ALTER TABLE ${table} DROP INDEX ${index}`);
    } catch (err) {
      console.error(`Could not drop index ${table}.${index}:`, err);
    }
  }
}

let initPromise: Promise<void> | null = null;

// Runs once per server instance; a failed run is retried on the next request.
export function ensureTable(): Promise<void> {
  if (!rawClient) return Promise.resolve();
  initPromise ??= initSchema(rawClient).catch((err) => {
    initPromise = null;
    console.error('Failed to initialize TiDB schema:', err);
  });
  return initPromise;
}
