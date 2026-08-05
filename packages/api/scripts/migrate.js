/**
 * CARSAI HOST — Database migration runner
 * Corre todos os ficheiros .sql em /migrations por ordem.
 *
 * Uso: node scripts/migrate.js
 */
import Database from 'better-sqlite3';
import { readFileSync, readdirSync, mkdirSync, existsSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

const dbUrl = process.env.DATABASE_URL || './data/carsai.db';
const dbPath = resolve(root, dbUrl);

// Ensure data directory exists
mkdirSync(dirname(dbPath), { recursive: true });

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Create migrations tracking table
db.exec(`
  CREATE TABLE IF NOT EXISTS _migrations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    filename TEXT NOT NULL UNIQUE,
    applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
`);

const migrationsDir = resolve(root, 'migrations');
if (!existsSync(migrationsDir)) {
  console.log(`[migrate] No migrations directory at ${migrationsDir}`);
  console.log('[migrate] Run "pnpm db:generate" first.');
  process.exit(0);
}

const files = readdirSync(migrationsDir)
  .filter((f) => f.endsWith('.sql'))
  .sort();

const applied = db
  .prepare('SELECT filename FROM _migrations')
  .all()
  .map((r) => r.filename);

let count = 0;
for (const file of files) {
  if (applied.includes(file)) continue;

  console.log(`[migrate] applying ${file}...`);
  const sql = readFileSync(join(migrationsDir, file), 'utf8');

  const tx = db.transaction(() => {
    db.exec(sql);
    db.prepare('INSERT INTO _migrations (filename) VALUES (?)').run(file);
  });
  tx();
  count++;
}

console.log(`[migrate] done — ${count} migrations applied.`);
db.close();
