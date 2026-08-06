/**
 * CARSAI HOST — System Settings Service
 *
 * Lê configurações da tabela `settings` (key/value) com fallback para
 * variáveis de ambiente. As credenciais (MOFH, SMTP, OAuth, Storage,
 * SSL, etc.) vivem na base de dados e são editáveis dentro do app
 * (Admin → Settings). O cache em memória é invalidado automaticamente
 * quando uma chave é escrita via `set()` ou `setMany()`.
 *
 * Nota: para credenciais sensíveis, o valor guardado é o plaintext
 * (a base de dados SQLite está em disco protegido pelo SO; em produção
 * recomenda-se encriptação do ficheiro .db com LUKS/bitlocker). O
 * campo `secret=true` marca a chave como sensível para que a API nunca
 * devolva o valor — apenas um placeholder.
 */
import { db, schema } from '../db/index.js';
import { eq } from 'drizzle-orm';
import { env } from '../utils/env.js';
import { logger } from '../utils/logger.js';

// ─── Tipos ────────────────────────────────────────────────────
export interface SettingDef {
  key: string;
  label: string;
  category: 'general' | 'mofh' | 'smtp' | 'oauth' | 'storage' | 'ssl';
  type: 'string' | 'int' | 'bool' | 'password' | 'list';
  /** Fallback env var name (read from process.env). */
  envVar?: string;
  /** Default value when neither DB nor env has it. */
  fallback?: string | number | boolean | string[];
  /** Help text shown in the admin UI. */
  help?: string;
  /** Whether the value should be masked in API responses. */
  secret?: boolean;
}

// ─── Catálogo de settings ─────────────────────────────────────
// Cada chave conhecida é declarada aqui. Isto funciona como um schema
// vivo: adicionar uma setting nova = adicionar uma entrada aqui.
export const SETTING_DEFS: SettingDef[] = [
  // ── General ─────────────────────────────────────────────────
  {
    key: 'general.app_name',
    label: 'App name',
    category: 'general',
    type: 'string',
    envVar: 'APP_NAME',
    fallback: 'CARSAI HOST',
    help: 'Public-facing brand name shown in the header, emails, and SEO tags.',
  },
  {
    key: 'general.app_url',
    label: 'App URL',
    category: 'general',
    type: 'string',
    envVar: 'APP_URL',
    fallback: 'http://localhost:5173',
    help: 'Canonical URL of the frontend (used in emails and OAuth redirects).',
  },
  {
    key: 'general.default_locale',
    label: 'Default locale',
    category: 'general',
    type: 'string',
    envVar: 'DEFAULT_LOCALE',
    fallback: 'pt',
    help: 'Default UI language for new visitors (pt, en, fr, es).',
  },
  {
    key: 'general.support_email',
    label: 'Support email',
    category: 'general',
    type: 'string',
    fallback: 'support@carsai.host',
    help: 'Address shown on the contact page and used for ticket acknowledgements.',
  },

  // ── MOFH ────────────────────────────────────────────────────
  {
    key: 'mofh.api_url',
    label: 'MOFH API URL',
    category: 'mofh',
    type: 'string',
    envVar: 'MOFH_API_URL',
    fallback: 'https://panel.myownfreehost.com/xml-api',
    help: 'XML-RPC endpoint for the My Own Free Hosting reseller panel.',
  },
  {
    key: 'mofh.reseller_username',
    label: 'MOFH reseller username',
    category: 'mofh',
    type: 'string',
    envVar: 'MOFH_RESELLER_USERNAME',
    fallback: '',
    help: 'Your iFastNet/Byet reseller panel username.',
  },
  {
    key: 'mofh.reseller_password',
    label: 'MOFH reseller password',
    category: 'mofh',
    type: 'password',
    envVar: 'MOFH_RESELLER_PASSWORD',
    fallback: '',
    secret: true,
    help: 'Your iFastNet/Byet reseller panel password.',
  },
  {
    key: 'mofh.default_package',
    label: 'Default MOFH package',
    category: 'mofh',
    type: 'string',
    envVar: 'MOFH_DEFAULT_PACKAGE',
    fallback: 'freehosting',
    help: 'Package name passed to MOFH when creating a new hosting account.',
  },
  {
    key: 'mofh.default_domain',
    label: 'Default subdomain parent',
    category: 'mofh',
    type: 'string',
    envVar: 'MOFH_DEFAULT_DOMAIN',
    fallback: 'yoursite.com',
    help: 'Parent domain used when a user picks a free subdomain.',
  },
  {
    key: 'mofh.default_language',
    label: 'Default account language',
    category: 'mofh',
    type: 'string',
    envVar: 'MOFH_DEFAULT_LANGUAGE',
    fallback: 'en',
    help: 'Initial language for newly created cPanel/VistaPanel accounts.',
  },

  // ── SMTP ────────────────────────────────────────────────────
  {
    key: 'smtp.host',
    label: 'SMTP host',
    category: 'smtp',
    type: 'string',
    envVar: 'SMTP_HOST',
    fallback: 'smtp.gmail.com',
  },
  {
    key: 'smtp.port',
    label: 'SMTP port',
    category: 'smtp',
    type: 'int',
    envVar: 'SMTP_PORT',
    fallback: 587,
  },
  {
    key: 'smtp.secure',
    label: 'SMTP secure (TLS)',
    category: 'smtp',
    type: 'bool',
    envVar: 'SMTP_SECURE',
    fallback: false,
  },
  {
    key: 'smtp.user',
    label: 'SMTP username',
    category: 'smtp',
    type: 'string',
    envVar: 'SMTP_USER',
    fallback: '',
  },
  {
    key: 'smtp.pass',
    label: 'SMTP password',
    category: 'smtp',
    type: 'password',
    envVar: 'SMTP_PASS',
    fallback: '',
    secret: true,
  },
  {
    key: 'smtp.from',
    label: 'From address',
    category: 'smtp',
    type: 'string',
    envVar: 'SMTP_FROM',
    fallback: 'CARSAI HOST <noreply@carsai.host>',
  },

  // ── OAuth ───────────────────────────────────────────────────
  {
    key: 'oauth.google.client_id',
    label: 'Google OAuth client ID',
    category: 'oauth',
    type: 'string',
    envVar: 'GOOGLE_CLIENT_ID',
    fallback: '',
  },
  {
    key: 'oauth.google.client_secret',
    label: 'Google OAuth client secret',
    category: 'oauth',
    type: 'password',
    envVar: 'GOOGLE_CLIENT_SECRET',
    fallback: '',
    secret: true,
  },
  {
    key: 'oauth.github.client_id',
    label: 'GitHub OAuth client ID',
    category: 'oauth',
    type: 'string',
    envVar: 'GITHUB_CLIENT_ID',
    fallback: '',
  },
  {
    key: 'oauth.github.client_secret',
    label: 'GitHub OAuth client secret',
    category: 'oauth',
    type: 'password',
    envVar: 'GITHUB_CLIENT_SECRET',
    fallback: '',
    secret: true,
  },

  // ── Storage / Backups ───────────────────────────────────────
  {
    key: 'storage.gdrive.client_id',
    label: 'Google Drive client ID',
    category: 'storage',
    type: 'string',
    fallback: '',
  },
  {
    key: 'storage.gdrive.client_secret',
    label: 'Google Drive client secret',
    category: 'storage',
    type: 'password',
    fallback: '',
    secret: true,
  },
  {
    key: 'storage.gdrive.refresh_token',
    label: 'Google Drive refresh token',
    category: 'storage',
    type: 'password',
    fallback: '',
    secret: true,
  },
  {
    key: 'storage.dropbox.app_key',
    label: 'Dropbox app key',
    category: 'storage',
    type: 'string',
    fallback: '',
  },
  {
    key: 'storage.dropbox.app_secret',
    label: 'Dropbox app secret',
    category: 'storage',
    type: 'password',
    fallback: '',
    secret: true,
  },

  // ── SSL ─────────────────────────────────────────────────────
  {
    key: 'ssl.provider',
    label: 'SSL provider',
    category: 'ssl',
    type: 'string',
    fallback: 'letsencrypt',
    help: 'letsencrypt | zerossl | gogetssl',
  },
  {
    key: 'ssl.zerossl.api_key',
    label: 'ZeroSSL API key',
    category: 'ssl',
    type: 'password',
    fallback: '',
    secret: true,
  },
  {
    key: 'ssl.gogetssl.api_key',
    label: 'GoGetSSL API key',
    category: 'ssl',
    type: 'password',
    fallback: '',
    secret: true,
  },
];

const DEF_BY_KEY = new Map(SETTING_DEFS.map((d) => [d.key, d]));

// ─── Cache ────────────────────────────────────────────────────
let cache: Map<string, string> | null = null;
let cacheLoadedAt = 0;
const CACHE_TTL_MS = 60_000; // 1 minute

async function loadCache(): Promise<Map<string, string>> {
  if (cache && Date.now() - cacheLoadedAt < CACHE_TTL_MS) return cache;
  const rows = db.select().from(schema.settings).all();
  cache = new Map(rows.map((r) => [r.key, r.value]));
  cacheLoadedAt = Date.now();
  return cache;
}

/** Invalidate the in-memory cache. Call after any write. */
export function invalidateSettingsCache(): void {
  cache = null;
  cacheLoadedAt = 0;
  logger.debug('[settings] cache invalidated');
}

// ─── Getters ──────────────────────────────────────────────────
async function readRaw(key: string): Promise<string | undefined> {
  const c = await loadCache();
  if (c.has(key)) return c.get(key);
  const def = DEF_BY_KEY.get(key);
  if (!def) return undefined;
  if (def.envVar && process.env[def.envVar]) return process.env[def.envVar];
  if (def.fallback === undefined) return undefined;
  return String(def.fallback);
}

export async function getString(key: string): Promise<string> {
  const v = await readRaw(key);
  return v ?? '';
}

export async function getInt(key: string): Promise<number> {
  const v = await readRaw(key);
  if (!v) {
    const def = DEF_BY_KEY.get(key);
    return typeof def?.fallback === 'number' ? def.fallback : 0;
  }
  const n = parseInt(v, 10);
  return Number.isNaN(n) ? 0 : n;
}

export async function getBool(key: string): Promise<boolean> {
  const v = await readRaw(key);
  if (!v) {
    const def = DEF_BY_KEY.get(key);
    return def?.fallback === true;
  }
  return v === '1' || v.toLowerCase() === 'true' || v.toLowerCase() === 'yes';
}

export async function getList(key: string): Promise<string[]> {
  const v = await readRaw(key);
  if (!v) return [];
  return v
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Devolve um snapshot de TODAS as settings agrupadas por categoria.
 * Valores marcados como `secret` são mascarados (devolve '••••••••'
 * quando têm conteúdo). Usado pela rota GET /admin/settings.
 */
export async function getAllForAdmin(): Promise<{
  byCategory: Record<string, Array<{
    key: string;
    label: string;
    type: SettingDef['type'];
    value: string;
    secret: boolean;
    help?: string;
    configured: boolean;
  }>>;
}> {
  const c = await loadCache();
  const byCategory: Record<string, Array<any>> = {};
  for (const def of SETTING_DEFS) {
    const raw = c.has(def.key)
      ? c.get(def.key)!
      : def.envVar && process.env[def.envVar]
        ? process.env[def.envVar]!
        : def.fallback !== undefined
          ? String(def.fallback)
          : '';
    const hasValue = Boolean(raw);
    const display =
      def.secret && hasValue
        ? '••••••••'
        : def.secret && !hasValue
          ? ''
          : raw;
    (byCategory[def.category] ??= []).push({
      key: def.key,
      label: def.label,
      type: def.type,
      value: display,
      secret: def.secret ?? false,
      help: def.help,
      configured: hasValue,
    });
  }
  return { byCategory };
}

// ─── Setters ──────────────────────────────────────────────────
/**
 * Escreve uma setting na base de dados. Invalida o cache.
 * Se o valor for uma string vazia e a chave não tiver fallback,
 * remove a linha da base (volta a cair no env/default).
 */
export async function set(key: string, value: string): Promise<void> {
  const def = DEF_BY_KEY.get(key);
  if (!def) {
    throw new Error(`Unknown setting key: ${key}`);
  }
  // Don't accept the masked placeholder as a real value.
  if (def.secret && value === '••••••••') {
    return; // user submitted the masked value unchanged — no-op
  }
  const now = new Date().toISOString();
  if (value === '' && def.fallback === undefined) {
    db.delete(schema.settings).where(eq(schema.settings.key, key)).run();
  } else {
    db.insert(schema.settings)
      .values({ key, value, updatedAt: now })
      .onConflictDoUpdate({
        target: schema.settings.key,
        set: { value, updatedAt: now },
      })
      .run();
  }
  invalidateSettingsCache();
}

export async function setMany(entries: Record<string, string>): Promise<void> {
  for (const [k, v] of Object.entries(entries)) {
    await set(k, v);
  }
}

// ─── Snapshot tipado para serviços ────────────────────────────
/**
 * Devolve um objecto tipado com todas as configs de que um serviço
 * precisa. Mais eficiente que N chamadas getString individuais
 * porque carrega o cache uma única vez.
 */
export async function getMofhConfig() {
  const [apiUrl, username, password, defaultPackage, defaultDomain, defaultLanguage] =
    await Promise.all([
      getString('mofh.api_url'),
      getString('mofh.reseller_username'),
      getString('mofh.reseller_password'),
      getString('mofh.default_package'),
      getString('mofh.default_domain'),
      getString('mofh.default_language'),
    ]);
  return {
    apiUrl,
    username,
    password,
    defaultPackage,
    defaultDomain,
    defaultLanguage,
  };
}

export async function getSmtpConfig() {
  const [host, port, secure, user, pass, from] = await Promise.all([
    getString('smtp.host'),
    getInt('smtp.port'),
    getBool('smtp.secure'),
    getString('smtp.user'),
    getString('smtp.pass'),
    getString('smtp.from'),
  ]);
  return { host, port, secure, user, pass, from };
}

export async function getOAuthConfig() {
  const [googleClientId, googleClientSecret, githubClientId, githubClientSecret] =
    await Promise.all([
      getString('oauth.google.client_id'),
      getString('oauth.google.client_secret'),
      getString('oauth.github.client_id'),
      getString('oauth.github.client_secret'),
    ]);
  return {
    google: { clientId: googleClientId, clientSecret: googleClientSecret },
    github: { clientId: githubClientId, clientSecret: githubClientSecret },
  };
}

export async function getGeneralConfig() {
  const [appName, appUrl, defaultLocale, supportEmail] = await Promise.all([
    getString('general.app_name'),
    getString('general.app_url'),
    getString('general.default_locale'),
    getString('general.support_email'),
  ]);
  return { appName, appUrl, defaultLocale, supportEmail };
}

// Re-export env para backwards compat (serviços que ainda importam env diretamente).
// Novo código deve usar os getters deste módulo.
export { env };
