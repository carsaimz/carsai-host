# CARSAI HOST — Changelog

All notable changes to CARSAI HOST are documented in this file. The
format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
and the project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).
Each release is identified by a version number and a date, and the
changes are grouped into the categories Added, Changed, Deprecated,
Removed, Fixed, and Security. When a category has no entries it is
omitted from that release's section rather than appearing empty.

---

## [1.0.0] — 2024-11-15

The inaugural stable release of CARSAI HOST. This version ships the
complete platform: a React 18 frontend inspired by Xera, an Express 4
backend with Drizzle ORM and SQLite, a Capacitor 6 mobile app, and
full i18n support for Portuguese, English, French, and Spanish. Every
feature described in the README is implemented and tested; the
platform is ready for production deployment via Docker, PM2, or
systemd. This release represents approximately six months of design,
development, and iteration across the multi-agent build pipeline.

### Added

#### Core Platform
- Initial monorepo scaffold with pnpm workspaces and Turbo pipeline
  (`turbo.json`, `pnpm-workspace.yaml`).
- Root `package.json` with `engines` constraints (Node 20+, pnpm 9+),
  Prettier configuration, and workspace scripts (`dev`, `build`,
  `lint`, `test`, `format`, `db:generate`, `db:migrate`).
- Shared package (`@carsai/shared`) with TypeScript types, Zod
  validation schemas, i18n translation files, and brand constants —
  the single source of truth consumed by the frontend, backend, and
  mobile packages.

#### Authentication and Authorization
- User registration with email verification (24-hour token expiry).
- Login with bcrypt password verification (cost factor 12).
- JWT access tokens (15-minute expiry) signed with HS256.
- JWT refresh tokens (7-day expiry) with family-based rotation and
  reuse detection — presenting a revoked refresh token revokes the
  entire family.
- Two-factor authentication via TOTP (RFC 6238) with eight one-time
  backup codes hashed with bcrypt.
- Forgot-password and reset-password flows with 1-hour token expiry.
- Role-based access control with three roles: `user`, `moderator`,
  `admin`. Middleware guards: `optionalAuth`, `requireAuth`,
  `requireStaff`, `requireAdmin`.
- Resource ownership checks on every account, ticket, and domain
  endpoint.

#### Hosting Accounts (MOFH Integration)
- `MofhClient` service in `packages/api/src/services/mofh-client.ts`
  implementing the MOFH XML-RPC protocol over HTTP Basic Auth.
- `createAccount` operation calling MOFH `createacct` with
  auto-generated 8-char usernames and 16-char passwords.
- `suspendAccount` and `unsuspendAccount` operations calling MOFH
  `suspendacct` and `unsuspendacct` with reason tracking.
- `resetPassword` operation calling MOFH `passwd` with encrypted
  storage of the new password.
- `checkDomainAvailability` operation calling MOFH `domainavailable`.
- Account lifecycle states: `creating`, `active`, `suspended`,
  `terminated`, `failed` with automatic transitions in the
  `hosting_accounts` table.

#### Database
- SQLite database via `better-sqlite3` (synchronous driver) and
  Drizzle ORM 0.33 (type-safe query builder).
- 22 tables: `users`, `refresh_tokens`, `password_resets`,
  `hosting_accounts`, `domains`, `dns_records`, `tickets`,
  `ticket_replies`, `blog_posts`, `blog_categories`,
  `forum_categories`, `forum_topics`, `forum_replies`,
  `notifications`, `audit_logs`, `api_tokens`, `webhooks`,
  `webhook_deliveries`, `cron_jobs`, `backups`, `settings`,
  `sessions`, `plugins`.
- WAL mode enabled for concurrent reads; `foreign_keys` enforced;
  `busy_timeout` 5 seconds.
- Initial migration `packages/api/migrations/0001_initial.sql` with
  all tables, indexes, and CHECK constraints.

#### REST API
- Versioned API under `/api/v1/` with standardised response envelope
  `{ success, data, error, meta }`.
- Public endpoints: `GET /health`, `GET /info`, `POST /contact`.
  Server statistics are deliberately omitted from public endpoints —
  they are only available in the authenticated admin area.
- Auth endpoints: register, verify-email, login, refresh, logout, me,
  forgot-password, reset-password, 2FA enable/confirm/disable.
- Accounts endpoints: list, create, get-by-id, suspend, unsuspend,
  reset-password.
- Tickets endpoints: list (paginated), create, get-by-id (with
  replies), reply.
- Blog endpoints: public list, public get-by-slug, admin CRUD.
- Forum endpoints: public categories, public topics-by-category,
  public topic-by-id, authenticated create-topic, authenticated
  create-reply (with locked-topic check).
- Admin endpoints: stats (with server metrics), users list, suspend,
  activate, change-role.

#### Security
- Helmet middleware for security headers (HSTS, X-Frame-Options,
  X-Content-Type-Options, CSP, Referrer-Policy).
- CORS allow-listing via `CORS_ORIGINS` env var (no wildcards with
  credentials).
- Three-tier rate limiting: global (100/15min), auth (5/15min),
  register (3/hour).
- Zod schema validation on every request body, shared between client
  and server.
- AES-256-GCM encryption of FTP passwords at rest using a key derived
  from `JWT_SECRET` via `scryptSync`.
- Audit logging of every admin action with IP, user-agent, and
  metadata.
- API token system for developer integrations (scoped, hashed at
  rest, 60 req/min rate limit).

#### Frontend
- React 18 + Vite 5 + TypeScript 5.5 single-page application.
- Tailwind CSS 3 + shadcn/ui (Radix UI primitives) component library.
- React Router v6 with public routes (landing, blog, forum, contact,
  login, register) and protected routes (dashboard, admin).
- TanStack Query v5 for server-state caching (5-minute stale time).
- Zustand for client-state (auth, theme, locale).
- react-hook-form + Zod for form validation, reusing the shared
  schemas.
- Xera-inspired dark theme: slate-900 background, blue-600 primary,
  cyan-500 accent. Configurable via `BRAND_COLORS` in
  `packages/shared/src/constants/index.ts`.
- i18next + react-i18next for internationalization, sharing the JSON
  files from `@carsai/shared`.

#### Mobile
- Capacitor 6 wrapper around the React frontend for iOS and Android.
- Native plugins: filesystem, biometric auth, push notifications,
  camera, share, SQLite (for offline cache).
- Certificate pinning via `@capacitor-community/http` with SHA-256
  fingerprints of the intermediate CA certificates.

#### Internationalization
- Four locales shipped: `pt` (default), `en`, `fr`, `es`.
- Translation files in `packages/shared/src/i18n/{pt,en,fr,es}.json`
  with 22 namespaces (common, nav, home, auth, dashboard, accounts,
  files, databases, domains, ssl, backups, cron, tickets, blog,
  forum, profile, admin, errors, validation, success, footer,
  language).
- Locale detection order: localStorage → cookie → Accept-Language →
  default `pt`.
- `{{var}}` interpolation syntax supported by both `i18next`
  (frontend) and the shared `translate()` helper (backend).

#### Documentation
- `INSTALL.md` — comprehensive installation guide with three methods
  (development, Docker, PM2 + Nginx) and troubleshooting.
- `ARCHITECTURE.md` — technical architecture with component
  breakdown, data flows, database design, security architecture,
  scalability, and ASCII sequence diagrams.
- `API.md` — full REST API reference with every endpoint documented,
  TypeScript request/response types, examples, and error codes.
- `MOFH.md` — MOFH (iFastNet/Byet) integration guide with XML-RPC
  examples, account lifecycle, and credential management.
- `I18N.md` — internationalization guide with locale detection,
  adding new languages, key conventions, and translator workflow.
- `SECURITY.md` — security practices covering authentication,
  authorization, encryption, rate limiting, audit logging, and mobile
  security.
- `CONTRIBUTING.md` — contribution guide with branch naming,
  Conventional Commits, PR workflow, code style, testing
  requirements, and release process.
- `DEPLOYMENT.md` — production deployment guide with Docker Compose,
  PM2 + Nginx, systemd, backup, SSL, log rotation, monitoring,
  update, rollback, and hardening checklist.

### Changed

- N/A (initial release — no prior behaviour to change).

### Deprecated

- N/A (initial release — no deprecated APIs).

### Removed

- N/A (initial release — nothing removed).

### Fixed

- N/A (initial release — no prior bugs to fix).

### Security

- All passwords hashed with bcrypt at cost factor 12 (approximately
  250ms per verification on a 2-vCPU VPS).
- JWT access tokens expire in 15 minutes; refresh tokens rotate on
  every use and trigger family-wide revocation on reuse detection.
- FTP passwords returned by MOFH encrypted with AES-256-GCM before
  database storage; decryption only happens in memory when the user
  explicitly requests to reveal the password.
- CORS configured with explicit origin allow-list; credentials
  enabled but no wildcard origins.
- Helmet enforces HSTS (max-age 2 years), X-Frame-Options DENY,
  X-Content-Type-Options nosniff, and a strict Content-Security-Policy.
- Audit log is append-only with no DELETE endpoint; exported off-host
  daily for tamper resistance.
- Dependency vulnerabilities checked on every CI build via
  `pnpm audit --prod`; Dependabot opens PRs for outdated dependencies
  weekly.

---

## Versioning Policy

CARSAI HOST follows Semantic Versioning 2.0.0:

- **PATCH** (`1.0.0` → `1.0.1`): backwards-compatible bug fixes. No
  new features, no schema changes, no API changes. Safe to apply
  without reading release notes.
- **MINOR** (`1.0.1` → `1.1.0`): backwards-compatible new features.
  May include additive database migrations (new tables, new columns
  with defaults). Existing API clients continue to work; new clients
  may use new endpoints. Read the release notes before upgrading.
- **MAJOR** (`1.1.0` → `2.0.0`): breaking changes. May include
  schema migrations that require data transformation, API endpoint
  removals or renames, or configuration format changes. Always read
  the migration guide in the release notes before upgrading. The
  previous major version is maintained for at least 12 months after
  the new major version's release.

## Release Cadence

- **Patch releases**: as needed (typically 1-2 per month for
  actively-developed minor versions).
- **Minor releases**: every 4-6 weeks while a major version is in
  active development.
- **Major releases**: not on a fixed schedule; driven by accumulated
  breaking changes that justify the version bump.

## Support Policy

- The latest minor release of the current major version receives
  full support (bug fixes, security patches).
- The previous minor release receives security patches only.
- Older minor releases are unsupported — upgrade to receive fixes.
- The previous major version receives critical security patches for
  12 months after the new major version's release.

## Credits

This release was built by the CARSAI HOST multi-agent pipeline and
the community contributors listed in the GitHub release notes. Special
thanks to the iFastNet team for providing the free hosting
infrastructure that makes this project possible, and to the Xera
project for the design inspiration that shaped the user experience.
