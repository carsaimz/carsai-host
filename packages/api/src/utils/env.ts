/**
 * CARSAI HOST — Environment configuration
 * Carrega e valida variáveis de ambiente.
 */
import { config as dotenvConfig } from 'dotenv';
import { resolve } from 'node:path';

dotenvConfig({ path: resolve(process.cwd(), '.env') });

function required(key: string, fallback?: string): string {
  const v = process.env[key] ?? fallback;
  if (!v) {
    throw new Error(`[env] Missing required environment variable: ${key}`);
  }
  return v;
}

function optional(key: string, fallback = ''): string {
  return process.env[key] ?? fallback;
}

function int(key: string, fallback: number): number {
  const v = process.env[key];
  if (!v) return fallback;
  const n = parseInt(v, 10);
  return Number.isNaN(n) ? fallback : n;
}

function bool(key: string, fallback = false): boolean {
  const v = process.env[key];
  if (!v) return fallback;
  return v === '1' || v.toLowerCase() === 'true' || v.toLowerCase() === 'yes';
}

function list(key: string, fallback: string[] = []): string[] {
  const v = process.env[key];
  if (!v) return fallback;
  return v
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

export const env = {
  nodeEnv: optional('NODE_ENV', 'development'),
  isProd: optional('NODE_ENV', 'development') === 'production',
  isDev: optional('NODE_ENV', 'development') === 'development',
  port: int('PORT', 3000),

  appUrl: optional('APP_URL', 'http://localhost:5173'),
  apiUrl: optional('API_URL', 'http://localhost:3000'),
  appName: optional('APP_NAME', 'CARSAI HOST'),

  databaseUrl: optional('DATABASE_URL', './data/carsai.db'),

  jwt: {
    secret: required('JWT_SECRET', 'dev-secret-change-me-in-production-' + 'x'.repeat(40)),
    refreshSecret: required(
      'JWT_REFRESH_SECRET',
      'dev-refresh-secret-change-me-' + 'x'.repeat(40),
    ),
    expiresIn: optional('JWT_EXPIRES_IN', '15m'),
    refreshExpiresIn: optional('JWT_REFRESH_EXPIRES_IN', '7d'),
    issuer: optional('JWT_ISSUER', 'carsai-host'),
    audience: optional('JWT_AUDIENCE', 'carsai-host-users'),
  },

  mofh: {
    apiUrl: optional('MOFH_API_URL', 'https://panel.myownfreehost.com/xml-api'),
    resellerUsername: optional('MOFH_RESELLER_USERNAME', ''),
    resellerPassword: optional('MOFH_RESELLER_PASSWORD', ''),
    defaultPackage: optional('MOFH_DEFAULT_PACKAGE', 'freehosting'),
    defaultDomain: optional('MOFH_DEFAULT_DOMAIN', 'yoursite.com'),
    defaultLanguage: optional('MOFH_DEFAULT_LANGUAGE', 'en'),
  },

  smtp: {
    host: optional('SMTP_HOST', 'smtp.gmail.com'),
    port: int('SMTP_PORT', 587),
    secure: bool('SMTP_SECURE', false),
    user: optional('SMTP_USER'),
    pass: optional('SMTP_PASS'),
    from: optional('SMTP_FROM', 'CARSAI HOST <noreply@carsai.host>'),
  },

  oauth: {
    google: {
      clientId: optional('GOOGLE_CLIENT_ID'),
      clientSecret: optional('GOOGLE_CLIENT_SECRET'),
    },
    github: {
      clientId: optional('GITHUB_CLIENT_ID'),
      clientSecret: optional('GITHUB_CLIENT_SECRET'),
    },
  },

  cors: {
    origins: list('CORS_ORIGINS', [
      'http://localhost:5173',
      'http://localhost:4173',
    ]),
  },

  rateLimit: {
    globalWindowMs: int('RATE_LIMIT_GLOBAL_WINDOW_MS', 15 * 60 * 1000),
    globalMax: int('RATE_LIMIT_GLOBAL_MAX', 100),
    authWindowMs: int('RATE_LIMIT_AUTH_WINDOW_MS', 15 * 60 * 1000),
    authMax: int('RATE_LIMIT_AUTH_MAX', 5),
  },

  redis: {
    url: optional('REDIS_URL', 'redis://localhost:6379'),
  },

  log: {
    level: optional('LOG_LEVEL', 'info'),
    dir: optional('LOG_DIR', './logs'),
  },

  installedLockfile: optional('INSTALLED_LOCKFILE', './data/.installed'),
} as const;

export type Env = typeof env;
