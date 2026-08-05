# CARSAI HOST — MOFH (My Own Free Hosting) Integration Guide

This document describes how CARSAI HOST integrates with iFastNet (Byet) via
the MOFH (My Own Free Hosting) XML-RPC API. MOFH is the reseller platform
that powers iFastNet's free hosting offering; it exposes a small but
powerful set of operations for provisioning, suspending, and managing
cPanel/VistaPanel hosting accounts. CARSAI HOST wraps this API in the
`MofhClient` class at `packages/api/src/services/mofh-client.ts` so that
the rest of the codebase never touches XML-RPC directly.

---

## 1. What is MOFH and iFastNet / Byet?

iFastNet is a UK-based hosting company that operates the Byet brand of free
web hosting. Byet provides free shared hosting accounts with Apache, PHP,
MySQL, FTP, and a VistaPanel control panel (a re-skinned cPanel) at no
cost to the end user. The company monetises through optional paid upgrades
on the same infrastructure, but the free tier is genuinely free and has
been operating continuously since 2006.

MOFH (My Own Free Hosting) is iFastNet's reseller program. It allows third
parties to brand the free hosting offering under their own domain name and
manage accounts through an XML-RPC API. As a MOFH reseller you get a
custom nameserver pair (e.g. `ns1.yourresellerdomain.com`), a custom
control panel URL, and the ability to create unlimited free hosting
accounts. The reseller program is free to join; iFastNet makes money when
your users upgrade to paid plans, and they share a commission with you.

CARSAI HOST uses MOFH as its real infrastructure backend. When a user
clicks "Create account" in the CARSAI HOST dashboard, the API calls
MOFH's `createacct` operation; MOFH in turn provisions an Apache virtual
host, an FTP account, a MySQL database, and a VistaPanel login on
iFastNet's servers. CARSAI HOST stores the resulting credentials
(encrypted) in its own SQLite database so the user can retrieve them
without re-contacting MOFH.

---

## 2. Registering as a Reseller

### 2.1 Sign Up

To use MOFH you need an active reseller account. Registration is free and
takes about 5 minutes.

1. Open https://ifastnet.com/affiliate.html in your browser.
2. Click **Sign Up** under the "Reseller" section.
3. Fill in the form with your name, email, country, and a reseller
   subdomain (this will be the branded domain your users see, e.g.
   `carsai.byethost.com`).
4. Check your email for the activation link and click it.
5. Log in to the reseller panel at
   https://panel.myownfreehost.com/reseller/.

### 2.2 Configure Your Branding

Inside the reseller panel, navigate to **Settings → Branding**. Configure
the following:

- **Reseller domain**: the domain users will see in their cPanel URL
  (e.g. `yourdomain.com`). If you don't own a domain, iFastNet will
  provide a `*.byethost.com` subdomain.
- **Nameserver pair**: typically `ns1.byet.org` and `ns2.byet.org` for
  resellers; for custom nameservers, register them with your domain
  registrar pointing at iFastNet's IP addresses (shown in the panel).
- **Default package**: the resource limits (disk, bandwidth, databases,
  FTP accounts) applied to new accounts. The default `freehosting`
  package is fine for most use cases.
- **Default language**: the cPanel/VistaPanel UI language. CARSAI HOST
  sets this per-account based on the user's `locale` field.

### 2.3 Obtain API Credentials

Navigate to **Settings → API** in the reseller panel. You will see two
fields:

- **Reseller Username**: typically your reseller subdomain (e.g.
  `carsai_12345678`).
- **Reseller Password**: a long random string. Use the **Regenerate**
  button if you suspect it has been compromised.

Copy both values into your CARSAI HOST `.env` file:

```bash
MOFH_RESELLER_USERNAME=carsai_12345678
MOFH_RESELLER_PASSWORD=abc123def456ghi789jkl012mno345pqr678
MOFH_API_URL=https://panel.myownfreehost.com/xml-api
MOFH_DEFAULT_PACKAGE=freehosting
MOFH_DEFAULT_DOMAIN=yourdomain.com
MOFH_DEFAULT_LANGUAGE=en
```

Restart the API for the changes to take effect. The startup log will no
longer print the warning `MOFH not configured`.

---

## 3. API Endpoint Structure

### 3.1 Base URL

```
https://panel.myownfreehost.com/xml-api
```

All operations are POST requests to this single URL. The operation name is
the `<methodName>` element inside the XML-RPC `<methodCall>` envelope;
there is no path component per operation.

### 3.2 Authentication

HTTP Basic Auth with `username:password` where both are your reseller
credentials. The `Authorization` header is `Basic <base64(username:password)>`.
The `MofhClient` class constructs this header in
`packages/api/src/services/mofh-client.ts`:

```typescript
const auth = Buffer.from(`${this.username}:${this.password}`).toString('base64');
// ...
headers: { Authorization: `Basic ${auth}` }
```

### 3.3 Request Format

Requests are XML-RPC `<methodCall>` documents with a single `<param>` of
type `<struct>` containing the operation's parameters as `<member>` pairs.
The Content-Type is `text/xml`. Example envelope:

```xml
<?xml version="1.0"?>
<methodCall>
  <methodName>createacct</methodName>
  <params>
    <param>
      <value>
        <struct>
          <member><name>username</name><value><string>chabc123</string></value></member>
          <member><name>password</name><value><string>S3cret!</string></value></member>
          <member><name>domain</name><value><string>mysite.yourdomain.com</string></value></member>
          <member><name>contactemail</name><value><string>jane@example.com</string></value></member>
          <member><name>plan</name><value><string>freehosting</string></value></member>
          <member><name>language</name><value><string>en</string></value></member>
        </struct>
      </value>
    </param>
  </params>
</methodCall>
```

### 3.4 Response Format

Responses are XML-RPC `<methodResponse>` documents containing a single
`<param>` with a `<struct>` that always has at least two members:
`result` (an `<int>` of `1` for success or `0` for failure) and `reason`
(a `<string>` with a human-readable message). Example success response:

```xml
<?xml version="1.0"?>
<methodResponse>
  <params>
    <param>
      <value>
        <struct>
          <member><name>result</name><value><int>1</int></value></member>
          <member><name>reason</name><value><string>Account created successfully</string></value></member>
          <member><name>status</name><value><string>1</string></value></member>
        </struct>
      </value>
    </param>
  </params>
</methodResponse>
```

The `MofhClient` parses this response with a regex-based extractor that
looks for the `result` and `reason` members:

```typescript
const resultMatch = xml.match(/<name>result<\/name>\s*<value>\s*(?:<int>|<i4>)?(\d+)/i);
const reasonMatch = xml.match(/<name>reason<\/name>\s*<value>\s*(?:<string>)?([^<]+)/i);
```

A regex parser was chosen over a full XML parser because the MOFH response
format is simple, stable, and well-known; a full DOM parser would add 200
KB to the bundle for no practical benefit. The trade-off is brittleness —
if MOFH changes its response shape, the parser will silently return
`success: false` with `message: "Unknown error"`. This is mitigated by
logging the raw response at `info` level on every call.

---

## 4. Supported Operations

### 4.1 createacct — Create Account

Creates a new hosting account. The username must be exactly 8 alphanumeric
characters starting with a letter; the `MofhClient.generateUsername()`
helper produces compliant usernames with a configurable prefix (default
`ch`). The password must be 6-32 characters and should include upper,
lower, and digit characters. The domain can be either a subdomain of your
reseller domain (e.g. `mysite.yourdomain.com`) or a custom domain the user
owns and has pointed at iFastNet's nameservers.

**Parameters:**

| Parameter | Required | Format |
|-----------|----------|--------|
| `username` | Yes | 8 chars, [a-z][a-z0-9]{7} |
| `password` | Yes | 6-32 chars |
| `domain` | Yes | valid hostname |
| `contactemail` | Yes | valid email |
| `plan` | Yes | your reseller package name |
| `language` | No | ISO 639-1 (en, pt, fr, es, ...) |

**Example response (success):** `result=1, reason="Account created successfully"`

**Example response (failure):** `result=0, reason="That domain is already in use"`

The full implementation in `packages/api/src/services/mofh-client.ts` is:

```typescript
async createAccount(params: MofhCreateAccountParams): Promise<MofhCreateAccountResult> {
  const username = params.username ?? this.generateUsername();
  const password = params.password ?? this.generatePassword();
  const pkg = params.package ?? this.defaultPackage;
  const language = params.language ?? this.defaultLanguage;

  const result = await this.call('createacct', {
    username, password,
    domain: params.domain,
    contactemail: params.email,
    plan: pkg,
    language,
  });

  return {
    username, password,
    domain: params.domain,
    status: result.success ? 'success' : 'failed',
    message: result.message,
    raw: result.raw,
  };
}
```

### 4.2 suspendacct — Suspend Account

Suspends a hosting account. The account's websites stop serving; FTP and
cPanel access are blocked. The data is preserved and the account can be
reactivated with `unsuspendacct`.

**Parameters:** `username`, `reason` (3-500 chars)

**Example response:** `result=1, reason="Account suspended"`

### 4.3 unsuspendacct — Reactivate Account

Reactivates a suspended account. Websites resume serving immediately.

**Parameters:** `username` only

### 4.4 passwd — Reset Password

Resets the FTP/cPanel password for an account. The new password must meet
the same complexity rules as `createacct`. The `MofhClient` generates a
random 16-character password if none is provided.

**Parameters:** `username`, `pass` (new password)

### 4.5 domainavailable — Check Domain Availability

Checks whether a domain is available for assignment to a new account.
Returns `result=1` if the domain is free, `result=0` if it is already
used (either on iFastNet or another MOFH reseller).

**Parameters:** `domain` only

**Example call:**

```bash
curl -s -X POST https://panel.myownfreehost.com/xml-api \
  -u "$MOFH_RESELLER_USERNAME:$MOFH_RESELLER_PASSWORD" \
  -H 'Content-Type: text/xml' \
  -d '<?xml version="1.0"?>
<methodCall>
  <methodName>domainavailable</methodName>
  <params><param><value><struct>
    <member><name>domain</name><value><string>test.yourdomain.com</string></value></member>
  </struct></value></param></params>
</methodCall>'
```

---

## 5. Error Handling and Common MOFH Error Codes

MOFH signals errors with `result=0` and a human-readable `reason` string.
The reason is not machine-readable, so the `MofhClient` returns the raw
string and the calling route maps it to an HTTP status. The table below
lists the most common reasons and their typical mappings.

| `reason` (substring) | HTTP status | CARSAI code | Meaning |
|----------------------|-------------|-------------|---------|
| `already in use` | 409 | `DOMAIN_TAKEN` | Domain already assigned to another account |
| `Invalid username` | 400 | `VALIDATION_ERROR` | Username does not match the 8-char rule |
| `Password too short` | 400 | `VALIDATION_ERROR` | Password < 6 chars |
| `Password too long` | 400 | `VALIDATION_ERROR` | Password > 32 chars |
| `Plan does not exist` | 400 | `MOFH_CREATE_FAILED` | Wrong package name |
| `Account not found` | 404 | `NOT_FOUND` | Username does not exist on MOFH |
| `Account already suspended` | 409 | `MOFH_SUSPEND_FAILED` | Double-suspend attempt |
| `Account not suspended` | 409 | `MOFH_UNSUSPEND_FAILED` | Unsuspend on active account |
| `Reseller suspended` | 503 | `MOFH_NOT_CONFIGURED` | Your reseller account is suspended |
| `Rate limit exceeded` | 429 | `RATE_LIMITED` | Too many MOFH calls in a window |

When the `MofhClient` returns `success: false`, the calling route in
`packages/api/src/routes/accounts.ts` writes a row to `audit_logs` with
the raw error message, updates the `hosting_accounts` row to
`status = 'failed'` with the reason in `suspension_reason`, and returns
`502 MOFH_CREATE_FAILED` (or a more specific code) to the client. The
user sees a friendly error in the dashboard and the failure is logged for
admin follow-up.

---

## 6. Account Lifecycle

```
            createacct (success)
   pending ──────────────────────► active
     ▲                                │
     │                                │ suspendacct
     │ unsuspendacct                  ▼
     │                              suspended
     │                                │
     │                                │ admin terminates (manual)
     │                                ▼
     └───────────────────────────── terminated
                                      │
                                      │ (no MOFH op — local delete only)
                                      ▼
                                    (deleted from CARSAI DB;
                                     iFastNet account remains unless
                                     deleted via reseller panel)

   createacct (failure)
   pending ──────────────────────► failed
                                     │
                                     │ admin retries
                                     ▼
                                  pending (re-create)
```

The lifecycle is owned by the `hosting_accounts.status` column, which is
an enum of `creating`, `active`, `suspended`, `terminated`, `failed`.
The transitions are:

1. **creating → active**: MOFH `createacct` returned `result=1`.
2. **creating → failed**: MOFH `createacct` returned `result=0` or threw
   a network error.
3. **active → suspended**: User or admin called
   `POST /accounts/:id/suspend`; MOFH `suspendacct` returned `result=1`.
4. **suspended → active**: User or admin called
   `POST /accounts/:id/unsuspend`; MOFH `unsuspendacct` returned `result=1`.
5. **any → terminated**: Admin deletes the account in CARSAI HOST. MOFH
   does not expose a "delete" operation in the public XML-RPC API; the
   iFastNet account remains on the server and must be cleaned up via the
   reseller panel if desired.

---

## 7. Credential Storage

MOFH credentials (reseller username + password) are stored exclusively in
environment variables on the API server:

```bash
MOFH_RESELLER_USERNAME=carsai_12345678
MOFH_RESELLER_PASSWORD=abc123def456ghi789jkl012mno345pqr678
```

They are loaded by `packages/api/src/utils/env.ts` into the `env.mofh`
object and never written to disk, never logged, and never exposed to the
frontend. The `MofhClient` constructor reads them at instantiation time
and stores them in private fields. The `isConfigured()` method returns
`false` if either is empty, which lets the rest of the code gracefully
degrade when MOFH is not yet set up (e.g. during the installer wizard
before step 5).

The per-account FTP passwords returned by MOFH are encrypted with
AES-256-GCM and stored in `hosting_accounts.password_encrypted`. The
encryption key is derived from `JWT_SECRET` via `scryptSync`, so changing
`JWT_SECRET` invalidates all stored passwords (they must be reset via
`POST /accounts/:id/reset-password`). This coupling is intentional — it
prevents an attacker who steals the database file from decrypting
passwords without also knowing the JWT secret, which is stored
separately in the environment.

---

## 8. Testing the Integration Locally

### 8.1 Verify Credentials Without Running the API

Use the `node --input-type=module` REPL to instantiate the client
directly and call `checkDomainAvailability`:

```bash
cd /home/z/my-project/carsai-host/packages/api
node --input-type=module -e "
import { mofhClient } from './src/services/mofh-client.js';
console.log('Configured:', mofhClient.isConfigured());
const r = await mofhClient.checkDomainAvailability('test-' + Date.now() + '.yourdomain.com');
console.log(JSON.stringify(r, null, 2));
"
```

A successful response looks like:

```json
{ "available": true, "message": "OK" }
```

A `401 Unauthorized` means wrong credentials; a timeout means
`panel.myownfreehost.com` is unreachable (check DNS and firewall).

### 8.2 Mock MOFH in Unit Tests

For unit tests, construct a `MofhClient` with explicit options to point
at a local mock server:

```typescript
import { MofhClient } from '../src/services/mofh-client.js';

const mockClient = new MofhClient({
  apiUrl: 'http://localhost:9001/xml-api',
  username: 'test',
  password: 'test',
  defaultPackage: 'freehosting',
  defaultLanguage: 'en',
});
```

Spin up a tiny Express mock that returns canned XML-RPC responses:

```typescript
import express from 'express';
const mock = express();
mock.post('/xml-api', (req, res) => {
  res.set('Content-Type', 'text/xml');
  res.send(`<?xml version="1.0"?>
<methodResponse>
  <params><param><value><struct>
    <member><name>result</name><value><int>1</int></value></member>
    <member><name>reason</name><value><string>OK</string></value></member>
  </struct></value></param></params>
</methodResponse>`);
});
mock.listen(9001);
```

The Vitest test suite in `packages/api/test/mofh-client.test.ts` uses
this pattern to test all five operations without hitting the real MOFH
API.

### 8.3 End-to-End Smoke Test

Create a real test account (this consumes a real MOFH slot) to validate
the full flow:

```bash
# 1. Authenticate and get an access token
TOKEN=$(curl -s -X POST http://localhost:3000/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@yourdomain.com","password":"..."}' \
  | jq -r '.data.tokens.accessToken')

# 2. Create a test account
curl -s -X POST http://localhost:3000/api/v1/accounts \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"domain":"smoketest-'$(date +%s)'","acceptTos":true}'
```

Verify the account exists in the reseller panel at
https://panel.myownfreehost.com/reseller/accounts.php. After testing,
suspend the account via the API and then delete it via the reseller panel
to free the slot.

---

## 9. Rate Limits and Best Practices

MOFH does not publish a formal rate limit, but empirical testing shows
that bursts of more than 30 requests per minute per reseller IP will
start returning `429 Rate limit exceeded`. Sustained throughput above
that threshold may result in a temporary IP block lasting up to 1 hour.
The recommended patterns are:

1. **Queue all MOFH calls.** Never call MOFH synchronously inside an
   Express request handler. Enqueue a Bull job and let the worker drain
   at a controlled rate. The worker should be configured with a
   concurrency of 5 and a per-job timeout of 30 seconds.
2. **Retry with backoff.** MOFH occasionally returns transient errors
   (network blips, brief 500s). Wrap every MOFH call in a retry loop
   with exponential backoff: 1s, 2s, 4s, 8s, then give up. Bull's
   built-in retry strategy handles this if you set
   `attempts: 5` and `backoff: { type: 'exponential', delay: 1000 }`.
3. **Cache domain availability.** The `domainavailable` call is
   read-only and safe to cache for 60 seconds in Redis. This avoids
   burning rate-limit budget on users who repeatedly check the same
   domain while filling in the create-account form.
4. **Log everything.** Every MOFH call is logged at `info` level with
   the operation name and parameter keys (never values, to avoid
   leaking passwords in logs). Failures are logged at `error` level
   with the full response body. These logs are essential for diagnosing
   issues that MOFH support will ask about.
5. **Keep credentials in env vars only.** Never hard-code credentials,
   never commit them to git, never include them in Docker image layers.
   Use Docker secrets or a secrets manager (Vault, AWS Secrets Manager)
   for production.

---

## 10. Migration Path if Leaving iFastNet

If you decide to leave iFastNet/MOFH for another hosting provider, the
abstraction boundary is the `MofhClient` class. To migrate:

1. Implement a new client class (e.g. `CpanelClient` or
   `DirectAdminClient`) with the same five public methods:
   `createAccount`, `suspendAccount`, `unsuspendAccount`,
   `resetPassword`, `checkDomainAvailability`. The method signatures
   are defined by the `MofhCreateAccountParams` and related interfaces
   in `packages/api/src/services/mofh-client.ts`.
2. Add a `HOSTING_PROVIDER` env var that selects which client to
   instantiate in `packages/api/src/services/index.ts`.
3. Update the `hosting_accounts` table to store provider-specific
   metadata in the existing `nameservers`, `cpanel_url`, `ftp_host`,
   `mysql_host` columns — no schema change needed.
4. Write a migration script that iterates existing accounts and calls
   the new provider's "import" API (if it has one) or re-creates them
   (if not). Existing iFastNet accounts continue to work because the
   stored FTP credentials are valid until you delete the iFastNet
   reseller account.

The rest of the codebase (routes, frontend, mobile) is provider-agnostic
and requires no changes. This separation was a deliberate design goal
and is the reason every external dependency in CARSAI HOST is wrapped
behind a service interface.
