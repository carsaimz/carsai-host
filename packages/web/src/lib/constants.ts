/**
 * CARSAI HOST — Re-export do pacote @carsai/shared.
 * Mantem um unico ponto de importacao para o frontend.
 */
export {
  APP_NAME,
  APP_VERSION,
  APP_URL,
  APP_DESCRIPTION,
  SUPPORTED_LOCALES,
  DEFAULT_LOCALE,
  LOCALE_LABELS,
  RATE_LIMITS,
  JWT_DEFAULTS,
  DEFAULT_PACKAGE,
  ACCOUNT_STATUSES,
  UPLOAD_LIMITS,
  TICKET_DEPARTMENTS,
  DEFAULT_CORS_ORIGINS,
  SMTP_DEFAULTS,
  MOFH,
  ROUTES,
  BRAND_COLORS,
} from '@carsai/shared';

export * from '@carsai/shared';

/** URL base da API (lida de VITE_API_URL). */
export const API_BASE_URL =
  (import.meta.env.VITE_API_URL as string | undefined) ?? '/api/v1';

/** Nome da aplicacao (lido de VITE_APP_NAME). */
export const APP_NAME_RUNTIME =
  (import.meta.env.VITE_APP_NAME as string | undefined) ?? 'CARSAI HOST';

/** Locale por defeito (lido de VITE_DEFAULT_LOCALE). */
export const DEFAULT_LOCALE_RUNTIME =
  (import.meta.env.VITE_DEFAULT_LOCALE as string | undefined) ?? 'pt';

/** Endpoints da API (helpers). */
export const ENDPOINTS = {
  // Auth
  auth: {
    register: '/auth/register',
    login: '/auth/login',
    logout: '/auth/logout',
    refresh: '/auth/refresh',
    me: '/auth/me',
    verifyEmail: '/auth/verify-email',
    resendVerification: '/auth/resend-verification',
    forgotPassword: '/auth/forgot-password',
    resetPassword: '/auth/reset-password',
    twoFactor: '/auth/2fa',
    enable2fa: '/auth/2fa/enable',
    disable2fa: '/auth/2fa/disable',
  },
  // Public
  public: {
    info: '/info',
    health: '/health',
    contact: '/contact',
  },
  // Accounts (hosting)
  accounts: {
    list: '/accounts',
    create: '/accounts',
    detail: (id: string) => `/accounts/${id}`,
    suspend: (id: string) => `/accounts/${id}/suspend`,
    unsuspend: (id: string) => `/accounts/${id}/unsuspend`,
    resetPassword: (id: string) => `/accounts/${id}/reset-password`,
    delete: (id: string) => `/accounts/${id}`,
    files: (id: string) => `/accounts/${id}/files`,
    databases: (id: string) => `/accounts/${id}/databases`,
    domains: (id: string) => `/accounts/${id}/domains`,
    backups: (id: string) => `/accounts/${id}/backups`,
    cron: (id: string) => `/accounts/${id}/cron`,
    ssl: (id: string) => `/accounts/${id}/ssl`,
  },
  // Tickets
  tickets: {
    list: '/tickets',
    create: '/tickets',
    detail: (id: string) => `/tickets/${id}`,
    reply: (id: string) => `/tickets/${id}/replies`,
    close: (id: string) => `/tickets/${id}/close`,
  },
  // Blog
  blog: {
    list: '/blog',
    detail: (slug: string) => `/blog/${slug}`,
    create: '/blog',
    update: (slug: string) => `/blog/${slug}`,
    delete: (slug: string) => `/blog/${slug}`,
  },
  // Forum
  forum: {
    categories: '/forum/categories',
    topics: '/forum/topics',
    topic: (id: string) => `/forum/topics/${id}`,
    reply: (id: string) => `/forum/topics/${id}/replies`,
  },
  // User profile
  profile: {
    me: '/auth/me',
    update: '/auth/me',
    changePassword: '/auth/change-password',
    apiTokens: '/auth/api-tokens',
  },
  // Admin
  admin: {
    stats: '/admin/stats',
    users: '/admin/users',
    accounts: '/admin/accounts',
    tickets: '/admin/tickets',
    blog: '/admin/blog',
    forum: '/admin/forum',
    settings: '/admin/settings',
  },
} as const;
