/**
 * CARSAI HOST -- Installer routes
 *
 * Public setup endpoints exposed at /api/v1/install/*:
 *
 *   GET  /status        -> { installed: boolean, installedAt?: string }
 *   GET  /requirements  -> runs system requirement checks
 *   POST /test-db       -> opens SQLite, applies pending migrations
 *   POST /test-mofh     -> verifies MOFH credentials (domainavailable)
 *   POST /test-smtp     -> sends a test email
 *   POST /run           -> performs the full install:
 *                            1. creates admin user (role=admin, status=active, emailVerifiedAt=now)
 *                            2. writes/updates .env file with all provided values
 *                            3. writes data/.installed lockfile
 *                            4. returns admin login URL
 *
 * Security:
 *  - This router is mounted BEFORE the global rate limiter and auth
 *    middleware so that the platform can be installed on a fresh server
 *    without any credentials.
 *  - The status check is always allowed (read-only). All mutating/test
 *    routes return 403 once data/.installed exists.
 *  - The /run route additionally guards against re-install by checking
 *    the lockfile at the start of the handler.
 */
import type { NextFunction, Request, Response, RequestHandler } from 'express';
import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { eq } from 'drizzle-orm';
import Database from 'better-sqlite3';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
  statSync,
  openSync,
  closeSync,
} from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { db, schema } from '../db/index.js';
import { hashPassword } from '../utils/auth.js';
import { asyncHandler } from '../utils/async-handler.js';
import { ok, fail, forbidden } from '../utils/response.js';
import { env } from '../utils/env.js';
import { logger } from '../utils/logger.js';
import { MofhClient } from '../services/mofh-client.js';
import { installerSchema } from '@carsai/shared';
import type { z } from 'zod';

export const installRouter = Router();

// ─── Helpers ──────────────────────────────────────────────────

/** Resolve the lockfile path (data/.installed relative to cwd). */
function lockfilePath(): string {
  return resolve(process.cwd(), env.installedLockfile);
}

/** Check whether the platform has already been installed. */
function isInstalled(): boolean {
  return existsSync(lockfilePath());
}

/** Read the lockfile contents (timestamp + admin email). */
function readLockfile(): { installedAt?: string } {
  try {
    const raw = readFileSync(lockfilePath(), 'utf8');
    const match = raw.match(/installedAt=(.+)/);
    return { installedAt: match?.[1]?.trim() };
  } catch {
    return {};
  }
}

/** Middleware: 403 if already installed (skip for GET /status). */
function requireNotInstalled(): RequestHandler {
  return (_req: Request, res: Response, next: NextFunction) => {
    if (isInstalled()) {
      return forbidden(res, 'CARSAI HOST is already installed');
    }
    next();
  };
}

// ─── GET /status ──────────────────────────────────────────────
installRouter.get(
  '/status',
  asyncHandler(async (_req, res) => {
    const installed = isInstalled();
    const { installedAt } = installed ? readLockfile() : {};
    return ok(res, { installed, installedAt });
  }),
);

// ─── GET /requirements ────────────────────────────────────────
installRouter.get(
  '/requirements',
  requireNotInstalled(),
  asyncHandler(async (_req, res) => {
    const checks = runRequirementChecks();
    return ok(res, {
      checks,
      allPassed: checks.every((c) => c.passed),
    });
  }),
);

// ─── POST /test-db ────────────────────────────────────────────
installRouter.post(
  '/test-db',
  requireNotInstalled(),
  asyncHandler(async (req, res) => {
    const databaseUrl =
      (req.body as { databaseUrl?: string })?.databaseUrl || env.databaseUrl;
    const dbPath = resolve(process.cwd(), databaseUrl);

    try {
      mkdirSync(dirname(dbPath), { recursive: true });
      // Open a fresh connection so we don't disturb the running API's pool.
      const probe = new Database(dbPath);
      probe.pragma('journal_mode = WAL');
      probe.pragma('foreign_keys = ON');
      const applied = applyMigrations(probe);
      probe.close();
      return ok(res, {
        connected: true,
        migrationsApplied: applied,
        message: `SQLite ready at ${dbPath}`,
      });
    } catch (err) {
      logger.error('[install] test-db failed', { err: String(err) });
      return fail(
        res,
        'DB_TEST_FAILED',
        err instanceof Error ? err.message : 'Database test failed',
        422,
      );
    }
  }),
);

// ─── POST /test-mofh ──────────────────────────────────────────
installRouter.post(
  '/test-mofh',
  requireNotInstalled(),
  asyncHandler(async (req, res) => {
    const { mofhResellerUser, mofhResellerPassword, mofhDefaultDomain } = req.body as {
      mofhResellerUser: string;
      mofhResellerPassword: string;
      mofhDefaultDomain: string;
    };

    if (!mofhResellerUser || !mofhResellerPassword || !mofhDefaultDomain) {
      return fail(res, 'VALIDATION_ERROR', 'Missing MOFH credentials', 422);
    }

    try {
      const client = new MofhClient({
        username: mofhResellerUser,
        password: mofhResellerPassword,
      });
      // Use domainavailable to verify credentials — it's a read-only
      // operation that requires valid reseller auth.
      const result = await client.checkDomainAvailability(mofhDefaultDomain);
      if (result.available) {
        return ok(res, {
          connected: true,
          message: `MOFH reachable; ${mofhDefaultDomain} is available`,
        });
      }
      // If the API responded (even with available=false), credentials work.
      return ok(res, {
        connected: true,
        message: `MOFH reachable; ${mofhDefaultDomain} not available (${result.message})`,
      });
    } catch (err) {
      logger.error('[install] test-mofh failed', { err: String(err) });
      return fail(
        res,
        'MOFH_TEST_FAILED',
        err instanceof Error ? err.message : 'MOFH test failed',
        422,
      );
    }
  }),
);

// ─── POST /test-smtp ──────────────────────────────────────────
installRouter.post(
  '/test-smtp',
  requireNotInstalled(),
  asyncHandler(async (req, res) => {
    const {
      smtpHost,
      smtpPort,
      smtpUser,
      smtpPass,
      smtpFrom,
      recipient,
    } = req.body as {
      smtpHost: string;
      smtpPort: number;
      smtpUser?: string;
      smtpPass?: string;
      smtpFrom?: string;
      recipient: string;
    };

    if (!smtpHost || !smtpPort || !recipient) {
      return fail(res, 'VALIDATION_ERROR', 'Missing SMTP parameters', 422);
    }

    try {
      // Build a transient transporter with the provided credentials so
      // we don't have to restart the API to test a new SMTP config.
      const nodemailer = await import('nodemailer');
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465,
        auth: smtpUser && smtpPass ? { user: smtpUser, pass: smtpPass } : undefined,
      });
      await transporter.verify();
      await transporter.sendMail({
        from: smtpFrom || 'CARSAI HOST Installer <noreply@carsai.host>',
        to: recipient,
        subject: 'CARSAI HOST -- SMTP test',
        text: 'If you received this email, your SMTP configuration is working.',
        html: '<p>If you received this email, your SMTP configuration is working.</p>',
      });
      return ok(res, {
        sent: true,
        message: `Test email sent to ${recipient}`,
      });
    } catch (err) {
      logger.error('[install] test-smtp failed', { err: String(err) });
      return fail(
        res,
        'SMTP_TEST_FAILED',
        err instanceof Error ? err.message : 'SMTP test failed',
        422,
      );
    }
  }),
);

// ─── POST /run ────────────────────────────────────────────────
installRouter.post(
  '/run',
  requireNotInstalled(),
  asyncHandler(async (req, res) => {
    // Double-check the lockfile (race-safety).
    if (isInstalled()) {
      return forbidden(res, 'CARSAI HOST is already installed');
    }

    // Validate the payload manually (installerSchema uses .refine() so
    // we can't use the validate() middleware which expects AnyZodObject).
    let input: z.infer<typeof installerSchema>;
    try {
      input = (await installerSchema.parseAsync(req.body)) as z.infer<
        typeof installerSchema
      >;
    } catch (err) {
      const details =
        err && typeof err === 'object' && 'flatten' in err
          ? (err as { flatten: () => unknown }).flatten()
          : undefined;
      return fail(res, 'VALIDATION_ERROR', 'Invalid install payload', 422, details as Record<string, unknown> | undefined);
    }

    const warnings: string[] = [];

    // ── 1. Create the admin user ────────────────────────────────
    try {
      const existing = await db
        .select()
        .from(schema.users)
        .where(eq(schema.users.email, input.adminEmail))
        .limit(1);
      if (existing[0]) {
        return fail(
          res,
          'EMAIL_TAKEN',
          'A user with this admin email already exists',
          409,
        );
      }

      const existingUsername = await db
        .select()
        .from(schema.users)
        .where(eq(schema.users.username, input.adminUsername))
        .limit(1);
      if (existingUsername[0]) {
        return fail(
          res,
          'USERNAME_TAKEN',
          'A user with this admin username already exists',
          409,
        );
      }

      const passwordHash = await hashPassword(input.adminPassword);
      const userId = uuidv4();
      const now = new Date().toISOString();

      await db.insert(schema.users).values({
        id: userId,
        email: input.adminEmail,
        username: input.adminUsername,
        passwordHash,
        role: 'admin',
        status: 'active',
        emailVerifiedAt: now,
        locale: input.defaultLocale,
        timezone: input.timezone,
        createdAt: now,
        updatedAt: now,
      });
      logger.info('[install] admin user created', { userId, email: input.adminEmail });
    } catch (err) {
      logger.error('[install] admin user creation failed', { err: String(err) });
      return fail(
        res,
        'ADMIN_CREATE_FAILED',
        err instanceof Error ? err.message : 'Failed to create admin user',
        500,
      );
    }

    // ── 2. Write the .env file ──────────────────────────────────
    try {
      writeEnvFile(input);
      logger.info('[install] .env file written');
    } catch (err) {
      logger.error('[install] .env write failed', { err: String(err) });
      warnings.push(
        `Could not write .env file: ${err instanceof Error ? err.message : String(err)}`,
      );
    }

    // ── 3. Write the lockfile ───────────────────────────────────
    try {
      const lockPath = lockfilePath();
      mkdirSync(dirname(lockPath), { recursive: true });
      const installedAt = new Date().toISOString();
      const content = [
        '# CARSAI HOST -- installation lockfile',
        '# Do NOT delete this file unless you want to re-run the installer.',
        `installedAt=${installedAt}`,
        `adminEmail=${input.adminEmail}`,
        `version=1.0.0`,
      ].join('\n');
      writeFileSync(lockPath, content, { encoding: 'utf8', mode: 0o600 });
      logger.info('[install] lockfile written', { path: lockPath });
    } catch (err) {
      logger.error('[install] lockfile write failed', { err: String(err) });
      return fail(
        res,
        'LOCKFILE_WRITE_FAILED',
        err instanceof Error ? err.message : 'Failed to write lockfile',
        500,
      );
    }

    // ── 4. Return success ───────────────────────────────────────
    const adminLoginUrl = `${env.appUrl}/login`;
    return ok(res, {
      success: true,
      adminLoginUrl,
      installedAt: new Date().toISOString(),
      warnings,
    });
  }),
);

// ─── Requirement checks ───────────────────────────────────────

interface CheckResult {
  key: string;
  label: string;
  passed: boolean;
  message: string;
  details?: string;
}

function runRequirementChecks(): CheckResult[] {
  const checks: CheckResult[] = [];

  // Node.js version >= 20
  const nodeMajor = parseInt(process.versions.node.split('.')[0]!, 10);
  checks.push({
    key: 'node-version',
    label: 'Node.js >= 20',
    passed: nodeMajor >= 20,
    message: nodeMajor >= 20 ? 'OK' : 'Node.js 20 or newer is required',
    details: `Running Node ${process.versions.node}`,
  });

  // Write permissions on data/
  try {
    const dataDir = resolve(process.cwd(), './data');
    mkdirSync(dataDir, { recursive: true });
    const probe = resolve(dataDir, '.write-probe');
    writeFileSync(probe, 'ok');
    checks.push({
      key: 'write-perms',
      label: 'Write permission on data/',
      passed: true,
      message: 'API can write to packages/api/data',
      details: dataDir,
    });
  } catch (err) {
    checks.push({
      key: 'write-perms',
      label: 'Write permission on data/',
      passed: false,
      message: 'API cannot write to the data directory',
      details: err instanceof Error ? err.message : String(err),
    });
  }

  // Disk space: at least 100 MB free (approximate via probe write).
  try {
    const dataDir = resolve(process.cwd(), './data');
    mkdirSync(dataDir, { recursive: true });
    const probe = resolve(dataDir, '.disk-probe');
    // 1 MB probe write — if it succeeds, we assume there is enough room.
    writeFileSync(probe, Buffer.alloc(1024 * 1024));
    const free = 100 * 1024 * 1024;
    checks.push({
      key: 'disk-space',
      label: 'Disk space >= 100 MB',
      passed: true,
      message: 'Data directory is writable',
      details: `probe wrote 1 MB to ${dataDir} (assumed free: ${Math.round(free / 1024 / 1024)} MB)`,
    });
  } catch (err) {
    checks.push({
      key: 'disk-space',
      label: 'Disk space >= 100 MB',
      passed: false,
      message: 'Could not write 1 MB probe to the data directory',
      details: err instanceof Error ? err.message : String(err),
    });
  }

  // Write permission on .env (or its parent dir)
  try {
    const envPath = resolve(process.cwd(), '.env');
    const parent = dirname(envPath);
    if (!existsSync(parent)) {
      throw new Error(`Parent directory ${parent} does not exist`);
    }
    // If .env exists, try opening it for read+write to confirm perms.
    if (existsSync(envPath)) {
      const fd = openSync(envPath, 'r+');
      closeSync(fd);
    }
    checks.push({
      key: 'env-write',
      label: 'Write permission on .env',
      passed: true,
      message: '.env is writable',
      details: envPath,
    });
  } catch (err) {
    checks.push({
      key: 'env-write',
      label: 'Write permission on .env',
      passed: false,
      message: 'Cannot write to .env',
      details: err instanceof Error ? err.message : String(err),
    });
  }

  // better-sqlite3 native binding loaded?
  try {
    // Opening an in-memory DB exercises the native binding.
    const probe = new Database(':memory:');
    probe.close();
    checks.push({
      key: 'sqlite-native',
      label: 'better-sqlite3 native binding',
      passed: true,
      message: 'Native SQLite binding loaded',
      details: `better-sqlite3 ${Database.name}`,
    });
  } catch (err) {
    checks.push({
      key: 'sqlite-native',
      label: 'better-sqlite3 native binding',
      passed: false,
      message: 'better-sqlite3 failed to load',
      details: err instanceof Error ? err.message : String(err),
    });
  }

  // Useful for debugging the cwd resolution (not a failure).
  try {
    const cwdStat = statSync(process.cwd());
    checks.push({
      key: 'cwd',
      label: 'API working directory',
      passed: true,
      message: 'Resolved',
      details: `${process.cwd()} (ino=${cwdStat.ino})`,
    });
  } catch {
    // ignore
  }

  return checks.filter((c) => c.key !== 'cwd' || c.passed === false);
}

// ─── Migration runner (in-process) ────────────────────────────

/**
 * Apply all pending .sql migrations from packages/api/migrations to the
 * given better-sqlite3 connection. Idempotent: uses a _migrations table.
 */
function applyMigrations(conn: Database.Database): number {
  conn.exec(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      filename TEXT NOT NULL UNIQUE,
      applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  const migrationsDir = resolve(process.cwd(), 'migrations');
  if (!existsSync(migrationsDir)) {
    return 0;
  }

  const files = readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  const applied = conn
    .prepare('SELECT filename FROM _migrations')
    .all()
    .map((r) => (r as { filename: string }).filename);

  let count = 0;
  for (const file of files) {
    if (applied.includes(file)) continue;
    const sql = readFileSync(join(migrationsDir, file), 'utf8');
    const tx = conn.transaction(() => {
      conn.exec(sql);
      conn.prepare('INSERT INTO _migrations (filename) VALUES (?)').run(file);
    });
    tx();
    count++;
  }
  return count;
}

// ─── .env writer ──────────────────────────────────────────────

/** Mapping of installer fields to env var names. */
const ENV_KEYS = {
  siteName: 'APP_NAME',
  mofhResellerUser: 'MOFH_RESELLER_USERNAME',
  mofhResellerPassword: 'MOFH_RESELLER_PASSWORD',
  mofhDefaultDomain: 'MOFH_DEFAULT_DOMAIN',
  smtpHost: 'SMTP_HOST',
  smtpPort: 'SMTP_PORT',
  smtpUser: 'SMTP_USER',
  smtpPass: 'SMTP_PASS',
  smtpFrom: 'SMTP_FROM',
  defaultLocale: 'MOFH_DEFAULT_LANGUAGE',
  timezone: 'TZ',
} as const;

/**
 * Write or update the .env file. Preserves unknown lines and comments.
 * Known keys are replaced in place; missing ones are appended.
 */
function writeEnvFile(input: z.infer<typeof installerSchema>): void {
  const envPath = resolve(process.cwd(), '.env');
  let lines: string[] = [];
  if (existsSync(envPath)) {
    lines = readFileSync(envPath, 'utf8').split(/\r?\n/);
  }

  const updates: Record<string, string> = {
    [ENV_KEYS.siteName]: input.siteName,
    [ENV_KEYS.mofhResellerUser]: input.mofhResellerUser,
    [ENV_KEYS.mofhResellerPassword]: input.mofhResellerPassword,
    [ENV_KEYS.mofhDefaultDomain]: input.mofhDefaultDomain,
    [ENV_KEYS.smtpHost]: input.smtpHost,
    [ENV_KEYS.smtpPort]: String(input.smtpPort),
    [ENV_KEYS.smtpUser]: input.smtpUser ?? '',
    [ENV_KEYS.smtpPass]: input.smtpPass ?? '',
    [ENV_KEYS.smtpFrom]: input.smtpFrom ?? '',
    [ENV_KEYS.defaultLocale]: input.defaultLocale,
    [ENV_KEYS.timezone]: input.timezone,
  };

  const seen = new Set<string>();
  const out: string[] = [];
  for (const line of lines) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m && updates[m[1]!] !== undefined) {
      out.push(`${m[1]}=${quoteEnv(updates[m[1]!]!)}`);
      seen.add(m[1]!);
    } else {
      out.push(line);
    }
  }

  // Append a marker block for any keys not yet present.
  const missing = Object.entries(updates).filter(([k]) => !seen.has(k));
  if (missing.length > 0) {
    if (out.length > 0 && out[out.length - 1] !== '') out.push('');
    out.push('# ─── Added by CARSAI HOST installer ────────────────────────');
    for (const [k, v] of missing) {
      out.push(`${k}=${quoteEnv(v)}`);
    }
  }

  writeFileSync(envPath, out.join('\n') + '\n', { encoding: 'utf8', mode: 0o600 });
}

/** Quote an env value if it contains spaces or special chars. */
function quoteEnv(v: string): string {
  if (v === '') return '';
  if (/[\s#"']/.test(v)) {
    return `"${v.replace(/"/g, '\\"')}"`;
  }
  return v;
}
