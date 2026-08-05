/**
 * CARSAI HOST — Database connection (better-sqlite3 + Drizzle)
 */
import Database from 'better-sqlite3';
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema.js';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { logger } from '../utils/logger.js';

const dbUrl = process.env.DATABASE_URL || './data/carsai.db';
const dbPath = resolve(process.cwd(), dbUrl);

// Ensure parent directory exists
mkdirSync(dirname(dbPath), { recursive: true });

logger.info(`[db] Opening SQLite at ${dbPath}`);

const sqlite = new Database(dbPath);
sqlite.pragma('journal_mode = WAL');
sqlite.pragma('foreign_keys = ON');
sqlite.pragma('synchronous = NORMAL');

export const db: BetterSQLite3Database<typeof schema> = drizzle(sqlite, { schema });
export { schema };
export { sqlite };
