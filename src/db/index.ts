import { connect } from '@tidbcloud/serverless';
import { drizzle } from 'drizzle-orm/tidb-serverless';
import * as schema from './schema';

const databaseUrl = process.env.DATABASE_URL?.trim();

export const isDbConfigured = Boolean(databaseUrl && databaseUrl.startsWith('mysql://'));

export const rawClient = isDbConfigured ? connect({ url: databaseUrl! }) : null;

export const db = rawClient ? drizzle(rawClient, { schema }) : null;

let tableInitialized = false;

export async function ensureTable(): Promise<void> {
  if (!rawClient || tableInitialized) return;

  try {
    await rawClient.execute(`
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
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY idx_unique_device (device_hash),
        UNIQUE KEY idx_jawir_number (jawir_number),
        KEY idx_coords (lat, lng),
        KEY idx_distance (distance_km),
        KEY idx_coffee (coffee_count)
      );
    `);

    await rawClient.execute(`
      CREATE TABLE IF NOT EXISTS jawir_coffee_votes (
        tag_id VARCHAR(36) NOT NULL,
        device_hash VARCHAR(64) NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (tag_id, device_hash)
      );
    `);

    // Safely add missing columns if table already existed from previous version
    try {
      await rawClient.execute(`ALTER TABLE jawir_tags ADD COLUMN jawir_number INT NOT NULL DEFAULT 0`);
    } catch {
      // Column may already exist
    }
    try {
      await rawClient.execute(`ALTER TABLE jawir_tags ADD UNIQUE INDEX idx_jawir_number (jawir_number)`);
    } catch {
      // Index may already exist (or legacy rows still share a number; backfill first)
    }
    try {
      await rawClient.execute(`ALTER TABLE jawir_tags ADD COLUMN trah VARCHAR(25) NOT NULL DEFAULT 'mataraman'`);
    } catch {
      // Column may already exist
    }
    try {
      await rawClient.execute(`ALTER TABLE jawir_tags ADD COLUMN coffee_count INT NOT NULL DEFAULT 0`);
    } catch {
      // Column may already exist
    }

    tableInitialized = true;
  } catch (err) {
    console.error('Failed to auto-initialize or alter table in TiDB:', err);
  }
}
