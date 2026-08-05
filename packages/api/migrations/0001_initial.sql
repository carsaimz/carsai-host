-- CARSAI HOST — Initial schema migration (0001)
-- SQLite
-- All tables for the hosting platform

PRAGMA foreign_keys = ON;

-- ─── Users ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin', 'moderator')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('active', 'suspended', 'banned', 'pending')),
  email_verified_at TEXT,
  email_verify_token TEXT,
  two_factor_secret TEXT,
  two_factor_enabled INTEGER NOT NULL DEFAULT 0,
  two_factor_backup_codes TEXT,
  avatar_url TEXT,
  locale TEXT NOT NULL DEFAULT 'pt',
  timezone TEXT,
  oauth_provider TEXT,
  oauth_id TEXT,
  last_login_at TEXT,
  last_login_ip TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);

-- ─── Refresh tokens (rotation) ─────────────────────────────────
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  family TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  revoked_at TEXT,
  replaced_by TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token ON refresh_tokens(token);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_family ON refresh_tokens(family);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON refresh_tokens(user_id);

-- ─── Password resets ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS password_resets (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  used_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_password_resets_token ON password_resets(token);

-- ─── Hosting accounts (MOFH) ───────────────────────────────────
CREATE TABLE IF NOT EXISTS hosting_accounts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  domain TEXT NOT NULL,
  username TEXT NOT NULL,
  password_encrypted TEXT,
  status TEXT NOT NULL DEFAULT 'creating'
    CHECK (status IN ('creating', 'active', 'suspended', 'terminated', 'failed')),
  package_name TEXT NOT NULL DEFAULT 'freehosting',
  server_ip TEXT,
  nameservers TEXT,
  cpanel_url TEXT,
  ftp_host TEXT,
  mysql_host TEXT,
  mofh_ref TEXT,
  suspension_reason TEXT,
  suspended_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_hosting_accounts_user ON hosting_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_hosting_accounts_status ON hosting_accounts(status);
CREATE INDEX IF NOT EXISTS idx_hosting_accounts_domain ON hosting_accounts(domain);

-- ─── Domains ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS domains (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES hosting_accounts(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  domain TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'addon' CHECK (type IN ('subdomain', 'addon', 'parked')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'inactive')),
  ssl_ssl_issued INTEGER DEFAULT 0,
  ssl_expires_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_domains_account ON domains(account_id);
CREATE INDEX IF NOT EXISTS idx_domains_user ON domains(user_id);

-- ─── DNS records ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS dns_records (
  id TEXT PRIMARY KEY,
  domain_id TEXT NOT NULL REFERENCES domains(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('A', 'AAAA', 'CNAME', 'MX', 'TXT', 'NS', 'SRV')),
  name TEXT NOT NULL,
  value TEXT NOT NULL,
  ttl INTEGER NOT NULL DEFAULT 3600,
  priority INTEGER,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_dns_records_domain ON dns_records(domain_id);

-- ─── Tickets ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tickets (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'pending', 'resolved', 'closed')),
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  department TEXT NOT NULL DEFAULT 'general' CHECK (department IN ('general', 'technical', 'abuse', 'billing')),
  assigned_to TEXT REFERENCES users(id),
  closed_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_tickets_user ON tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);

CREATE TABLE IF NOT EXISTS ticket_replies (
  id TEXT PRIMARY KEY,
  ticket_id TEXT NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  is_staff INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ticket_replies_ticket ON ticket_replies(ticket_id);

-- ─── Blog ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS blog_posts (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  excerpt TEXT,
  content TEXT NOT NULL,
  cover_image TEXT,
  author_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category TEXT NOT NULL DEFAULT 'general',
  tags TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  views INTEGER NOT NULL DEFAULT 0,
  published_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_blog_posts_slug ON blog_posts(slug);
CREATE INDEX IF NOT EXISTS idx_blog_posts_status ON blog_posts(status);
CREATE INDEX IF NOT EXISTS idx_blog_posts_published ON blog_posts(published_at);

CREATE TABLE IF NOT EXISTS blog_categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ─── Forum ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS forum_categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  "order" INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS forum_topics (
  id TEXT PRIMARY KEY,
  category_id TEXT NOT NULL REFERENCES forum_categories(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  pinned INTEGER NOT NULL DEFAULT 0,
  locked INTEGER NOT NULL DEFAULT 0,
  views INTEGER NOT NULL DEFAULT 0,
  last_reply_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_forum_topics_category ON forum_topics(category_id);

CREATE TABLE IF NOT EXISTS forum_replies (
  id TEXT PRIMARY KEY,
  topic_id TEXT NOT NULL REFERENCES forum_topics(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_forum_replies_topic ON forum_replies(topic_id);

-- ─── Notifications ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'info' CHECK (type IN ('info', 'success', 'warning', 'error')),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  read INTEGER NOT NULL DEFAULT 0,
  link TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);

-- ─── Audit log ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  resource TEXT NOT NULL,
  resource_id TEXT,
  ip TEXT,
  user_agent TEXT,
  metadata TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs(resource, resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at);

-- ─── API tokens (developer API) ────────────────────────────────
CREATE TABLE IF NOT EXISTS api_tokens (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  scopes TEXT,
  last_used_at TEXT,
  expires_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_api_tokens_user ON api_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_api_tokens_hash ON api_tokens(token_hash);

-- ─── Webhooks ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS webhooks (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  events TEXT,
  secret TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1,
  last_triggered_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_webhooks_user ON webhooks(user_id);

CREATE TABLE IF NOT EXISTS webhook_deliveries (
  id TEXT PRIMARY KEY,
  webhook_id TEXT NOT NULL REFERENCES webhooks(id) ON DELETE CASCADE,
  event TEXT NOT NULL,
  payload TEXT,
  response_status INTEGER,
  response_body TEXT,
  delivered_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_webhook ON webhook_deliveries(webhook_id);

-- ─── Cron jobs ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cron_jobs (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES hosting_accounts(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  command TEXT NOT NULL,
  schedule TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1,
  last_run_at TEXT,
  next_run_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_cron_jobs_user ON cron_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_cron_jobs_active ON cron_jobs(active);

-- ─── Backups ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS backups (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES hosting_accounts(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL DEFAULT 'local' CHECK (provider IN ('local', 'gdrive', 'dropbox')),
  filename TEXT NOT NULL,
  size_mb REAL NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
  url TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_backups_account ON backups(account_id);

-- ─── Settings (key-value) ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ─── Sessions (OAuth state, etc.) ──────────────────────────────
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  provider TEXT,
  state TEXT NOT NULL,
  data TEXT,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sessions_state ON sessions(state);

-- ─── Plugin registry ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS plugins (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  description TEXT,
  version TEXT NOT NULL,
  author TEXT,
  homepage TEXT,
  enabled INTEGER NOT NULL DEFAULT 0,
  config TEXT,
  installed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ─── Migrations tracking ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS _migrations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  filename TEXT NOT NULL UNIQUE,
  applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ─── Seed: default forum categories ────────────────────────────
INSERT OR IGNORE INTO forum_categories (id, name, slug, description, "order") VALUES
  ('00000000-0000-0000-0000-000000000001', 'Announcements', 'announcements', 'Official announcements', 1),
  ('00000000-0000-0000-0000-000000000002', 'General Discussion', 'general-discussion', 'General chat about anything', 2),
  ('00000000-0000-0000-0000-000000000003', 'Technical Support', 'technical-support', 'Get help from the community', 3),
  ('00000000-0000-0000-0000-000000000004', 'Tutorials', 'tutorials', 'Share your tutorials', 4),
  ('00000000-0000-0000-0000-000000000005', 'Feature Requests', 'feature-requests', 'Suggest new features', 5);

-- ─── Seed: default blog categories ─────────────────────────────
INSERT OR IGNORE INTO blog_categories (id, name, slug, description) VALUES
  ('00000000-0000-0000-0000-000000000010', 'News', 'news', 'Platform news'),
  ('00000000-0000-0000-0000-000000000011', 'Tutorials', 'tutorials', 'How-to guides'),
  ('00000000-0000-0000-0000-000000000012', 'Updates', 'updates', 'Product updates'),
  ('00000000-0000-0000-0000-000000000013', 'Community', 'community', 'Community spotlights');
