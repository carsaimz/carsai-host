/**
 * CARSAI HOST — Schemas Zod partilhados
 * Validação client + server com a mesma fonte de verdade.
 */
import { z } from 'zod';

// ─── Auth ──────────────────────────────────────────────────────
export const registerSchema = z
  .object({
    email: z.string().email('Email inválido').max(255),
    username: z
      .string()
      .min(3, 'Mínimo 3 caracteres')
      .max(20, 'Máximo 20 caracteres')
      .regex(/^[a-zA-Z0-9_]+$/, 'Apenas letras, números e _'),
    password: z
      .string()
      .min(8, 'Mínimo 8 caracteres')
      .max(72, 'Máximo 72 caracteres')
      .regex(/[A-Z]/, 'Requer pelo menos 1 maiúscula')
      .regex(/[a-z]/, 'Requer pelo menos 1 minúscula')
      .regex(/[0-9]/, 'Requer pelo menos 1 número'),
    passwordConfirm: z.string(),
    firstName: z.string().max(50).optional(),
    lastName: z.string().max(50).optional(),
    locale: z.enum(['pt', 'en', 'fr', 'es']).default('pt'),
    acceptTerms: z.literal(true, {
      errorMap: () => ({ message: 'Deve aceitar os termos' }),
    }),
  })
  .refine((d) => d.password === d.passwordConfirm, {
    message: 'As palavras-passe não coincidem',
    path: ['passwordConfirm'],
  });

export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'Palavra-passe obrigatória'),
  remember: z.boolean().default(false),
  twoFactorCode: z.string().length(6).optional(),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

export const resetPasswordSchema = z
  .object({
    token: z.string().min(1),
    password: z
      .string()
      .min(8)
      .max(72)
      .regex(/[A-Z]/)
      .regex(/[a-z]/)
      .regex(/[0-9]/),
    passwordConfirm: z.string(),
  })
  .refine((d) => d.password === d.passwordConfirm, {
    message: 'As palavras-passe não coincidem',
    path: ['passwordConfirm'],
  });

export const twoFactorSchema = z.object({
  code: z.string().length(6).regex(/^\d{6}$/),
});

export const enableTwoFactorSchema = z.object({
  secret: z.string().min(1),
  code: z.string().length(6).regex(/^\d{6}$/),
});

// ─── Conta de hospedagem ───────────────────────────────────────
export const createAccountSchema = z.object({
  domain: z
    .string()
    .min(3)
    .max(63)
    .regex(
      /^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?$/,
      'Domínio inválido',
    ),
  subdomain: z.string().optional(),
  customDomain: z
    .string()
    .regex(/^([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}$/)
    .optional(),
  package: z.string().default('freehosting'),
  acceptTos: z.literal(true),
});

export type CreateAccountInput = z.infer<typeof createAccountSchema>;

export const suspendAccountSchema = z.object({
  reason: z.string().min(3).max(500),
});

// ─── Tickets ───────────────────────────────────────────────────
export const createTicketSchema = z.object({
  subject: z.string().min(5).max(120),
  body: z.string().min(10).max(5000),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).default('normal'),
  department: z.enum(['general', 'technical', 'abuse', 'billing']).default('general'),
});

export const replyTicketSchema = z.object({
  body: z.string().min(2).max(5000),
});

// ─── Blog ──────────────────────────────────────────────────────
export const createPostSchema = z.object({
  title: z.string().min(3).max(200),
  excerpt: z.string().max(500).optional(),
  content: z.string().min(10),
  coverImage: z.string().url().optional(),
  category: z.string().min(2).max(50),
  tags: z.array(z.string()).max(10).default([]),
  status: z.enum(['draft', 'published', 'archived']).default('draft'),
});

// ─── Fórum ─────────────────────────────────────────────────────
export const createTopicSchema = z.object({
  categoryId: z.string().min(1),
  title: z.string().min(3).max(200),
  body: z.string().min(10).max(10000),
});

export const createReplySchema = z.object({
  body: z.string().min(2).max(10000),
});

// ─── Domínio / DNS ─────────────────────────────────────────────
export const addDomainSchema = z.object({
  accountId: z.string().min(1),
  domain: z
    .string()
    .min(3)
    .regex(/^([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}$/, 'Domínio inválido'),
  type: z.enum(['subdomain', 'addon', 'parked']).default('addon'),
});

export const dnsRecordSchema = z.object({
  type: z.enum(['A', 'AAAA', 'CNAME', 'MX', 'TXT', 'NS', 'SRV']),
  name: z.string().min(1).max(255),
  value: z.string().min(1).max(1000),
  ttl: z.number().int().min(60).max(86400).default(3600),
  priority: z.number().int().min(0).max(65535).optional(),
});

// ─── SSL ───────────────────────────────────────────────────────
export const issueSslSchema = z.object({
  domainId: z.string().min(1),
  provider: z.enum(['letsencrypt', 'zerossl', 'gogetssl']).default('letsencrypt'),
});

// ─── Cron Job ──────────────────────────────────────────────────
export const createCronJobSchema = z.object({
  accountId: z.string().min(1),
  name: z.string().min(3).max(100),
  command: z.string().min(1).max(500),
  schedule: z
    .string()
    .min(1)
    .max(120)
    .regex(
      /^(@yearly|@monthly|@weekly|@daily|@hourly|(\*|[0-9,\-\/]+)\s+(\*|[0-9,\-\/]+)\s+(\*|[0-9,\-\/]+)\s+(\*|[0-9,\-\/]+)\s+(\*|[0-9,\-\/]+))$/,
      'Expressão cron inválida',
    ),
});

// ─── Perfil ────────────────────────────────────────────────────
export const updateProfileSchema = z.object({
  firstName: z.string().max(50).optional(),
  lastName: z.string().max(50).optional(),
  locale: z.enum(['pt', 'en', 'fr', 'es']).optional(),
  timezone: z.string().max(50).optional(),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1),
    newPassword: z
      .string()
      .min(8)
      .max(72)
      .regex(/[A-Z]/)
      .regex(/[a-z]/)
      .regex(/[0-9]/),
    newPasswordConfirm: z.string(),
  })
  .refine((d) => d.newPassword === d.newPasswordConfirm, {
    message: 'As palavras-passe não coincidem',
    path: ['newPasswordConfirm'],
  });

// ─── Webhook ───────────────────────────────────────────────────
export const createWebhookSchema = z.object({
  url: z.string().url(),
  events: z.array(z.string()).min(1).max(20),
  active: z.boolean().default(true),
});

// ─── API Token ─────────────────────────────────────────────────
export const createApiTokenSchema = z.object({
  name: z.string().min(3).max(50),
  scopes: z.array(z.string()).default([]),
});

// ─── Paginação ─────────────────────────────────────────────────
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sort: z.string().max(50).optional(),
  order: z.enum(['asc', 'desc']).default('desc'),
});

// ─── Contacto ──────────────────────────────────────────────────
export const contactSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  subject: z.string().min(3).max(200),
  message: z.string().min(10).max(5000),
  honeypot: z.string().max(0).optional(), // anti-spam
});

// ─── Installer ─────────────────────────────────────────────────
export const installerSchema = z
  .object({
    siteName: z.string().min(2).max(100).default('CARSAI HOST'),
    adminEmail: z.string().email(),
    adminUsername: z.string().min(3).max(20).regex(/^[a-zA-Z0-9_]+$/),
    adminPassword: z
      .string()
      .min(8)
      .max(72)
      .regex(/[A-Z]/)
      .regex(/[a-z]/)
      .regex(/[0-9]/),
    adminPasswordConfirm: z.string(),
    mofhResellerUser: z.string().min(3).max(50),
    mofhResellerPassword: z.string().min(6).max(100),
    mofhDefaultDomain: z
      .string()
      .min(3)
      .regex(/^([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}$/, 'Domínio inválido'),
    smtpHost: z.string().min(3),
    smtpPort: z.coerce.number().int().min(1).max(65535).default(587),
    smtpUser: z.string().optional(),
    smtpPass: z.string().optional(),
    smtpFrom: z.string().email().optional(),
    // Site settings (used by the installer wizard, persisted to .env).
    defaultLocale: z.enum(['pt', 'en', 'fr', 'es']).default('pt'),
    timezone: z.string().min(1).max(50).default('UTC'),
  })
  .refine((d) => d.adminPassword === d.adminPasswordConfirm, {
    message: 'As palavras-passe não coincidem',
    path: ['adminPasswordConfirm'],
  });

export type InstallerInput = z.infer<typeof installerSchema>;

// ─── Export ────────────────────────────────────────────────────
export * from './index.js';
