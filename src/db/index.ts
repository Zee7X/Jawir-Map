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
  // Set when reports cross the threshold or an admin hides the pin; hidden pins leave every public view.
  ['jawir_tags', 'hidden_at', 'TIMESTAMP NULL'],
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
      hidden_at TIMESTAMP NULL,
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

  // One report per browser (voter cookie) per pin.
  await client.execute(`
    CREATE TABLE IF NOT EXISTS jawir_reports (
      tag_id VARCHAR(36) NOT NULL,
      reporter_hash VARCHAR(64) NOT NULL,
      ip_hash VARCHAR(64) NOT NULL,
      reason VARCHAR(20) NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (tag_id, reporter_hash),
      KEY idx_report_ip (ip_hash, created_at)
    );
  `);

  // Monotonic counters; see allocateJawirNumber.
  await client.execute(`
    CREATE TABLE IF NOT EXISTS jawir_counters (
      name VARCHAR(32) PRIMARY KEY,
      value INT NOT NULL
    );
  `);
  await client.execute(`INSERT IGNORE INTO jawir_counters (name, value) VALUES ('jawir_number', 0)`);

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

  // Several cold instances can run this at once; whoever loses the race sees "already done" errors, which are fine.
  for (const [table, column, definition] of COLUMN_MIGRATIONS) {
    if (haveColumn.has(`${table}.${column}`)) continue;
    await alterTolerating(client, `ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`, [ER_DUP_FIELDNAME]);
  }
  for (const [table, index, clause] of INDEX_MIGRATIONS) {
    if (haveIndex.has(`${table}.${index}`)) continue;
    try {
      await alterTolerating(client, `ALTER TABLE ${table} ${clause}`, [ER_DUP_KEYNAME]);
    } catch (err) {
      console.error(`Could not add index ${table}.${index}:`, err);
    }
  }
  for (const [table, index] of INDEX_DROPS) {
    if (!haveIndex.has(`${table}.${index}`)) continue;
    try {
      await alterTolerating(client, `ALTER TABLE ${table} DROP INDEX ${index}`, [ER_CANT_DROP_FIELD_OR_KEY]);
    } catch (err) {
      console.error(`Could not drop index ${table}.${index}:`, err);
    }
  }
}

const ER_DUP_FIELDNAME = 1060;
const ER_DUP_KEYNAME = 1061;
const ER_CANT_DROP_FIELD_OR_KEY = 1091;

// The serverless driver wraps MySQL errors as "Execute SQL fail: Error 1060 (42S21): ...".
function mysqlErrorCode(err: unknown): number | null {
  const e = err as { message?: string; details?: { message?: string } };
  const m = `${e?.message ?? ''} ${e?.details?.message ?? ''}`.match(/Error (\d{4})/);
  return m ? Number(m[1]) : null;
}

async function alterTolerating(client: NonNullable<typeof rawClient>, sql: string, okCodes: number[]) {
  try {
    await client.execute(sql);
  } catch (err) {
    const code = mysqlErrorCode(err);
    if (code === null || !okCodes.includes(code)) throw err;
  }
}

/**
 * Next Jawir number, never reused: a counter row that only grows, so deleting the highest pin does not
 * hand its number to the next person. GREATEST() lifts the counter to the current maximum on its first use
 * (tables from before the counter existed) and self-heals if it ever falls behind.
 */
export async function allocateJawirNumber(): Promise<number> {
  if (!rawClient) throw new Error('Database is not configured');
  const tx = await rawClient.begin();
  try {
    await tx.execute(
      `UPDATE jawir_counters
         SET value = GREATEST(value, (SELECT COALESCE(MAX(jawir_number), 0) FROM jawir_tags)) + 1
       WHERE name = 'jawir_number'`
    );
    const rows = (await tx.execute(`SELECT value FROM jawir_counters WHERE name = 'jawir_number'`)) as { value: number | string }[];
    await tx.commit();
    const value = Number(rows[0]?.value);
    if (!Number.isInteger(value) || value < 1) throw new Error('Jawir counter returned no value');
    return value;
  } catch (err) {
    await tx.rollback().catch(() => {});
    throw err;
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
