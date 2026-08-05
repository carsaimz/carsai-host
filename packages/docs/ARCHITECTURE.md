# CARSAI HOST — Technical Architecture

This document describes the internal architecture of CARSAI HOST in depth. It
is intended for contributors who need to understand how the pieces fit
together before making non-trivial changes, and for operators who want to
reason about scaling, security, and failure modes. The architecture follows
three guiding principles: (1) the panel itself is lightweight because real
hosting work happens on iFastNet infrastructure, (2) the database is the
source of truth and is treated as such with migrations, backups, and strict
schema typing, and (3) every external dependency (MOFH, SMTP, OAuth
providers) is wrapped behind a service interface so it can be mocked in tests
or swapped for an alternative provider.

---

## 1. High-Level Architecture

```
                 +---------------------------------------------------+
                 |            Browser / Capacitor mobile             |
                 |   React SPA  (public pages + dashboard + admin)   |
                 +-------------------------+-------------------------+
                                           |
                                  HTTPS / WSS
                                           |
                                           v
+------------------------------------------+--------------------------------------+
|                                  Nginx (TLS, gzip)                              |
|   /static/*  -> Vite bundle   |   /api/v1/*  -> Express   |   /ws  -> ws server |
+------------------------------------------+--------------------------------------+
                                           |
                                           v
+------------------------------------------------------------------------------+
|                                 Express API                                  |
|  helmet + cors + rate-limit  ->  router  ->  auth middleware  ->  controller |
|  Zod validation (shared schemas)  ->  service  ->  Drizzle ORM  ->  SQLite  |
+-------+----------------+----------------+----------------+-------------------+
        |                |                |                |
        v                v                v                v
+---------------+ +---------------+ +-------------+ +----------------+
|  SQLite (FS)  | |  Nodemailer   | |  Bull queue | |  MOFH Client   |
|  Drizzle ORM  | |  -> SMTP      | |  -> Redis   | |  -> iFastNet   |
|  WAL mode     | +---------------+ +-------------+ |   XML-RPC API  |
+---------------+                                      +-------+
        |                                                      |
        v                                                      v
+----------------+                                  +------------------------+
|  Audit logs    |                                  |  Apache + MySQL + FTP  |
|  ( Winston )   |                                  |  (iFastNet / Byet)     |
+----------------+                                  +------------------------+
```

The browser (or mobile app) talks only to Nginx. Nginx terminates TLS,
compresses responses, and routes `/api/v1/*` to the Express API process
listening on `127.0.0.1:3000`. The Express API owns the SQLite database file,
calls Nodemailer for transactional email, calls the MOFH XML-RPC API for real
account provisioning, and enqueues background work (SSL issuance, backups,
cleanup) on a Bull queue backed by Redis. The audit log is written to disk by
Winston with daily rotation.

---

## 2. Component Breakdown

### 2.1 Frontend (`packages/web`)

The frontend is a React 18 single-page application built with Vite 5. It uses
React Router v6 for client-side routing, TanStack Query v5 for server-state
caching, Zustand for client-state, and shadcn/ui (built on Radix UI + Tailwind
CSS) for the component library. The visual design is intentionally inspired
by Xera (a PHP hosting panel) — dark slate background, blue primary, cyan
accent, sidebar with grouped navigation, card-based dashboards, and table
views with action menus. The frontend never makes a request that bypasses
Nginx, so in production it only knows about `https://yourdomain/api/v1`.

### 2.2 Backend API (`packages/api`)

The API is a Node.js 20+ Express 4 application written in TypeScript with
native ES modules (`"type": "module"`). It is organised into the layered
structure `routes -> middleware -> services -> db`. Routes are thin: they
parse the request, call a service, and return a standardised
`{ success, data, error, meta }` envelope via the helpers in
`packages/api/src/utils/response.ts`. Middleware handles cross-cutting
concerns: `helmet` for security headers, `cors` for origin allow-listing,
`express-rate-limit` for throttling, `authMiddleware` for JWT verification,
and `validate` for Zod schema validation against the shared schemas.
Services contain business logic and are the only layer allowed to call
external dependencies (MOFH, SMTP, file system).

### 2.3 Database (`packages/api/src/db`)

The database is SQLite accessed through `better-sqlite3` (synchronous, fast,
no driver process) and Drizzle ORM (type-safe query builder). The connection
is opened once at process start in `packages/api/src/db/index.ts` and reused
for the lifetime of the process. WAL mode is enabled for concurrent reads,
foreign keys are enforced, and `busy_timeout` is set to 5 seconds so that
write contention does not surface as `SQLITE_BUSY` errors. The complete
schema is in `packages/api/src/db/schema.ts` and consists of 22 tables
covering users, auth tokens, hosting accounts, domains, DNS, tickets, blog,
forum, notifications, audit logs, API tokens, webhooks, cron jobs, backups,
settings, sessions, and plugins.

### 2.4 MOFH Client (`packages/api/src/services/mofh-client.ts`)

The MOFH client is the bridge to iFastNet's hosting infrastructure. It
implements the XML-RPC protocol over HTTP POST against
`https://panel.myownfreehost.com/xml-api` with HTTP Basic Auth. The class
exposes five operations: `createAccount`, `suspendAccount`,
`unsuspendAccount`, `resetPassword`, and `checkDomainAvailability`. Each
operation builds an XML-RPC `<methodCall>` envelope, escapes string
parameters, sends the request with `fetch`, and parses the response by
looking for `<name>result</name>` and `<name>reason</name>` members in the
returned struct. The client is a singleton instantiated in
`packages/api/src/services/mofh-client.ts` and exported as `mofhClient`.

### 2.5 Queues (`packages/api/src/queues`)

Long-running work (SSL certificate issuance, nightly backups, weekly digest
emails, account cleanup, MOFH retry-on-failure) is offloaded to Bull queues
backed by Redis. The API process enqueues jobs and a separate worker process
(`pnpm --filter @carsai/api worker`) drains them. This separation is
important because the Express request thread should never block on an
external API call that might take 30 seconds; instead it inserts a row in
the database with `status = 'pending'`, enqueues a job, and returns `202
Accepted`. The worker updates the row when the job finishes and emits a
notification that the frontend picks up via WebSocket.

### 2.6 Mobile (`packages/mobile`)

The mobile app is the same React frontend bundled with Capacitor 6 for iOS
and Android. Capacitor plugins provide native file system access,
biometric authentication, push notifications, camera, and an in-app SQLite
database for offline caching of the user's account list and credentials
(encrypted with the device's secure enclave / keystore). The mobile app
talks to the same `/api/v1/*` endpoints as the web frontend; the only
difference is the User-Agent string and the inclusion of an `X-Carsai-Mobile:
1` header that lets the API return mobile-specific responses (e.g. shorter
pagination limits, push notification registration).

### 2.7 Installer (`packages/installer`)

The installer is a standalone React app served at `/install` on first run.
It performs six steps in sequence: (1) check system requirements, (2) test
SQLite connectivity, (3) run Drizzle migrations, (4) create the admin user,
(5) test MOFH credentials, (6) write the final `.env` and create the
`data/.installed` lockfile. After step 6 the installer route is disabled and
returns 404. To re-enable it (e.g. for recovery), delete the lockfile and
restart the API.

---

## 3. Data Flows

### 3.1 Authentication Flow (JWT + Refresh Rotation)

```
Browser                            API                          Database
   |  POST /auth/login               |                              |
   |  {email, password}              |                              |
   |-------------------------------->|  verify password (bcrypt)    |
   |                                 |----------------------------->|
   |                                 |  fetch user row              |
   |                                 |<-----------------------------|
   |                                 |  sign access JWT (15min)     |
   |                                 |  sign refresh JWT (7d, fam)  |
   |                                 |  INSERT refresh_tokens       |
   |                                 |----------------------------->|
   |  200 { user, tokens }           |                              |
   |<--------------------------------|                              |
   |                                                                 |
   |  (15 min later, access expires)                                 |
   |  POST /auth/refresh                                            |
   |  {refreshToken}                                                |
   |-------------------------------->|  verify refresh JWT          |
   |                                 |  SELECT refresh_tokens       |
   |                                 |----------------------------->|
   |                                 |<-----------------------------|
   |                                 |  if revoked: REVOKE FAMILY   |
   |                                 |  else: rotate — mark old,    |
   |                                 |        INSERT new            |
   |                                 |----------------------------->|
   |  200 { newAccess, newRefresh }  |                              |
   |<--------------------------------|                              |
```

Access tokens are short-lived (15 minutes) so that a leaked token has limited
blast radius. Refresh tokens are long-lived (7 days) but rotate on every
use: each refresh issues a new refresh token and marks the previous one as
`replaced_by`. Every refresh token belongs to a `family` (a UUID generated
at login). If a refresh token is presented that has already been revoked,
the entire family is revoked — this is the standard defence against refresh
token theft and reuse.

### 3.2 Account Creation Flow via MOFH

```
Browser                      API                       MOFH API              iFastNet
   |  POST /accounts          |                           |                     |
   |  {domain, package}       |                           |                     |
   |------------------------->|  check domain uniqueness  |                     |
   |                          |  INSERT hosting_accounts  |                     |
   |                          |   (status='creating')     |                     |
   |                          |-------------------------->|                     |
   |                          |  XML-RPC createacct       |                     |
   |                          |-------------------------->|  provision cPanel  |
   |                          |                           |  create FTP user   |
   |                          |                           |  create MySQL DB   |
   |                          |                           |<--------------------|
   |                          |  parse {result, reason}   |                     |
   |                          |<--------------------------|                     |
   |                          |  UPDATE hosting_accounts  |                     |
   |                          |   (status='active',       |                     |
   |                          |    username, cpanel_url)  |                     |
   |                          |  encrypt(ftp_password)    |                     |
   |  201 {id, password once} |                           |                     |
   |<-------------------------|                           |                     |
```

The FTP password is returned to the user exactly once in the `201 Created`
response body. It is then stored in the database encrypted with AES-256-GCM
using a key derived from `JWT_SECRET` via `scryptSync`. The encryption helper
is in `packages/api/src/utils/auth.ts` and produces `base64(iv || tag ||
ciphertext)`. On subsequent requests the password can be re-fetched via
`GET /accounts/:id` but only by the owner or an admin; the response includes
a decrypted `password` field that the frontend shows in a "reveal" dialog
with copy-to-clipboard.

### 3.3 File Upload Flow

```
Browser                   API                    Disk                 iFastNet FTP
   |  POST /files/:accId    |                       |                       |
   |  multipart/form-data   |                       |                       |
   |----------------------->|  verify ownership      |                       |
   |                        |  mkdir uploads/accId   |                       |
   |                        |---------------------->|                       |
   |                        |  pipe stream to disk   |                       |
   |                        |---------------------->|                       |
   |                        |  enqueue ftp-upload    |                       |
   |                        |  job (Bull queue)      |                       |
   |  202 { jobId }         |                       |                       |
   |<-----------------------|                       |                       |
   |                                                 |                       |
   |  (worker, async)                                |                       |
   |                        |  basic-ftp PUT         |                       |
   |                        |---------------------------------------------->|
   |                        |  UPDATE files SET uploaded_at=now            |
```

The upload endpoint streams the file from the browser to the API disk
(`uploads/<accountId>/...`) using `multer`'s streaming storage engine. Once
the bytes are safely on disk, the API responds with `202 Accepted` and a
job ID. A Bull worker then opens an FTP connection to the iFastNet server
(whose hostname is stored in `hosting_accounts.ftp_host`) and transfers the
file. This two-phase approach keeps the HTTP request short and lets the
worker retry FTP failures with exponential backoff without blocking the
user.

---

## 4. Database Design

### 4.1 Why SQLite

SQLite was chosen as the default database for three reasons: zero
administration (no separate process to install, secure, or back up),
excellent performance for read-heavy workloads (the typical CARSAI HOST
instance does 95% reads), and ACID compliance with proper foreign keys and
triggers. The `better-sqlite3` driver is synchronous and runs in the same
process as Express, which eliminates the latency and connection-pool
management overhead of a client/server database. For a community hosting
panel serving up to a few thousand users, SQLite is more than sufficient.

### 4.2 Tables (22 total)

The full schema lives in `packages/api/src/db/schema.ts`. The major tables
are:

| Table | Purpose | Notable columns |
|-------|---------|-----------------|
| `users` | All registered users | `role`, `status`, `two_factor_*`, `locale` |
| `refresh_tokens` | Refresh token rotation | `family`, `revoked_at`, `replaced_by` |
| `password_resets` | Forgot-password tokens | `expires_at`, `used_at` |
| `hosting_accounts` | MOFH-provisioned accounts | `username`, `password_encrypted`, `status` |
| `domains` | Sub/addon/parked domains | `type`, `ssl_issued`, `ssl_expires_at` |
| `dns_records` | DNS records per domain | `type`, `ttl`, `priority` |
| `tickets` + `ticket_replies` | Support tickets | `priority`, `department`, `is_staff` |
| `blog_posts` + `blog_categories` | Internal blog CMS | `slug`, `tags` (JSON), `views` |
| `forum_categories` + `forum_topics` + `forum_replies` | Community forum | `pinned`, `locked` |
| `notifications` | In-app notifications | `read`, `type` |
| `audit_logs` | Admin action trail | `action`, `resource`, `ip`, `metadata` (JSON) |
| `api_tokens` | Developer API tokens | `token_hash`, `scopes` (JSON) |
| `webhooks` + `webhook_deliveries` | Outbound webhooks | `secret`, `events`, `response_status` |
| `cron_jobs` | User cron schedules | `schedule`, `last_run_at`, `next_run_at` |
| `backups` | Backup history | `provider`, `size_mb`, `status` |
| `settings` | Key-value config | `key`, `value` |
| `sessions` | OAuth state, etc. | `provider`, `state`, `expires_at` |
| `plugins` | Plugin registry | `enabled`, `config` (JSON) |

### 4.3 Indexes

Every foreign key column is indexed. Every column used in a `WHERE` clause
for authentication (`users.email`, `users.username`,
`refresh_tokens.token`, `password_resets.token`) has a unique index. The
`audit_logs` table has a composite index on `(resource, resource_id)` to
support "show me every action taken on this account" queries. The
`hosting_accounts` table has a composite index on `(user_id, status)` for
the dashboard's "active accounts" count query.

### 4.4 When to Migrate to PostgreSQL

SQLite is the right default up to roughly 50 concurrent writers or 1 million
rows in the largest table. Beyond that, write contention (even with WAL)
becomes noticeable and you should migrate to PostgreSQL. The migration
path is straightforward because Drizzle ORM supports both dialects: change
the `drizzle.config.ts` driver, regenerate migrations with
`pnpm db:generate`, and run a data export from SQLite using
`sqlite3 .dump` followed by a `psql` import. The application code does not
change because Drizzle abstracts the SQL dialect.

---

## 5. Security Architecture

### 5.1 JWT and Refresh Rotation

Authentication is built around two JWT types. The access token (15-minute
expiry) is sent in the `Authorization: Bearer` header on every API call.
The refresh token (7-day expiry) is sent only to `POST /auth/refresh` and
rotates on every use. Each refresh token carries a `family` claim; if a
revoked refresh token is presented, the entire family is revoked and the
user is forced to log in again. This is the implementation in
`packages/api/src/routes/auth.ts` and `packages/api/src/utils/auth.ts`.

### 5.2 Two-Factor Authentication

2FA uses TOTP (RFC 6238) via the `otplib` library. When the user enables
2FA, the API generates a 32-character base32 secret, stores it on the user
record, and returns an `otpauth://` URI that the frontend renders as a QR
code. The user scans it with Google Authenticator, Authy, or any compatible
app, and submits a 6-digit code to confirm. The API also generates 8
one-time backup codes that the user should store offline. Backup codes are
hashed with bcrypt before storage so that a database leak does not expose
them.

### 5.3 Encryption at Rest

The FTP passwords returned by MOFH are encrypted with AES-256-GCM before
being written to `hosting_accounts.password_encrypted`. The encryption key
is derived from `JWT_SECRET` using `scryptSync` with a static salt
(`'carsai-salt'`) and N=16384, r=8, p=1. The IV (12 bytes) and
authentication tag (16 bytes) are prepended to the ciphertext and the whole
blob is base64-encoded. Decryption only happens in memory when the user
explicitly requests to reveal the password.

### 5.4 Rate Limiting

Three tiers of rate limiting are applied in order of decreasing specificity.
The auth limiter (`5 requests / 15 minutes / IP`) wraps `/auth/login`,
`/auth/register`, and `/auth/forgot-password`. The register limiter
(`3 requests / hour / IP`) is layered on top of the auth limiter for
`/auth/register` only. The global limiter (`100 requests / 15 minutes / IP`)
wraps every other `/api/*` route. Limits are stored in memory by default;
for multi-instance deployments, configure `express-rate-limit` to use the
Redis store so that limits are shared across instances.

### 5.5 CORS and Helmet

CORS origins are configurable via `CORS_ORIGINS` (comma-separated). The
default allows `http://localhost:5173` and `http://localhost:4173` for
development. In production, set this to your exact origin
(`https://carsai.example.com`); never use `*` because credentials are
included (`credentials: true`). Helmet sets a strong baseline of HTTP
security headers: `X-Content-Type-Options: nosniff`,
`X-Frame-Options: DENY`, `Strict-Transport-Security: max-age=63072000`,
`Content-Security-Policy: default-src 'self'` (relaxed only for known
script/style sources), and `Referrer-Policy: strict-origin-when-cross-origin`.

### 5.6 Audit Logging

Every state-changing admin action inserts a row in `audit_logs` with the
acting user's ID, the action name (e.g. `user.suspend`), the resource type
and ID, the request IP, the user-agent, and an arbitrary JSON metadata
field. The audit log is append-only — there is no `DELETE` endpoint for
audit logs, and the table is excluded from the `clean` script. This trail is
critical for incident response and for compliance with data-protection
regulations.

---

## 6. Scalability Considerations

### 6.1 Vertical vs Horizontal

CARSAI HOST is designed to scale vertically first. A single 2-vCPU / 4-GB VPS
handles thousands of registered users and hundreds of concurrent API
requests because SQLite is extremely fast for this workload and the API
process is mostly I/O-bound (waiting on MOFH or SMTP). When vertical
scaling is exhausted, the recommended horizontal topology is: one writer
API instance + N read-only API instances behind a load balancer + a
PostgreSQL backend (replacing SQLite so multiple writers are safe) + a
Redis-backed Bull queue with multiple workers.

### 6.2 Read Replicas

For read replicas, the easiest path is to enable Litestream
(https://litestream.io) which streams SQLite WAL changes to S3-compatible
storage. Read replicas can then run `litestream restore` to get a
near-real-time copy. For larger deployments, migrate to PostgreSQL and use
its native streaming replication. The application code is unaffected
because Drizzle ORM abstracts the connection.

### 6.3 Queue Workers

Bull queue workers are horizontally scalable: spin up N worker processes
(pointing at the same Redis) and Bull will distribute jobs across them.
For SSL issuance (CPU-bound due to ACME challenges), 1-2 workers per vCPU
is optimal. For backups (I/O-bound on the iFastNet FTP side), 3-5 workers
per vCPU is fine because they spend most of their time waiting on FTP
transfers.

### 6.4 Caching

The frontend uses TanStack Query's built-in cache (5-minute stale time by
default). The API does not cache by default because every request is fast
and SQLite reads are cheap. If you add caching, use Redis with a short TTL
(60 seconds for read-heavy endpoints like `/blog/posts`) and always
invalidate on writes. Never cache authenticated responses without
including the user ID in the cache key.

---

## 7. Design Decisions and Trade-offs

### 7.1 Xera-Inspired UI

The visual design deliberately echoes Xera, a PHP hosting panel known for
its clean dark theme and sidebar-driven navigation. This was a conscious
choice to lower the learning curve for users migrating from other free
hosting panels. The trade-off is that the UI is opinionated — users who
want a completely custom theme will need to fork the Tailwind config and
override the `BRAND_COLORS` constants in
`packages/shared/src/constants/index.ts`.

### 7.2 Monorepo with pnpm Workspaces

A monorepo was chosen over separate repositories because the frontend,
backend, and mobile app share TypeScript types, Zod schemas, and i18n
strings. A change to a shared schema propagates to all consumers in a
single commit, and `pnpm --filter` lets you build only what changed. Turbo
caches build outputs so that `pnpm build` after a one-line change completes
in seconds. The trade-off is that the repository is large and contributors
must understand workspaces; this is mitigated by comprehensive docs and
clear package boundaries.

### 7.3 SQLite vs PostgreSQL

SQLite was chosen as the default to keep the install frictionless (no
database server to provision). The trade-off is that SQLite does not
support concurrent writers from multiple processes, so horizontal scaling
requires migrating to PostgreSQL. The Drizzle ORM abstraction makes this
migration a configuration change rather than a code rewrite. For 95% of
deployments SQLite is the right answer; the 5% that need PostgreSQL know
who they are.

### 7.4 REST vs GraphQL

REST was chosen over GraphQL for three reasons. First, the API surface is
small and well-defined (CRUD over a handful of resources) so GraphQL's
query flexibility is not needed. Second, REST is easier to cache at the
HTTP layer (CDN, Nginx) because every URL maps to a deterministic
response. Third, REST rate limiting is per-endpoint (5/hour for
`/auth/register`, 100/15min for everything else) which is harder to do well
with GraphQL's single endpoint. The trade-off is over-fetching on the
dashboard view, which is mitigated by dedicated `/dashboard/overview`
endpoints that return only the fields the UI needs.

### 7.5 XML-RPC for MOFH

MOFH exposes an XML-RPC API rather than REST or GraphQL. The
`packages/api/src/services/mofh-client.ts` module implements XML-RPC by
hand (no external library) to keep the dependency tree small and to allow
fine-grained control over escaping and parsing. The trade-off is that the
parser is regex-based and brittle to changes in MOFH's response format;
the mitigation is comprehensive logging of every raw response so that
failures can be diagnosed without reproducing them.

---

## 8. Sequence Diagrams

### 8.1 User Registration + Email Verification

```
User        Browser              API                SMTP            Database
 |  fill form   |                  |                  |                 |
|------------->|  POST /auth/register                |                 |
|              |----------------->|  validate (Zod)   |                 |
|              |                  |  hashPassword    |                 |
|              |                  |  gen verify token|                 |
|              |                  |  INSERT users    |                 |
|              |                  |----------------->|                 |
|              |                  |                  |                 |
|              |                  |  sendVerifyEmail |                 |
|              |                  |----------------->|  SMTP relay     |
|              |                  |                  |  -> user inbox  |
|              |  201 { id, email }                  |                 |
|              |<-----------------|                  |                 |
|  check inbox |                  |                  |                 |
|<-------------|                  |                  |                 |
|  click verify link              |                  |                 |
|------------->|  POST /auth/verify-email {token}    |                 |
|              |----------------->|  SELECT by token |                 |
|              |                  |----------------->|                 |
|              |                  |  UPDATE users    |                 |
|              |                  |   status=active  |                 |
|              |                  |   emailVerifiedAt|                 |
|              |                  |----------------->|                 |
|              |  200 { verified }                  |                 |
|              |<-----------------|                  |                 |
```

### 8.2 Account Creation via MOFH

```
User     Browser            API                 MOFH                iFastNet
|  click  |                  |                    |                     |
|-------->|  POST /accounts  |                    |                     |
|         |  {domain,pkg}    |                    |                     |
|         |----------------->|  check duplicates  |                     |
|         |                  |  INSERT (creating) |                     |
|         |                  |  mofh.createAccount|                     |
|         |                  |------------------>|  XML-RPC createacct |
|         |                  |                   |------------------>|
|         |                  |                   |  provision account |
|         |                  |                   |<------------------|
|         |                  |  parse result     |                     |
|         |                  |<------------------|                     |
|         |                  |  UPDATE (active,  |                     |
|         |                  |   encrypt pwd)    |                     |
|         |  201 {id,pwd once}                   |                     |
|         |<-----------------|                    |                     |
|  see credentials           |                    |                     |
|<--------|                  |                    |                     |
```

### 8.3 Refresh Token Rotation

```
Client                        API                          Database
 |  POST /auth/refresh          |                              |
 |  {refreshToken}              |                              |
 |----------------------------->|  verifyRefreshToken JWT      |
 |                              |  SELECT refresh_tokens WHERE |
 |                              |   token = ? AND revoked_at   |
 |                              |   IS NULL                    |
 |                              |----------------------------->|
 |                              |<-----------------------------|
 |                              |  if NOT found:               |
 |                              |    UPDATE refresh_tokens     |
 |                              |    SET revoked_at=now        |
 |                              |    WHERE family = ?          |
 |                              |    (REVOKE ENTIRE FAMILY)    |
 |                              |    return 401                |
 |                              |  else:                       |
 |                              |    UPDATE old: revoked_at,   |
 |                              |     replaced_by              |
 |                              |    INSERT new (same family)  |
 |                              |----------------------------->|
 |  200 { newAccess, newRefresh}                              |
 |<-----------------------------|                              |
```

The reuse-detection branch is critical: an attacker who steals a refresh
token and uses it will trigger the family-wide revocation, which logs out
the legitimate user on all devices. The legitimate user is then forced to
log in again with username + password + 2FA, which the attacker does not
have. This is the strongest practical defence against refresh token theft
without device-bound keys.
