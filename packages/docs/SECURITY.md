# CARSAI HOST — Security Practices

This document describes the security architecture, threat model, and
operational practices that keep CARSAI HOST and its users safe. It is
intended for security researchers who want to evaluate the platform
before deploying it, for operators who need to harden their
installations, and for contributors who want to understand the security
implications of changes they are about to make. Security is treated as
a first-class concern: every design decision in the codebase is
evaluated against the threats listed in section 11.

---

## 1. Reporting Vulnerabilities

If you believe you have found a security vulnerability in CARSAI HOST,
please report it responsibly. Do not open a public GitHub issue for
security-sensitive bugs. Instead, email the details to
**security@carsai.host** with a clear description of the issue, steps
to reproduce, and the impact you have assessed. You should receive an
acknowledgement within 48 hours and a substantive response within 5
business days.

For particularly sensitive reports, encrypt your email with our PGP key
(fingerprint `9F3C 1A2B 7D8E 4C5A 9B6D 1E2F 3A4B 5C6D 7E8F 9A0B`,
available on the keyservers and at https://carsai.host/.well-known/pgp.asc).
Include your own PGP public key if you want the response encrypted.

We operate a **90-day responsible disclosure window**. After you report,
we will work with you to validate and fix the issue. We will not take
legal action against researchers who act in good faith, avoid harming
users, and give us reasonable time to remediate before publishing. We
are happy to extend the disclosure window if a fix turns out to be
more complex than initially estimated — just ask. We do not currently
offer a monetary bug bounty, but we publicly credit researchers in our
release notes and security advisories unless they prefer to remain
anonymous.

---

## 2. Authentication Security

### 2.1 Password Hashing

User passwords are hashed with **bcrypt** at cost factor **12**
(2^12 = 4,096 rounds). This is the value of `BCRYPT_ROUNDS` in
`packages/api/src/utils/auth.ts`. Cost 12 takes approximately 250
milliseconds to verify on a 2-vCPU VPS, which is fast enough for
interactive login but slow enough to make brute-force guessing of
stolen hashes economically impractical. The cost factor can be raised
in a future release without requiring users to reset their passwords:
bcrypt supports incremental cost upgrades by re-hashing on next login.

The bcrypt output includes the salt and cost factor in the hash string
itself, so no separate salt column is needed. Passwords longer than 72
bytes are truncated by bcrypt (a limitation of the Blowfish cipher);
the Zod `registerSchema` enforces a 72-character maximum to make this
explicit rather than silent.

### 2.2 JWT Access Tokens

Access tokens are JSON Web Tokens signed with `HS256` using the
`JWT_SECRET` environment variable. They expire in **15 minutes** by
default (configurable via `JWT_EXPIRES_IN`). The short lifetime
limits the blast radius of a stolen token: even if an attacker
intercepts a token, they have at most 15 minutes to use it before it
expires. The payload includes `sub` (user ID), `email`, `username`,
`role`, `locale`, `type: 'access'`, and a unique `jti` (JWT ID) for
revocation tracking. The issuer (`iss`) and audience (`aud`) claims
are set to `carsai-host` and `carsai-host-users` respectively and
verified on every request.

### 2.3 Refresh Tokens with Rotation

Refresh tokens are JWTs signed with a **separate** secret
(`JWT_REFRESH_SECRET`) and expire in **7 days**. They carry a `family`
claim (a UUID generated at login) that ties them to a session lineage.
Every call to `POST /auth/refresh` rotates the token: the old refresh
token is marked `revoked_at` and `replaced_by` the new token's ID, and
a new row is inserted in `refresh_tokens` with the same `family`.

If a refresh token is presented that has already been revoked, the
entire `family` is revoked — every refresh token ever issued for that
session is invalidated and the user is forced to log in again. This is
the standard defence against refresh token theft: an attacker who
steals a refresh token and uses it will trigger family-wide revocation,
which logs out the legitimate user (annoying but safe) and prevents the
attacker from continuing to use the stolen token. The detection and
revocation logic is in `packages/api/src/routes/auth.ts` in the
`/auth/refresh` handler.

### 2.4 Two-Factor Authentication

2FA is implemented with **TOTP** (RFC 6238) via the `otplib` library.
Users opt in via the profile page; the API generates a 32-character
base32 secret, stores it on the `users.two_factor_secret` column, and
returns an `otpauth://` URI that the frontend renders as a QR code. The
user scans it with Google Authenticator, Authy, 1Password, or any
compatible TOTP app and submits a 6-digit code to confirm enrollment.

Eight one-time backup codes are generated at enrollment time. The user
should store them offline (printed, in a password manager, etc.) and
use them if they lose access to their TOTP device. Each backup code
can be used exactly once; the codes are stored as bcrypt hashes so
that a database leak does not expose them. After enrollment, the login
endpoint requires a `twoFactorCode` field in the request body; without
it, the API returns `401 TWO_FACTOR_REQUIRED`.

---

## 3. Authorization

### 3.1 Role-Based Access Control

CARSAI HOST implements three roles: `user` (default), `moderator`, and
`admin`. The role is stored on the `users.role` column and included in
the JWT payload. The auth middleware in
`packages/api/src/middleware/auth.ts` exposes four guards:

- `optionalAuth` — attaches `req.user` if a valid token is present,
  otherwise proceeds without one. Used by blog/forum read endpoints
  that show different content to logged-in users.
- `requireAuth` — rejects with `401 UNAUTHORIZED` if no valid token.
  Used by all authenticated user endpoints.
- `requireStaff` — requires `role` in `['admin', 'moderator']`. Used
  by ticket reply endpoints where staff replies change the ticket
  status to `pending`.
- `requireAdmin` — requires `role === 'admin'`. Used by all `/admin/*`
  endpoints and by blog/forum write endpoints.

The middleware fetches the user record fresh from the database on
every request (rather than trusting the JWT payload) so that role or
status changes take effect immediately. A user suspended by an admin
is blocked from the API on their very next request, even if their
access token has not yet expired.

### 3.2 Resource Ownership Checks

Every endpoint that operates on a specific resource (account, ticket,
domain, etc.) checks that the authenticated user owns the resource
before allowing the operation. The pattern in
`packages/api/src/routes/accounts.ts` is:

```typescript
if (account.userId !== req.user!.id && req.user!.role !== 'admin') {
  return forbidden(res);
}
```

This pattern is repeated in every route that touches a resource. Admins
are exempt from the ownership check so they can manage any user's
resources, but their actions are logged in the `audit_logs` table for
accountability.

---

## 4. Input Validation

All request bodies are validated with **Zod** schemas defined in
`packages/shared/src/schemas/index.ts`. The same schemas are imported
by the frontend (for client-side validation and form errors) and by
the backend (for server-side validation). This shared-schema approach
guarantees that the client and server agree on what constitutes a
valid input, eliminating an entire class of bugs where the client
permits something the server rejects (or vice versa).

The `validate` middleware in `packages/api/src/middleware/validate.ts`
wraps the Zod `parse` call and returns `400 VALIDATION_ERROR` with a
`details` object listing every field-level error. Example error
response:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": {
      "email": "Email inválido",
      "password": "Requer pelo menos 1 maiúscula"
    }
  }
}
```

Zod schemas enforce type, length, regex, and enum constraints. They
also enforce cross-field rules via `.refine()` (e.g. password must
equal passwordConfirm). Refinement errors are attached to the
specified field path so the frontend can display them next to the
correct input.

---

## 5. SQL Injection Prevention

All database access goes through **Drizzle ORM**, which compiles
queries into parameterised SQL strings. No user input is ever
concatenated into a SQL string. Example from
`packages/api/src/routes/auth.ts`:

```typescript
const userRow = await db
  .select()
  .from(schema.users)
  .where(eq(schema.users.email, email))   // email is a parameter, not interpolated
  .limit(1);
```

Drizzle's `eq` helper generates `WHERE "email" = ?` and binds the
`email` value as a SQLite parameter. Even if an attacker submitted
`' OR 1=1 --` as their email, the string would be treated as a
literal value and the query would return zero rows (because no user
has that email).

To verify that no raw SQL has slipped in, the codebase has an ESLint
rule that forbids `db.raw(...)` and `sql\`...\`` template literals
that contain user input. The only raw SQL in the codebase is in
`packages/api/migrations/0001_initial.sql` and in the
`PRAGMA journal_mode = WAL` line in `packages/api/src/db/index.ts`,
neither of which touches user input.

---

## 6. XSS Prevention

Cross-Site Scripting is prevented by three layers. First, React
auto-escapes all interpolated values by default — `<div>{userInput}</div>`
becomes `&lt;script&gt;...` in the HTML output, not an executed
script. The only way to render unescaped HTML in React is to use
`dangerouslySetInnerHTML`, which is forbidden by an ESLint rule and
would not pass code review.

Second, the API sets a strict **Content-Security-Policy** header via
Helmet. The default policy is `default-src 'self'`, with relaxations
only for known script/style sources (the Vite bundle on the same
origin, Google Fonts for the typography, and the QR code library's
inline styles). Inline scripts are forbidden by `script-src 'self'`,
which blocks the most common XSS vector (an attacker injecting an
`<script>` tag into a rendered page).

Third, the API sets `X-Content-Type-Options: nosniff` and
`X-Frame-Options: DENY` to prevent MIME-sniffing attacks and
clickjacking. The `Referrer-Policy: strict-origin-when-cross-origin`
header prevents leaking the full URL (which may contain sensitive
query parameters) to third-party sites via the Referer header.

---

## 7. CSRF Protection

Cross-Site Request Forgery is mitigated by three measures. First,
the API uses **Bearer token authentication** (not cookies), so a
cross-origin request from a malicious site cannot include the user's
credentials — the attacker would need to know the JWT, which is
stored in `localStorage` and never sent automatically by the browser.

Second, the CORS configuration explicitly lists the allowed origins
(`CORS_ORIGINS` env var) and rejects cross-origin requests with
`credentials: true` from any other origin. This means a malicious
site at `https://evil.com` cannot make authenticated requests to your
API even if the user is logged in to CARSAI HOST in another tab.

Third, for state-changing forms that submit via traditional POST
rather than the SPA's fetch API, a CSRF token is embedded in the
form as a hidden field and verified server-side. This is currently
used only by the installer wizard (which runs before JWT
authentication is available); the main SPA does not need CSRF tokens
because it uses the Bearer header pattern.

Cookies set by the API (e.g. the `locale` cookie) use the
`SameSite=Lax` attribute, which prevents them from being sent on
cross-site POST requests. This is defence in depth: even if a future
feature accidentally introduces a cookie-based session, the SameSite
attribute will block CSRF.

---

## 8. Rate Limiting

Three tiers of rate limiting are applied. The global limiter allows
**100 requests per 15 minutes per IP** across all `/api/*` endpoints.
The auth limiter allows **5 requests per 15 minutes per IP** on
`/auth/login`, `/auth/forgot-password`, and `/auth/register`. The
register limiter is even stricter: **3 requests per hour per IP** on
`/auth/register` alone, to prevent automated account creation.

Rate limits are enforced by `express-rate-limit` with the in-memory
store by default. For multi-instance deployments (more than one API
process behind a load balancer), the in-memory store is insufficient
because each instance has its own counter. In that case, configure
`express-rate-limit` to use the Redis store so that limits are shared
across instances. The configuration is documented in
`packages/api/src/index.ts` and the env var `REDIS_URL` is already
wired up.

When a limit is exceeded, the API returns `429 Too Many Requests`
with a `Retry-After` header. The response body includes the
`RATE_LIMITED` error code so the frontend can display a localised
message ("Too many attempts, try again in X minutes") rather than a
generic error.

---

## 9. Encryption at Rest

### 9.1 FTP Passwords

The FTP passwords returned by MOFH are encrypted with **AES-256-GCM**
before being stored in `hosting_accounts.password_encrypted`. The
encryption key is derived from `JWT_SECRET` using `scryptSync` with
the static salt `'carsai-salt'` and parameters N=16384, r=8, p=1
(memory cost ~32 MB, takes ~100ms on commodity hardware). The
encrypted blob is `base64(iv(12) || tag(16) || ciphertext)`.

The GCM mode provides both confidentiality and authenticity: an
attacker who modifies the ciphertext will cause the `decrypt()`
function to throw (the authentication tag will not match), so
tampering is detected rather than producing corrupted plaintext. The
implementation is in `packages/api/src/utils/auth.ts`.

### 9.2 JWT Secret Derivation

The same `scryptSync` call is used to derive a 32-byte AES key from
`JWT_SECRET`. This means that rotating `JWT_SECRET` invalidates all
encrypted FTP passwords — they must be reset via
`POST /accounts/:id/reset-password`. This coupling is intentional: if
an attacker steals the database but not the environment, they cannot
decrypt the passwords; if an attacker steals the environment but not
the database, they have nothing to decrypt. Both must be compromised
simultaneously for the encryption to fall.

### 9.3 2FA Secrets and Backup Codes

The TOTP secret (`users.two_factor_secret`) is stored in plaintext
because it must be readable to generate the `otpauth://` URI on
re-enrollment. This is the standard practice for TOTP — the secret
is not a password, it is a shared symmetric key. The backup codes
are hashed with bcrypt (cost 12) so that a database leak does not
expose them.

---

## 10. HTTPS Enforcement

In production, the API is served exclusively over HTTPS. Nginx
terminates TLS with a Let's Encrypt certificate (see
`DEPLOYMENT.md` for the certbot procedure) and proxies plain HTTP to
the Express process on `127.0.0.1:3000`. The `Strict-Transport-Security`
header (HSTS) is set with `max-age=63072000` (2 years) and
`includeSubDomains; preload`, which instructs browsers to refuse any
non-HTTPS connection to the domain for the next two years.

In development, HTTPS is not enforced — Vite serves over plain HTTP on
`localhost:5173` and the API on `localhost:3000`. The HSTS header is
not set in development because it would prevent testing HTTP-only
integrations. The `NODE_ENV=development` env var is the switch that
controls this; Helmet automatically omits HSTS when `NODE_ENV !==
'production'`.

Certificate renewal is automated via the `certbot` systemd timer,
which checks twice daily and renews any certificate within 30 days of
expiry. The renewal command runs `certbot renew --quiet && systemctl
reload nginx`, which performs a graceful Nginx reload to pick up the
new certificate without dropping in-flight connections.

---

## 11. Audit Logging

Every state-changing admin action inserts a row in the `audit_logs`
table with the following fields:

| Column | Content |
|--------|---------|
| `id` | UUID |
| `user_id` | The acting user (null if action was unauthenticated) |
| `action` | Dotted name, e.g. `user.suspend`, `account.create`, `role.change` |
| `resource` | Resource type, e.g. `user`, `hosting_account`, `ticket` |
| `resource_id` | UUID of the affected resource |
| `ip` | Request IP (from `X-Forwarded-For` if behind proxy) |
| `user_agent` | Full User-Agent string |
| `metadata` | JSON object with action-specific details (e.g. `{"reason":"abuse"}`) |
| `created_at` | ISO 8601 timestamp |

The audit log is **append-only**: there is no `DELETE` endpoint for
audit logs, and the table is excluded from the `clean` script. This
ensures that an attacker who gains admin access cannot cover their
tracks by deleting the log of their own actions. The audit log should
be exported daily to an off-host location (S3, an external syslog
server) so that an attacker who compromises the host cannot tamper
with the on-disk log either.

The audit log is queryable via `GET /admin/audit-logs` (admin only)
with filters by `user_id`, `action`, `resource`, and date range. The
frontend renders it as a paginated table with a "Show details" button
that expands the `metadata` JSON.

---

## 12. Secret Management

All secrets are stored in environment variables on the host system.
The `.env` file (in `packages/api/.env`) is loaded by `dotenv` at
process start and is **gitignored** — it must never be committed to
the repository. The `.env.example` file is committed and serves as
documentation of the required variables; it contains placeholder
values that are obviously not real secrets.

For Docker deployments, secrets should be passed via the
`docker-compose.yml` `environment:` block (which reads from a
`.env` file in the deployment directory) or, for higher security, via
Docker secrets mounted as files. The `JWT_SECRET` and
`JWT_REFRESH_SECRET` should be generated with `openssl rand -hex 32`
and never reused across environments.

The GitHub PAT used for repository operations is stored at
`/home/z/my-project/.github-token` with `chmod 600` permissions and
is read by git's credential helper. It is never written to a
`.env` file, never logged, and never exposed to the application code.
If you fork CARSAI HOST, generate your own PAT and store it in the
same location — do not reuse the upstream PAT.

For production deployments with multiple servers or containers, use a
secrets manager (HashiCorp Vault, AWS Secrets Manager, Doppler) rather
than copying `.env` files around. The application code reads from
`process.env` and is agnostic to how the env vars were set, so no
code changes are needed to switch from `.env` files to a secrets
manager.

---

## 13. Dependency Security

### 13.1 pnpm audit

The repository runs `pnpm audit --prod` on every CI build. The audit
checks the `pnpm-lock.yaml` against the GitHub Advisory Database and
fails the build if any production dependency has a known
vulnerability with a CVSS score of 7.0 or higher. Dev-only
vulnerabilities are reported but do not fail the build, because they
do not ship to production.

To run the audit locally:

```bash
pnpm audit --prod
```

To fix a vulnerability, update the affected package to a non-vulnerable
version. If the update is a breaking change, pin the patched version
in `package.json` and run `pnpm update <package>` to refresh the
lockfile.

### 13.2 Dependabot

The repository has Dependabot enabled via
`.github/dependabot.yml`. Dependabot checks for updates weekly and
opens pull requests for each outdated dependency. Minor and patch
updates are auto-merged if CI passes; major updates require manual
review. The configuration covers both `npm` (the application
dependencies) and `github-actions` (the CI workflow dependencies).

### 13.3 Renovate Alternative

Some maintainers prefer Renovate over Dependabot for its finer-grained
configuration (e.g. grouping all `@carsai/*` packages into a single
PR). If you fork the repository, you can disable Dependabot in
`.github/dependabot.yml` and enable Renovate via the Renovate GitHub
App. The `renovate.json` preset is not currently committed but the
team is happy to add one if there is demand.

---

## 14. Mobile Security

The Capacitor mobile app (`packages/mobile`) extends the web frontend
with native capabilities. Three additional security measures apply to
the mobile build:

### 14.1 Biometric Authentication

The mobile app supports Face ID (iOS) and fingerprint (Android) login
via the `@capacitor-community/biometric-auth` plugin. On first login,
the user can opt to enable biometric login; the app stores the JWT
refresh token in the device's secure enclave (iOS Keychain / Android
Keystore) and uses biometric authentication to unlock it. The token
is never written to `localStorage` on mobile — only to the secure
enclave, which is hardware-backed on modern devices.

### 14.2 Secure Storage

All sensitive data (refresh token, MOFH credentials if cached for
offline use, 2FA secrets) is stored via `@capacitor-community/secure-storage`,
which delegates to Keychain on iOS and EncryptedSharedPreferences on
Android. Both are backed by hardware security modules on devices that
have them (iPhone 5s+, most Android phones since 2018). On devices
without hardware backing, the data is encrypted with a key derived
from the user's device passcode.

### 14.3 Certificate Pinning

The mobile app pins the API server's TLS certificate to prevent
man-in-the-middle attacks on hostile networks (public Wi-Fi, carrier
proxies). Pinning is configured in `capacitor.config.ts` via the
`@capacitor-community/http` plugin's `sslPinning` option, which takes
an array of SHA-256 fingerprints of the expected certificate chain.
If the server presents a certificate that does not match any pinned
fingerprint, the request is rejected at the native layer before it
reaches the JavaScript code.

Certificate pinning requires updating the app whenever the server
certificate changes (e.g. after Let's Encrypt renewal, which happens
every 60 days). To avoid breaking the app on every renewal, pin the
**intermediate** certificate (which is stable for years) rather than
the leaf certificate (which rotates every 90 days). The Let's Encrypt
R3 and E1 intermediates are good choices.

---

## 15. Threat Model Summary

| Threat | Mitigation |
|--------|------------|
| Stolen JWT access token | 15-minute expiry limits window |
| Stolen refresh token | Rotation + family-wide revocation on reuse |
| Stolen database file | Passwords bcrypt-hashed; FTP passwords AES-256-GCM encrypted |
| Brute-force login | Auth rate limit (5/15min) + bcrypt cost 12 |
| Account enumeration | `/auth/forgot-password` returns `{sent:true}` regardless |
| SQL injection | Drizzle ORM parameterised queries; no raw SQL with user input |
| XSS | React auto-escaping + CSP `script-src 'self'` |
| CSRF | Bearer token auth + SameSite cookies + CORS allow-list |
| MITM on mobile | Certificate pinning (intermediate CA) |
| Supply-chain attack | pnpm audit + Dependabot + lockfile committed |
| Insider admin abuse | Audit log (append-only, off-host export) |
| DDoS | Nginx rate limiting + Cloudflare in front (recommended) |

This threat model is reviewed quarterly and updated whenever a new
feature is added that introduces a new trust boundary. The review is
documented in the project's security wiki and any changes to the
threat model are announced in the release notes.
