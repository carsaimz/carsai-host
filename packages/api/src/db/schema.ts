/**
 * CARSAI HOST — Drizzle ORM schema (SQLite)
 * Esquema REAL da base de dados — todas as tabelas necessárias.
 */
import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

// ─── Users ─────────────────────────────────────────────────────
export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  username: text('username').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  firstName: text('first_name'),
  lastName: text('last_name'),
  role: text('role', { enum: ['user', 'admin', 'moderator'] })
    .notNull()
    .default('user'),
  status: text('status', { enum: ['active', 'suspended', 'banned', 'pending'] })
    .notNull()
    .default('pending'),
  emailVerifiedAt: text('email_verified_at'),
  emailVerifyToken: text('email_verify_token'),
  twoFactorSecret: text('two_factor_secret'),
  twoFactorEnabled: integer('two_factor_enabled', { mode: 'boolean' })
    .notNull()
    .default(false),
  twoFactorBackupCodes: text('two_factor_backup_codes'), // JSON array
  avatarUrl: text('avatar_url'),
  locale: text('locale').notNull().default('pt'),
  timezone: text('timezone'),
  oauthProvider: text('oauth_provider', { enum: ['google', 'github'] }),
  oauthId: text('oauth_id'),
  lastLoginAt: text('last_login_at'),
  lastLoginIp: text('last_login_ip'),
  createdAt: text('created_at')
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at')
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

// ─── Refresh tokens (rotation) ─────────────────────────────────
export const refreshTokens = sqliteTable('refresh_tokens', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  token: text('token').notNull().unique(),
  family: text('family').notNull(), // for rotation detection
  expiresAt: text('expires_at').notNull(),
  revokedAt: text('revoked_at'),
  replacedBy: text('replaced_by'),
  createdAt: text('created_at')
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

// ─── Password resets ───────────────────────────────────────────
export const passwordResets = sqliteTable('password_resets', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  token: text('token').notNull().unique(),
  expiresAt: text('expires_at').notNull(),
  usedAt: text('used_at'),
  createdAt: text('created_at')
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

// ─── Hosting accounts (MOFH) ───────────────────────────────────
export const hostingAccounts = sqliteTable('hosting_accounts', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  domain: text('domain').notNull(),
  username: text('username').notNull(), // cPanel/VistaPanel username
  passwordEncrypted: text('password_encrypted'), // FTP password (encrypted)
  status: text('status', {
    enum: ['creating', 'active', 'suspended', 'terminated', 'failed'],
  })
    .notNull()
    .default('creating'),
  packageName: text('package_name').notNull().default('freehosting'),
  serverIp: text('server_ip'),
  nameservers: text('nameservers'), // JSON array
  cpanelUrl: text('cpanel_url'),
  ftpHost: text('ftp_host'),
  mysqlHost: text('mysql_host'),
  mofhRef: text('mofh_ref'),
  suspensionReason: text('suspension_reason'),
  suspendedAt: text('suspended_at'),
  createdAt: text('created_at')
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at')
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

// ─── Domains ───────────────────────────────────────────────────
export const domains = sqliteTable('domains', {
  id: text('id').primaryKey(),
  accountId: text('account_id')
    .notNull()
    .references(() => hostingAccounts.id, { onDelete: 'cascade' }),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  domain: text('domain').notNull(),
  type: text('type', { enum: ['subdomain', 'addon', 'parked'] })
    .notNull()
    .default('addon'),
  status: text('status', { enum: ['pending', 'active', 'inactive'] })
    .notNull()
    .default('pending'),
  sslIssued: integer('ssl_ssl_issued', { mode: 'boolean' }).default(false),
  sslExpiresAt: text('ssl_expires_at'),
  createdAt: text('created_at')
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

// ─── DNS records ───────────────────────────────────────────────
export const dnsRecords = sqliteTable('dns_records', {
  id: text('id').primaryKey(),
  domainId: text('domain_id')
    .notNull()
    .references(() => domains.id, { onDelete: 'cascade' }),
  type: text('type', {
    enum: ['A', 'AAAA', 'CNAME', 'MX', 'TXT', 'NS', 'SRV'],
  }).notNull(),
  name: text('name').notNull(),
  value: text('value').notNull(),
  ttl: integer('ttl').notNull().default(3600),
  priority: integer('priority'),
  createdAt: text('created_at')
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

// ─── Tickets ───────────────────────────────────────────────────
export const tickets = sqliteTable('tickets', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  subject: text('subject').notNull(),
  body: text('body').notNull(),
  status: text('status', {
    enum: ['open', 'pending', 'resolved', 'closed'],
  })
    .notNull()
    .default('open'),
  priority: text('priority', {
    enum: ['low', 'normal', 'high', 'urgent'],
  })
    .notNull()
    .default('normal'),
  department: text('department', {
    enum: ['general', 'technical', 'abuse', 'billing'],
  })
    .notNull()
    .default('general'),
  assignedTo: text('assigned_to').references(() => users.id),
  closedAt: text('closed_at'),
  createdAt: text('created_at')
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at')
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

export const ticketReplies = sqliteTable('ticket_replies', {
  id: text('id').primaryKey(),
  ticketId: text('ticket_id')
    .notNull()
    .references(() => tickets.id, { onDelete: 'cascade' }),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  body: text('body').notNull(),
  isStaff: integer('is_staff', { mode: 'boolean' }).notNull().default(false),
  createdAt: text('created_at')
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

// ─── Blog ──────────────────────────────────────────────────────
export const blogPosts = sqliteTable('blog_posts', {
  id: text('id').primaryKey(),
  slug: text('slug').notNull().unique(),
  title: text('title').notNull(),
  excerpt: text('excerpt'),
  content: text('content').notNull(), // markdown
  coverImage: text('cover_image'),
  authorId: text('author_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  category: text('category').notNull().default('general'),
  tags: text('tags'), // JSON array
  status: text('status', { enum: ['draft', 'published', 'archived'] })
    .notNull()
    .default('draft'),
  views: integer('views').notNull().default(0),
  publishedAt: text('published_at'),
  createdAt: text('created_at')
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at')
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

export const blogCategories = sqliteTable('blog_categories', {
  id: text('id').primaryKey(),
  name: text('name').notNull().unique(),
  slug: text('slug').notNull().unique(),
  description: text('description'),
  createdAt: text('created_at')
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

// ─── Forum ─────────────────────────────────────────────────────
export const forumCategories = sqliteTable('forum_categories', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  description: text('description'),
  order: integer('order').notNull().default(0),
  createdAt: text('created_at')
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

export const forumTopics = sqliteTable('forum_topics', {
  id: text('id').primaryKey(),
  categoryId: text('category_id')
    .notNull()
    .references(() => forumCategories.id, { onDelete: 'cascade' }),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  body: text('body').notNull(),
  pinned: integer('pinned', { mode: 'boolean' }).notNull().default(false),
  locked: integer('locked', { mode: 'boolean' }).notNull().default(false),
  views: integer('views').notNull().default(0),
  lastReplyAt: text('last_reply_at'),
  createdAt: text('created_at')
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

export const forumReplies = sqliteTable('forum_replies', {
  id: text('id').primaryKey(),
  topicId: text('topic_id')
    .notNull()
    .references(() => forumTopics.id, { onDelete: 'cascade' }),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  body: text('body').notNull(),
  createdAt: text('created_at')
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at'),
});

// ─── Notifications ─────────────────────────────────────────────
export const notifications = sqliteTable('notifications', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  type: text('type', { enum: ['info', 'success', 'warning', 'error'] })
    .notNull()
    .default('info'),
  title: text('title').notNull(),
  body: text('body').notNull(),
  read: integer('read', { mode: 'boolean' }).notNull().default(false),
  link: text('link'),
  createdAt: text('created_at')
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

// ─── Audit log ─────────────────────────────────────────────────
export const auditLogs = sqliteTable('audit_logs', {
  id: text('id').primaryKey(),
  userId: text('user_id').references(() => users.id, { onDelete: 'set null' }),
  action: text('action').notNull(),
  resource: text('resource').notNull(),
  resourceId: text('resource_id'),
  ip: text('ip'),
  userAgent: text('user_agent'),
  metadata: text('metadata'), // JSON
  createdAt: text('created_at')
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

// ─── API tokens (developer API) ────────────────────────────────
export const apiTokens = sqliteTable('api_tokens', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  tokenHash: text('token_hash').notNull().unique(),
  scopes: text('scopes'), // JSON array
  lastUsedAt: text('last_used_at'),
  expiresAt: text('expires_at'),
  createdAt: text('created_at')
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

// ─── Webhooks ──────────────────────────────────────────────────
export const webhooks = sqliteTable('webhooks', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  url: text('url').notNull(),
  events: text('events'), // JSON array
  secret: text('secret').notNull(),
  active: integer('active', { mode: 'boolean' }).notNull().default(true),
  lastTriggeredAt: text('last_triggered_at'),
  createdAt: text('created_at')
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

export const webhookDeliveries = sqliteTable('webhook_deliveries', {
  id: text('id').primaryKey(),
  webhookId: text('webhook_id')
    .notNull()
    .references(() => webhooks.id, { onDelete: 'cascade' }),
  event: text('event').notNull(),
  payload: text('payload'), // JSON
  responseStatus: integer('response_status'),
  responseBody: text('response_body'),
  deliveredAt: text('delivered_at')
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

// ─── Cron jobs ─────────────────────────────────────────────────
export const cronJobs = sqliteTable('cron_jobs', {
  id: text('id').primaryKey(),
  accountId: text('account_id')
    .notNull()
    .references(() => hostingAccounts.id, { onDelete: 'cascade' }),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  command: text('command').notNull(),
  schedule: text('schedule').notNull(), // cron expression
  active: integer('active', { mode: 'boolean' }).notNull().default(true),
  lastRunAt: text('last_run_at'),
  nextRunAt: text('next_run_at'),
  createdAt: text('created_at')
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

// ─── Backups ───────────────────────────────────────────────────
export const backups = sqliteTable('backups', {
  id: text('id').primaryKey(),
  accountId: text('account_id')
    .notNull()
    .references(() => hostingAccounts.id, { onDelete: 'cascade' }),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  provider: text('provider', { enum: ['local', 'gdrive', 'dropbox'] })
    .notNull()
    .default('local'),
  filename: text('filename').notNull(),
  sizeMb: real('size_mb').notNull().default(0),
  status: text('status', { enum: ['pending', 'completed', 'failed'] })
    .notNull()
    .default('pending'),
  url: text('url'),
  createdAt: text('created_at')
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

// ─── Settings (key-value) ──────────────────────────────────────
export const settings = sqliteTable('settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
  updatedAt: text('updated_at')
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

// ─── Sessions (for OAuth state, etc.) ──────────────────────────
export const sessions = sqliteTable('sessions', {
  id: text('id').primaryKey(),
  userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }),
  provider: text('provider'),
  state: text('state').notNull(),
  data: text('data'), // JSON
  expiresAt: text('expires_at').notNull(),
  createdAt: text('created_at')
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

// ─── Plugin registry ───────────────────────────────────────────
export const plugins = sqliteTable('plugins', {
  id: text('id').primaryKey(),
  name: text('name').notNull().unique(),
  displayName: text('display_name').notNull(),
  description: text('description'),
  version: text('version').notNull(),
  author: text('author'),
  homepage: text('homepage'),
  enabled: integer('enabled', { mode: 'boolean' }).notNull().default(false),
  config: text('config'), // JSON
  installedAt: text('installed_at')
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type HostingAccount = typeof hostingAccounts.$inferSelect;
export type NewHostingAccount = typeof hostingAccounts.$inferInsert;
export type Ticket = typeof tickets.$inferSelect;
export type BlogPost = typeof blogPosts.$inferSelect;
export type ForumTopic = typeof forumTopics.$inferSelect;
export type Notification = typeof notifications.$inferSelect;
export type AuditLog = typeof auditLogs.$inferSelect;
export type ApiToken = typeof apiTokens.$inferSelect;
export type Webhook = typeof webhooks.$inferSelect;
export type CronJob = typeof cronJobs.$inferSelect;
export type Backup = typeof backups.$inferSelect;
export type Domain = typeof domains.$inferSelect;
export type DnsRecord = typeof dnsRecords.$inferSelect;
