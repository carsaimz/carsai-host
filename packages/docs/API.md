# CARSAI HOST — REST API Reference

This document is the canonical reference for every HTTP endpoint exposed by
the CARSAI HOST API. It is intended for frontend developers integrating the
React dashboard, mobile developers building the Capacitor app, and third-party
developers writing scripts against the public Developer API. Every endpoint is
versioned under `/api/v1/` and returns a standardised JSON envelope. All
examples use `curl` so they can be copy-pasted into a terminal; the same
requests work from any HTTP client (fetch, axios, Postman, httpie).

---

## 1. Conventions

### 1.1 Base URL

```
Production:  https://carsai.example.com/api/v1
Development: http://localhost:3000/api/v1
```

The version segment `/v1/` is part of every path. Breaking changes will be
published under `/v2/`, `/v3/`, etc. and the previous version will be
maintained for at least 12 months after the new version's release. The
non-versioned root `/api/` returns a small JSON document with `name`,
`version`, `docs`, and `health` links.

### 1.2 Authentication

Authenticated endpoints require an `Authorization: Bearer <accessToken>`
header. The access token is a JWT signed with `HS256` using the
`JWT_SECRET` env var. It expires in 15 minutes and must be refreshed using
the refresh token returned at login. Tokens carry the user's `sub` (id),
`email`, `username`, `role` (`user`, `moderator`, or `admin`), `locale`,
and a unique `jti` (JWT ID). The full payload type is defined in
`packages/api/src/utils/auth.ts` as `JwtPayload`.

### 1.3 Rate Limits

| Scope | Window | Max requests | Headers |
|-------|--------|--------------|---------|
| Global (all `/api/*`) | 15 minutes | 100 per IP | `RateLimit-*` |
| Auth (`/auth/login`, `/auth/forgot-password`) | 15 minutes | 5 per IP | `RateLimit-*` |
| Register (`/auth/register`) | 1 hour | 3 per IP | `RateLimit-*` |
| Developer API (token auth) | 1 minute | 60 per token | `RateLimit-*` |

When a limit is exceeded, the API returns `429 Too Many Requests` with body
`{ "success": false, "error": { "code": "RATE_LIMITED", "message": "Too many requests, slow down" } }`.
The `Retry-After` header contains the number of seconds to wait before
retrying.

### 1.4 Standard Response Envelope

Every response (success or error) uses the same top-level shape:

```typescript
interface ApiResponse<T> {
  success: boolean;       // true on 2xx, false on 4xx/5xx
  data?: T;               // present on success
  error?: {               // present on failure
    code: string;         // machine-readable, e.g. "EMAIL_TAKEN"
    message: string;      // human-readable, in English
    details?: Record<string, unknown>;
  };
  meta?: {                // present on paginated list endpoints
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
```

### 1.5 Error Codes

| HTTP | `code` | Meaning |
|------|--------|---------|
| 400 | `VALIDATION_ERROR` | Zod validation failed; `details` lists field errors |
| 400 | `INVALID_TOKEN` | Email-verify or password-reset token invalid/expired |
| 400 | `TOKEN_EXPIRED` | Password-reset token expired |
| 401 | `UNAUTHORIZED` | Missing or invalid JWT |
| 401 | `INVALID_CREDENTIALS` | Wrong email or password |
| 401 | `TWO_FACTOR_REQUIRED` | 2FA code required but not provided |
| 401 | `TWO_FACTOR_INVALID` | 2FA code wrong |
| 403 | `FORBIDDEN` | Authenticated but lacks permission |
| 403 | `EMAIL_NOT_VERIFIED` | Account pending email verification |
| 403 | `ACCOUNT_BANNED` | Account is banned |
| 404 | `NOT_FOUND` | Resource does not exist |
| 409 | `EMAIL_TAKEN` | Email already registered |
| 409 | `USERNAME_TAKEN` | Username already taken |
| 409 | `DOMAIN_TAKEN` | Domain already in use |
| 429 | `RATE_LIMITED` | Rate limit exceeded |
| 502 | `MOFH_CREATE_FAILED` | MOFH API rejected account creation |
| 502 | `MOFH_SUSPEND_FAILED` | MOFH API rejected suspension |
| 502 | `MOFH_ERROR` | Generic MOFH error |
| 503 | `MOFH_NOT_CONFIGURED` | Server lacks MOFH credentials |
| 500 | `INTERNAL_ERROR` | Unhandled server error (logged with stack) |

### 1.6 Pagination

List endpoints accept `?page=1&limit=20&sort=createdAt&order=desc`. The
`limit` is capped at 100. The response includes the `meta` object with
`page`, `limit`, `total`, and `totalPages`. Example:

```
GET /api/v1/tickets?page=2&limit=10
```

```json
{
  "success": true,
  "data": [ /* 10 tickets */ ],
  "meta": { "page": 2, "limit": 10, "total": 35, "totalPages": 4 }
}
```

---

## 2. Public Endpoints

These endpoints do not require authentication. They are the only endpoints
exposed to anonymous visitors on the public landing pages. They
deliberately do NOT expose any server statistics (uptime, CPU, RAM, account
counts) — those are only available in the authenticated admin area.

### 2.1 GET /health

Returns a minimal liveness probe. Use this for uptime monitoring (Uptime
Kuma, Pingdom, etc.).

| Property | Value |
|----------|-------|
| Auth required | No |
| Rate limited | Yes (global) |

**Example request:**

```bash
curl -s https://carsai.example.com/api/v1/health
```

**Example response (200):**

```json
{
  "success": true,
  "data": {
    "status": "ok",
    "timestamp": "2024-11-15T10:23:45.000Z"
  }
}
```

### 2.2 GET /info

Returns brand information: app name, version, supported locales, and
whether the installer lockfile exists. Used by the frontend to decide
whether to redirect to `/install`.

**Example response (200):**

```json
{
  "success": true,
  "data": {
    "name": "CARSAI HOST",
    "version": "1.0.0",
    "description": "Free web hosting platform with iFastNet + MOFH",
    "locales": ["pt", "en", "fr", "es"],
    "defaultLocale": "pt",
    "installed": true
  }
}
```

### 2.3 POST /contact

Submits the public contact form. Includes a honeypot field for bot
detection; if `honeypot` is non-empty, the API returns `200 { sent: true }`
without actually sending email, to silently drop bot submissions.

**Request body:**

```typescript
interface ContactRequest {
  name: string;        // 2-100 chars
  email: string;       // valid email
  subject: string;     // 3-200 chars
  message: string;     // 10-5000 chars
  honeypot?: string;   // anti-spam — must be empty
}
```

**Example request:**

```bash
curl -s -X POST https://carsai.example.com/api/v1/contact \
  -H 'Content-Type: application/json' \
  -d '{
    "name": "Jane Doe",
    "email": "jane@example.com",
    "subject": "Question about free hosting",
    "message": "Can I host multiple domains on one account?"
  }'
```

**Example response (200):**

```json
{ "success": true, "data": { "sent": true } }
```

**Error codes:** `VALIDATION_ERROR` (400) if any field fails validation.

---

## 3. Auth

All auth endpoints are rate-limited at 5 requests per 15 minutes per IP.
The `/auth/register` endpoint additionally allows only 3 requests per hour
per IP.

### 3.1 POST /auth/register

Creates a new user account in `pending` status and sends a verification
email. The user cannot log in until they click the verification link (which
calls `POST /auth/verify-email`).

**Request body:**

```typescript
interface RegisterRequest {
  email: string;
  username: string;        // 3-20 chars, [a-zA-Z0-9_]
  password: string;        // 8-72 chars, needs upper+lower+digit
  passwordConfirm: string; // must equal password
  firstName?: string;
  lastName?: string;
  locale?: 'pt' | 'en' | 'fr' | 'es';   // default 'pt'
  acceptTerms: true;       // literal true
}
```

**Example request:**

```bash
curl -s -X POST https://carsai.example.com/api/v1/auth/register \
  -H 'Content-Type: application/json' \
  -d '{
    "email": "jane@example.com",
    "username": "janedoe",
    "password": "S3curePass!",
    "passwordConfirm": "S3curePass!",
    "firstName": "Jane",
    "lastName": "Doe",
    "locale": "en",
    "acceptTerms": true
  }'
```

**Example response (201):**

```json
{
  "success": true,
  "data": { "id": "9b1f...", "email": "jane@example.com", "username": "janedoe" }
}
```

**Error codes:** `EMAIL_TAKEN` (409), `USERNAME_TAKEN` (409),
`VALIDATION_ERROR` (400), `RATE_LIMITED` (429).

### 3.2 POST /auth/verify-email

Activates a pending account after the user clicks the verification link.

**Request body:** `{ "token": "<32-hex-char-token>" }`

**Example response (200):** `{ "success": true, "data": { "verified": true } }`

**Error codes:** `TOKEN_REQUIRED` (400), `INVALID_TOKEN` (400).

### 3.3 POST /auth/login

Authenticates the user and returns access + refresh tokens. If 2FA is
enabled, the first call returns `401 TWO_FACTOR_REQUIRED`; the client
retries with `twoFactorCode` in the body.

**Request body:**

```typescript
interface LoginRequest {
  email: string;
  password: string;
  remember?: boolean;        // extends refresh to 30 days (future)
  twoFactorCode?: string;    // 6 digits, required if 2FA enabled
}
```

**Example response (200):**

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "9b1f...",
      "email": "jane@example.com",
      "username": "janedoe",
      "role": "user",
      "status": "active",
      "locale": "en"
    },
    "tokens": {
      "accessToken": "eyJhbGciOi...",
      "refreshToken": "eyJhbGciOi...",
      "expiresIn": 900
    }
  }
}
```

**Error codes:** `INVALID_CREDENTIALS` (401), `TWO_FACTOR_REQUIRED` (401),
`TWO_FACTOR_INVALID` (401), `EMAIL_NOT_VERIFIED` (403), `ACCOUNT_BANNED` (403).

### 3.4 POST /auth/refresh

Rotates the refresh token and issues a new access token. The old refresh
token is revoked and replaced; if a revoked token is presented, the entire
family is revoked (reuse detection).

**Request body:** `{ "refreshToken": "<jwt>" }`

**Example response (200):**

```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOi...",
    "refreshToken": "eyJhbGciOi...",
    "expiresIn": 900
  }
}
```

**Error codes:** `UNAUTHORIZED` (401) — invalid, expired, or revoked token.

### 3.5 POST /auth/logout

Revokes the current refresh token family. Requires the access token in the
`Authorization` header. After logout, any in-flight refresh token for this
family is rejected.

**Example request:**

```bash
curl -s -X POST https://carsai.example.com/api/v1/auth/logout \
  -H 'Authorization: Bearer <accessToken>'
```

**Example response (200):** `{ "success": true, "data": { "loggedOut": true } }`

### 3.6 GET /auth/me

Returns the full user record for the currently authenticated user.

**Example response (200):**

```json
{
  "success": true,
  "data": {
    "id": "9b1f...",
    "email": "jane@example.com",
    "username": "janedoe",
    "firstName": "Jane",
    "lastName": "Doe",
    "role": "user",
    "status": "active",
    "emailVerifiedAt": "2024-11-15T10:00:00.000Z",
    "twoFactorEnabled": false,
    "locale": "en",
    "createdAt": "2024-11-15T09:30:00.000Z"
  }
}
```

### 3.7 POST /auth/forgot-password

Triggers a password reset email. Always returns `{ sent: true }` even if
the email does not exist, to prevent email enumeration.

**Request body:** `{ "email": "jane@example.com" }`

### 3.8 POST /auth/reset-password

Resets the password using a token from the forgot-password email. The
token is single-use and expires in 1 hour.

**Request body:**

```typescript
{
  token: string;
  password: string;         // 8-72 chars, upper+lower+digit
  passwordConfirm: string;
}
```

**Error codes:** `INVALID_TOKEN` (400), `TOKEN_EXPIRED` (400).

### 3.9 2FA Endpoints

| Method | Path | Purpose | Auth |
|--------|------|---------|------|
| POST | `/auth/2fa/enable` | Generate secret + QR URI | Yes |
| POST | `/auth/2fa/confirm` | Verify first code, enable 2FA | Yes |
| POST | `/auth/2fa/disable` | Verify code, disable 2FA | Yes |

**`/auth/2fa/enable` response (200):**

```json
{
  "success": true,
  "data": {
    "secret": "JBSWY3DPEHPK3PXP",
    "otpauthUri": "otpauth://totp/CARSAI%20HOST:jane@example.com?secret=...",
    "backupCodes": ["A1B2C3D4", "E5F6G7H8", "..."]
  }
}
```

**`/auth/2fa/confirm` request:** `{ "secret": "...", "code": "123456" }`

**`/auth/2fa/confirm` response (200):**

```json
{ "success": true, "data": { "enabled": true, "backupCodes": ["...8 codes..."] } }
```

**`/auth/2fa/disable` request:** `{ "code": "123456" }`

---

## 4. Accounts (MOFH Integration)

These endpoints create and manage real hosting accounts on iFastNet's
infrastructure via the MOFH XML-RPC API. All require authentication; only
the account owner (or an admin) can perform mutations.

### 4.1 GET /accounts

Lists the authenticated user's hosting accounts. Returns `passwordEncrypted`
stripped from every row; use `GET /accounts/:id` to reveal the decrypted
password.

**Example response (200):**

```json
{
  "success": true,
  "data": [
    {
      "id": "acc-uuid-1",
      "userId": "9b1f...",
      "domain": "janedoe.yourdomain.com",
      "username": "chabc123",
      "status": "active",
      "packageName": "freehosting",
      "cpanelUrl": "https://janedoe.yourdomain.com:2083",
      "ftpHost": "ftp.janedoe.yourdomain.com",
      "mysqlHost": "localhost",
      "nameservers": "[\"ns1.byet.org\",\"ns2.byet.org\"]",
      "createdAt": "2024-11-15T10:00:00.000Z"
    }
  ]
}
```

### 4.2 POST /accounts

Creates a new hosting account by calling MOFH `createacct`. The FTP
password is returned exactly once in the response body — the client must
persist it (or rely on the encrypted copy in the database) because
subsequent list calls do not include it.

**Request body:**

```typescript
interface CreateAccountRequest {
  domain: string;            // 3-63 chars, hostname label
  subdomain?: string;        // alternative: subdomain prefix
  customDomain?: string;     // alternative: full custom domain
  package?: string;          // default 'freehosting'
  acceptTos: true;
}
```

**Example request:**

```bash
curl -s -X POST https://carsai.example.com/api/v1/accounts \
  -H 'Authorization: Bearer <accessToken>' \
  -H 'Content-Type: application/json' \
  -d '{
    "domain": "mysite",
    "package": "freehosting",
    "acceptTos": true
  }'
```

**Example response (201):**

```json
{
  "success": true,
  "data": {
    "id": "acc-uuid-2",
    "domain": "mysite.yourdomain.com",
    "username": "chxyz789",
    "password": "Aa1!bcDeFgHiJkLm",
    "status": "active",
    "cpanelUrl": "https://mysite.yourdomain.com:2083",
    "ftpHost": "ftp.mysite.yourdomain.com",
    "mysqlHost": "localhost",
    "nameservers": ["ns1.byet.org", "ns2.byet.org"]
  }
}
```

**Error codes:** `DOMAIN_TAKEN` (409), `MOFH_NOT_CONFIGURED` (503),
`MOFH_CREATE_FAILED` (502), `MOFH_ERROR` (502), `VALIDATION_ERROR` (400).

### 4.3 GET /accounts/:id

Returns a single account with the decrypted FTP password (only visible to
the owner or an admin). Use this when the user clicks "Show password" in
the dashboard.

**Example response (200):**

```json
{
  "success": true,
  "data": {
    "id": "acc-uuid-1",
    "domain": "janedoe.yourdomain.com",
    "username": "chabc123",
    "password": "Aa1!bcDeFgHiJkLm",
    "status": "active",
    "cpanelUrl": "https://janedoe.yourdomain.com:2083"
  }
}
```

**Error codes:** `NOT_FOUND` (404), `FORBIDDEN` (403).

### 4.4 POST /accounts/:id/suspend

Suspends the account via MOFH `suspendacct`. Stores the reason and
suspension timestamp.

**Request body:** `{ "reason": "Abuse — phishing content" }`

**Response (200):** `{ "success": true, "data": { "suspended": true } }`

### 4.5 POST /accounts/:id/unsuspend

Reactivates the account via MOFH `unsuspendacct`. Clears the suspension
reason and timestamp.

**Response (200):** `{ "success": true, "data": { "unsuspended": true } }`

### 4.6 POST /accounts/:id/reset-password

Generates a new 16-character password, calls MOFH `passwd`, encrypts the
new password, and returns it in the response (one-time show).

**Response (200):**

```json
{ "success": true, "data": { "password": "Nk2@pqRsTuVwXyZ1" } }
```

---

## 5. Tickets

Support tickets with priorities and departments. Users see only their own
tickets; admins and moderators see all.

### 5.1 GET /tickets

**Query params:** `?page=1&limit=20`

**Example response (200):**

```json
{
  "success": true,
  "data": {
    "tickets": [
      {
        "id": "tkt-uuid-1",
        "subject": "Cannot upload via FTP",
        "status": "open",
        "priority": "normal",
        "department": "technical",
        "createdAt": "2024-11-15T11:00:00.000Z",
        "updatedAt": "2024-11-15T11:00:00.000Z"
      }
    ],
    "page": 1,
    "limit": 20,
    "total": 1
  }
}
```

### 5.2 POST /tickets

**Request body:**

```typescript
interface CreateTicketRequest {
  subject: string;          // 5-120 chars
  body: string;             // 10-5000 chars
  priority?: 'low' | 'normal' | 'high' | 'urgent';  // default 'normal'
  department?: 'general' | 'technical' | 'abuse' | 'billing';
}
```

**Example response (201):**

```json
{ "success": true, "data": { "id": "tkt-uuid-2", "subject": "...", "status": "open" } }
```

### 5.3 GET /tickets/:id

Returns the ticket with all replies ordered by `createdAt` ascending.

**Example response (200):**

```json
{
  "success": true,
  "data": {
    "id": "tkt-uuid-1",
    "subject": "Cannot upload via FTP",
    "body": "I get a 530 login incorrect error...",
    "status": "open",
    "priority": "normal",
    "department": "technical",
    "replies": [
      {
        "id": "rpl-uuid-1",
        "body": "Can you share the FTP hostname?",
        "isStaff": true,
        "createdAt": "2024-11-15T11:05:00.000Z"
      }
    ]
  }
}
```

### 5.4 POST /tickets/:id/reply

**Request body:** `{ "body": "My FTP host is ftp.mysite.yourdomain.com" }`

**Response (201):** `{ "success": true, "data": { "id": "rpl-uuid-2" } }`

If the replying user is staff (admin/moderator), the ticket status is set
to `pending` (awaiting user response); otherwise it is set back to `open`.

---

## 6. Blog

Public read endpoints for published posts; admin-only write endpoints for
create/update/delete.

### 6.1 GET /blog/posts

**Query params:** `?category=&tag=&page=1&limit=20`

Returns an array of post summaries (no `content` field) ordered by
`publishedAt` descending.

**Example response (200):**

```json
{
  "success": true,
  "data": [
    {
      "id": "post-uuid-1",
      "slug": "welcome-to-carsai-host-9b1f",
      "title": "Welcome to CARSAI HOST",
      "excerpt": "A free hosting platform for everyone...",
      "category": "announcements",
      "tags": "[\"welcome\",\"launch\"]",
      "views": 142,
      "publishedAt": "2024-11-15T09:00:00.000Z"
    }
  ]
}
```

### 6.2 GET /blog/posts/:slug

Returns the full post including `content` (markdown). Increments `views`
as a side effect.

### 6.3 POST /blog/posts (admin)

**Request body:**

```typescript
interface CreatePostRequest {
  title: string;            // 3-200 chars
  excerpt?: string;         // max 500
  content: string;          // min 10, markdown
  coverImage?: string;      // URL
  category: string;         // 2-50 chars
  tags?: string[];          // max 10
  status?: 'draft' | 'published' | 'archived';
}
```

### 6.4 PUT /blog/posts/:id (admin)

Same body as POST. Updates the post; if `status` changes to `published`
and `publishedAt` was null, it is set to `now`.

### 6.5 DELETE /blog/posts/:id (admin)

Hard-deletes the post. Cascade-deletes any foreign-keyed rows.

---

## 7. Forum

Public read endpoints; authenticated create endpoints for topics and
replies.

### 7.1 GET /forum/categories

Returns all forum categories ordered by `order` ascending.

### 7.2 GET /forum/categories/:slug/topics

Returns all topics in a category ordered by `pinned` desc then
`lastReplyAt` desc.

### 7.3 GET /forum/topics/:id

Returns a single topic with all replies ordered by `createdAt` ascending.
Increments `views`.

### 7.4 POST /forum/topics (auth)

**Request body:**

```typescript
{
  categoryId: string;
  title: string;        // 3-200 chars
  body: string;         // 10-10000 chars, markdown
}
```

### 7.5 POST /forum/topics/:id/replies (auth)

**Request body:** `{ "body": "..." }` (2-10000 chars)

Returns `403 TOPIC_LOCKED` if the topic is locked.

---

## 8. Admin Endpoints

All admin endpoints require `role = 'admin'`. They expose aggregated
statistics (only in the authenticated admin area — never on public
endpoints) and user management operations.

### 8.1 GET /admin/stats

Returns platform-wide counts and server-level statistics. This is the only
endpoint that exposes system metrics (uptime, CPU, memory) — public
endpoints deliberately omit them.

**Example response (200):**

```json
{
  "success": true,
  "data": {
    "users": 1245,
    "accounts": 832,
    "activeAccounts": 798,
    "suspendedAccounts": 34,
    "openTickets": 12,
    "blogPosts": 47,
    "forumTopics": 218,
    "system": {
      "platform": "linux",
      "nodeVersion": "v20.18.0",
      "uptimeSeconds": 86420,
      "memoryMb": { "rss": 142, "heapUsed": 68, "heapTotal": 92 },
      "cpuCores": 2,
      "loadAvg": [0.42, 0.38, 0.31],
      "totalMemMb": 3952,
      "freeMemMb": 1184
    }
  }
}
```

### 8.2 GET /admin/users

**Query params:** `?page=1&limit=50` (limit max 200)

Returns a paginated list of users with sensitive fields (`passwordHash`,
`twoFactorSecret`) stripped.

### 8.3 POST /admin/users/:id/suspend

Sets the user's `status` to `suspended`. The user is immediately blocked
from making further API calls (the auth middleware rejects suspended
users with `403 FORBIDDEN`).

### 8.4 POST /admin/users/:id/activate

Sets the user's `status` back to `active`.

### 8.5 POST /admin/users/:id/role

**Request body:** `{ "role": "user" | "admin" | "moderator" }`

Returns `400 INVALID_ROLE` if the role is not in the allowed set.

---

## 9. Files

File operations against an account's home directory on the iFastNet FTP
server. The API acts as an FTP proxy: it receives the upload from the
browser, then transfers to iFastNet via the `basic-ftp` library.

### 9.1 GET /files/:accountId?path=/

Lists the contents of `path` on the account's FTP server. Returns an array
of `{ name, size, isDirectory, modifiedAt }`.

### 9.2 POST /files/:accountId

**Content-Type:** `multipart/form-data`

**Form fields:**
- `path` — destination directory (default `/`)
- `file` — the file blob(s)

Streams the upload to disk, then enqueues an async FTP transfer job.
Returns `202 Accepted` with `{ "jobId": "..." }`. Poll
`GET /files/:accountId/jobs/:jobId` for status.

### 9.3 DELETE /files/:accountId?path=/path/to/file

Deletes a file or directory (recursively) on the FTP server.

### 9.4 POST /files/:accountId/extract

Extracts a ZIP archive in-place on the FTP server. Uses `adm-zip` to
download, extract, and re-upload each entry. Returns `202 Accepted`.

### 9.5 POST /files/:accountId/compress

Creates a ZIP archive from a list of paths. Returns `202 Accepted` with a
job ID; the resulting archive is written to the user's home directory.

---

## 10. Domains

### 10.1 GET /domains

Lists the authenticated user's domains across all accounts.

### 10.2 POST /domains

**Request body:**

```typescript
{
  accountId: string;
  domain: string;        // full domain, validated
  type?: 'subdomain' | 'addon' | 'parked';
}
```

### 10.3 GET /domains/:id/dns

Lists DNS records for a domain.

### 10.4 POST /domains/:id/dns

Adds a DNS record. Validates the record type, TTL (60-86400), and priority
(0-65535 for MX/SRV).

```typescript
{
  type: 'A' | 'AAAA' | 'CNAME' | 'MX' | 'TXT' | 'NS' | 'SRV';
  name: string;
  value: string;
  ttl?: number;         // default 3600
  priority?: number;
}
```

### 10.5 DELETE /domains/:id/dns/:recordId

Deletes a single DNS record.

---

## 11. SSL

### 11.1 POST /ssl/issue

Issues an SSL certificate via the configured ACME provider. Enqueues a
background job (the ACME challenge + cert fetch takes 5-30 seconds).

**Request body:**

```typescript
{
  domainId: string;
  provider?: 'letsencrypt' | 'zerossl' | 'gogetssl';
}
```

**Response (202):** `{ "success": true, "data": { "jobId": "..." } }`

### 11.2 POST /ssl/renew/:domainId

Renews an existing certificate. Only allowed if the certificate is within
30 days of expiry.

### 11.3 GET /ssl/status/:domainId

Returns the current SSL status for a domain.

```json
{
  "success": true,
  "data": {
    "issued": true,
    "expiresAt": "2025-02-13T00:00:00.000Z",
    "provider": "letsencrypt",
    "daysRemaining": 89
  }
}
```

---

## 12. Backups

### 12.1 GET /backups?accountId=...

Lists backups for an account, newest first.

### 12.2 POST /backups

**Request body:**

```typescript
{
  accountId: string;
  provider?: 'local' | 'gdrive' | 'dropbox';
}
```

Enqueues a backup job. Returns `202 Accepted` with a job ID.

### 12.3 GET /backups/:id/download

Returns a signed URL (valid for 15 minutes) that allows downloading the
backup archive. For `local` provider, the URL points at `/uploads/...`;
for cloud providers, it is a pre-signed S3-style URL.

### 12.4 POST /backups/:id/restore

Enqueues a restore job. The restore overwrites the account's current files
on iFastNet — confirm with the user before calling.

---

## 13. Cron Jobs

### 13.1 GET /cron?accountId=...

Lists cron jobs for an account.

### 13.2 POST /cron

**Request body:**

```typescript
{
  accountId: string;
  name: string;          // 3-100 chars
  command: string;       // 1-500 chars, shell command
  schedule: string;      // cron expression, validated by regex
}
```

The cron expression is validated server-side against a strict regex that
accepts both 5-field expressions and the `@yearly`, `@monthly`,
`@weekly`, `@daily`, `@hourly` macros.

### 13.3 PUT /cron/:id

Updates the schedule, command, or active flag.

### 13.4 DELETE /cron/:id

Deletes the cron job.

---

## 14. Webhooks

### 14.1 GET /webhooks

Lists the user's webhooks.

### 14.2 POST /webhooks

**Request body:**

```typescript
{
  url: string;           // https URL
  events: string[];      // min 1, max 20, e.g. ["account.created", "ticket.replied"]
  active?: boolean;
}
```

The API generates a random `secret` and returns it in the response. The
secret is used to sign outbound deliveries with HMAC-SHA256; the recipient
verifies the signature in the `X-Carsai-Signature` header.

### 14.3 PUT /webhooks/:id

Updates URL, events, or active flag. The secret is not rotated on update.

### 14.4 DELETE /webhooks/:id

Deletes the webhook. Pending deliveries are cancelled.

### 14.5 GET /webhooks/:id/deliveries

Returns the delivery history (last 100 deliveries) with HTTP status,
response body (truncated to 1 KB), and timestamp.

---

## 15. API Tokens (Developer API)

API tokens allow third-party scripts to authenticate without a JWT. They
are scoped and rate-limited separately (60 requests/minute per token).

### 15.1 POST /api-tokens

**Request body:**

```typescript
{
  name: string;          // 3-50 chars
  scopes?: string[];     // e.g. ["accounts:read", "tickets:write"]
}
```

Returns the token in plaintext exactly once:

```json
{
  "success": true,
  "data": {
    "id": "tok-uuid-1",
    "name": "CI deployment script",
    "token": "csk_live_aBcDeFgHiJkLmN...",
    "scopes": ["accounts:read", "tickets:write"]
  }
}
```

Store the token immediately — only a hash is persisted.

### 15.2 GET /api-tokens

Returns metadata for all tokens (no plaintext).

### 15.3 DELETE /api-tokens/:id

Revokes the token. In-flight requests with the token are rejected on the
next call.

### 15.4 Using a Token

Pass the token in the `Authorization` header with the `Token` scheme
(distinguished from JWT's `Bearer`):

```
Authorization: Token csk_live_aBcDeFgHiJkLmN...
```

The auth middleware checks for `Bearer` first, then `Token`. Token requests
are subject to scope checks; a request to `POST /accounts` with a token
that only has `accounts:read` returns `403 FORBIDDEN` with code
`INSUFFICIENT_SCOPE`.

---

## 16. WebSocket Events

The API exposes a WebSocket endpoint at `wss://carsai.example.com/ws` for
real-time notifications. Authenticate by passing the access token as a
query parameter (`?token=...`) on connection; the server responds with
`{ "type": "connected", "userId": "..." }` or closes the connection with
code `4401` if the token is invalid.

### 16.1 Event Types

| Event | Payload | Triggered by |
|-------|---------|--------------|
| `notification.created` | `{ id, type, title, body, link, createdAt }` | Any notification row inserted for the user |
| `account.status_changed` | `{ accountId, oldStatus, newStatus, reason? }` | Account suspended/unsuspended |
| `ticket.replied` | `{ ticketId, replyId, byStaff, createdAt }` | New reply on a ticket the user owns or is assigned |
| `blog.published` | `{ slug, title, publishedAt }` | New blog post published |
| `forum.replied` | `{ topicId, replyId, userId, createdAt }` | New reply on a topic the user watches |
| `backup.completed` | `{ backupId, accountId, sizeMb, url? }` | Backup job finished successfully |
| `backup.failed` | `{ backupId, accountId, error }` | Backup job failed |
| `ssl.issued` | `{ domainId, expiresAt }` | SSL cert issued |
| `ssl.expiring` | `{ domainId, daysRemaining }` | SSL cert within 14 days of expiry |

### 16.2 Client-to-Server Messages

| Message | Purpose |
|---------|---------|
| `{ "type": "ping" }` | Keep-alive (server replies `{ "type": "pong" }`) |
| `{ "type": "subscribe", "channel": "tickets" }` | Subscribe to a channel (default: all user-relevant channels) |
| `{ "type": "unsubscribe", "channel": "tickets" }` | Stop receiving events for a channel |

---

## 17. Versioning and Compatibility

The API version is incremented when a breaking change is introduced.
Breaking changes include: removing an endpoint, changing a required
parameter, changing the type of a response field, or changing the
semantics of a status code. Additive changes (new endpoints, new optional
parameters, new response fields) do not require a version bump. The
current version is `v1` and is committed to be supported until at least
the end of 2026. The `/api/v1/info` endpoint returns the current version
so clients can detect upgrades.
