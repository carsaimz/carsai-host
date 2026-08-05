/**
 * CARSAI HOST — Constantes partilhadas
 */

export const APP_NAME = 'CARSAI HOST';
export const APP_VERSION = '1.0.0';
export const APP_URL = 'https://carsai.host';
export const APP_DESCRIPTION =
  'Plataforma de hospedagem web 100% gratuita com iFastNet (Byet) + MOFH.';

export const SUPPORTED_LOCALES = ['pt', 'en', 'fr', 'es'] as const;
export const DEFAULT_LOCALE = 'pt' as const;

export const LOCALE_LABELS: Record<string, { label: string; flag: string }> = {
  pt: { label: 'Português', flag: '🇵🇹' },
  en: { label: 'English', flag: '🇬🇧' },
  fr: { label: 'Français', flag: '🇫🇷' },
  es: { label: 'Español', flag: '🇪🇸' },
};

// ─── Rate limits ───────────────────────────────────────────────
export const RATE_LIMITS = {
  GLOBAL: { windowMs: 15 * 60 * 1000, max: 100 },
  AUTH: { windowMs: 15 * 60 * 1000, max: 5 },
  REGISTER: { windowMs: 60 * 60 * 1000, max: 3 },
  API: { windowMs: 60 * 1000, max: 60 },
} as const;

// ─── Tokens JWT ────────────────────────────────────────────────
export const JWT_DEFAULTS = {
  ACCESS_EXPIRES_IN: '15m',
  REFRESH_EXPIRES_IN: '7d',
  ISSUER: 'carsai-host',
  AUDIENCE: 'carsai-host-users',
} as const;

// ─── Planos de hospedagem (apenas 1 — 100% gratuito) ───────────
// Nota: NÃO existem planos pagos. Este é apenas o "package" MOFH.
export const DEFAULT_PACKAGE = 'freehosting' as const;

// ─── Tipos de conta ────────────────────────────────────────────
export const ACCOUNT_STATUSES = [
  'creating',
  'active',
  'suspended',
  'terminated',
  'failed',
] as const;

// ─── Limites de upload ─────────────────────────────────────────
export const UPLOAD_LIMITS = {
  MAX_FILE_SIZE_MB: 100,
  MAX_AVATAR_SIZE_MB: 2,
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  ALLOWED_FILE_TYPES: [
    'image/*',
    'text/*',
    'application/pdf',
    'application/zip',
    'application/x-tar',
    'application/gzip',
  ],
} as const;

// ─── Departamentos de suporte ──────────────────────────────────
export const TICKET_DEPARTMENTS = [
  'general',
  'technical',
  'abuse',
  'billing',
] as const;

// ─── CORS ──────────────────────────────────────────────────────
export const DEFAULT_CORS_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:4173',
  'http://localhost:3000',
];

// ─── SMTP defaults ─────────────────────────────────────────────
export const SMTP_DEFAULTS = {
  HOST: 'smtp.gmail.com',
  PORT: 587,
  SECURE: false,
} as const;

// ─── MOFH ──────────────────────────────────────────────────────
export const MOFH = {
  DEFAULT_API_URL: 'https://panel.myownfreehost.com/xml-api',
  DEFAULT_PACKAGE: 'freehosting',
  DEFAULT_LANGUAGE: 'en',
  ACCOUNT_USERNAME_LENGTH: 8,
} as const;

// ─── Rotas da aplicação ────────────────────────────────────────
export const ROUTES = {
  // Public
  HOME: '/',
  FEATURES: '/features',
  ABOUT: '/about',
  BLOG: '/blog',
  FORUM: '/forum',
  CONTACT: '/contact',
  LOGIN: '/login',
  REGISTER: '/register',
  TERMS: '/terms',
  PRIVACY: '/privacy',
  // Dashboard
  DASHBOARD: '/dashboard',
  DASHBOARD_ACCOUNTS: '/dashboard/accounts',
  DASHBOARD_FILES: '/dashboard/files',
  DASHBOARD_DATABASES: '/dashboard/databases',
  DASHBOARD_DOMAINS: '/dashboard/domains',
  DASHBOARD_SSL: '/dashboard/ssl',
  DASHBOARD_BACKUPS: '/dashboard/backups',
  DASHBOARD_CRON: '/dashboard/cron',
  DASHBOARD_TICKETS: '/dashboard/tickets',
  DASHBOARD_SETTINGS: '/dashboard/settings',
  DASHBOARD_API: '/dashboard/api',
  DASHBOARD_PROFILE: '/dashboard/profile',
  // Admin
  ADMIN: '/admin',
  ADMIN_USERS: '/admin/users',
  ADMIN_ACCOUNTS: '/admin/accounts',
  ADMIN_TICKETS: '/admin/tickets',
  ADMIN_BLOG: '/admin/blog',
  ADMIN_FORUM: '/admin/forum',
  ADMIN_SETTINGS: '/admin/settings',
} as const;

// ─── Cores da marca (Xera-inspired) ────────────────────────────
export const BRAND_COLORS = {
  primary: '#2563eb',    // blue-600
  primaryDark: '#1e40af',// blue-800
  accent: '#06b6d4',     // cyan-500
  success: '#16a34a',    // green-600
  warning: '#d97706',    // amber-600
  danger: '#dc2626',     // red-600
  bg: '#0f172a',         // slate-900 (dark theme)
  bgAlt: '#1e293b',      // slate-800
  text: '#f1f5f9',       // slate-100
  textMuted: '#94a3b8',  // slate-400
  border: '#334155',     // slate-700
} as const;
