# CARSAI HOST — Installation Guide

This guide covers everything you need to install, configure, and run CARSAI HOST
from a clean machine to a fully operational hosting panel. CARSAI HOST is a
monorepo built with pnpm workspaces and Turbo, so the same procedure applies to
development, staging, and production deployments. The only differences between
environments are the runtime process manager (tsx for development, PM2 or
systemd for production) and the reverse proxy in front of the API (none in
development, Nginx or Caddy in production).

---

## 1. System Requirements

Before cloning the repository, ensure your machine satisfies the following
minimum requirements. These requirements were validated on Linux (Ubuntu 22.04
and Debian 12), macOS 13+ (Apple Silicon and Intel), and Windows 11 with WSL 2.
Other Unix-like systems should work but are not officially supported. The Node
runtime is the most critical dependency because CARSAI HOST uses native ES
modules, top-level await in shared modules, and the `better-sqlite3` native
addon which must be compiled against the Node ABI installed on the host.

### 1.1 Required Software

| Software | Minimum Version | Recommended | Why |
|----------|-----------------|-------------|-----|
| Node.js | 20.0.0 | 20.18 LTS | ESM, native fetch, crypto.scrypt |
| pnpm | 9.0.0 | 9.12+ | Workspace hoisting, deterministic installs |
| Git | 2.30 | 2.43+ | Clone repo, conventional commits hooks |
| Python | 3.8 | 3.11 | Required to build `better-sqlite3` native addon |
| make + g++ | any recent | GNU make 4.3, g++ 12 | Native addon compilation |
| iFastNet reseller | active account | — | Real hosting infrastructure via MOFH |

### 1.2 Hardware Recommendations

For a small community deployment (up to 500 active hosting accounts) a single
Virtual Private Server with 2 vCPU and 4 GB RAM is sufficient. CARSAI HOST
itself is lightweight because the heavy lifting (Apache, MySQL, FTP, cPanel)
runs on iFastNet's infrastructure. The local SQLite database stores only
metadata (users, tickets, blog posts, audit logs), which typically stays under
100 MB even for large deployments. Disk space should be planned around the
`uploads/` directory (avatars, ticket attachments) and the `logs/` directory
(Winston daily rotate). Allocate at least 10 GB for comfortable headroom in
production.

### 1.3 Network and Firewall

The API listens on port `3000` by default (configurable via `PORT`). The Vite
dev server runs on port `5173`. In production only ports `80` and `443` need
to be public; the API port should be bound to `127.0.0.1` and proxied through
Nginx. Outbound HTTPS to `panel.myownfreehost.com` (MOFH XML-RPC API) and to
your SMTP server must be allowed by the firewall. The installer will warn you
during the connectivity test if any of these endpoints are unreachable.

---

## 2. Installation Method A — Development

The development method uses `tsx watch` for hot-reload of the API and Vite's
HMR for the React frontend. It is the recommended workflow for contributors
and for first-time installers who want to validate the environment before
moving to Docker or bare-metal production.

### 2.1 Clone and Install

```bash
# 1. Clone the repository
git clone https://github.com/carsaimz/carsai-host.git
cd carsai-host

# 2. Enable pnpm (Node >= 16.13 ships corepack)
corepack enable
corepack prepare pnpm@9.12.0 --activate

# 3. Install all workspace dependencies (web, api, shared, mobile, installer)
pnpm install

# 4. Bootstrap the shared package (types, Zod schemas, i18n JSON)
pnpm --filter @carsai/shared build
```

The `pnpm install` step compiles the `better-sqlite3` native addon, which
requires `python3`, `make`, and `g++` on the system. On Debian/Ubuntu run
`sudo apt-get install -y python3 make g++ build-essential` first. On macOS
these tools are bundled with Xcode Command Line Tools (`xcode-select --install`).

### 2.2 Configure Environment Variables

```bash
# 5. Copy the example env files
cp packages/api/.env.example   packages/api/.env
cp packages/web/.env.example   packages/web/.env

# 6. Generate strong JWT secrets (64 hex characters each)
JWT_SECRET=$(openssl rand -hex 32)
JWT_REFRESH_SECRET=$(openssl rand -hex 32)

# 7. Patch the API .env with the generated secrets and your MOFH creds
sed -i "s|JWT_SECRET=.*|JWT_SECRET=${JWT_SECRET}|"                 packages/api/.env
sed -i "s|JWT_REFRESH_SECRET=.*|JWT_REFRESH_SECRET=${JWT_REFRESH_SECRET}|" packages/api/.env
sed -i "s|MOFH_RESELLER_USERNAME=.*|MOFH_RESELLER_USERNAME=YOUR_RESELLER_USER|" packages/api/.env
sed -i "s|MOFH_RESELLER_PASSWORD=.*|MOFH_RESELLER_PASSWORD=YOUR_RESELLER_PASS|" packages/api/.env
sed -i "s|MOFH_DEFAULT_DOMAIN=.*|MOFH_DEFAULT_DOMAIN=yourdomain.com|"           packages/api/.env

# 8. Verify the file
cat packages/api/.env
```

If you do not yet have an iFastNet reseller account, leave the
`MOFH_RESELLER_*` fields blank; the API will start in degraded mode and the
`POST /api/v1/accounts` endpoint will return `MOFH_NOT_CONFIGURED` until you
fill them in. This is the recommended path for first-time installers who want
to explore the UI before wiring real hosting infrastructure.

### 2.3 Initialize the Database

```bash
# 9. Generate Drizzle migrations from the schema (idempotent)
pnpm db:generate

# 10. Apply migrations to the SQLite database (creates packages/api/data/carsai.db)
pnpm db:migrate

# 11. (Optional) Open Drizzle Studio to inspect tables
pnpm db:studio
```

The migration script `packages/api/scripts/migrate.js` reads
`packages/api/migrations/0001_initial.sql` and executes every `CREATE TABLE`
statement inside a single transaction. If the file `data/carsai.db` does not
exist it will be created. SQLite is configured with `PRAGMA journal_mode = WAL`
and `PRAGMA foreign_keys = ON` in `packages/api/src/db/index.ts`, which allows
concurrent reads while a write transaction is in progress.

### 2.4 Start the Development Servers

```bash
# 12. Start both the API (port 3000) and the web frontend (port 5173) in parallel
pnpm dev
```

You should now be able to open `http://localhost:5173` and see the landing
page. The first time you visit, the frontend will detect that the installer
lockfile is missing and redirect you to `/install`. Complete the wizard to
create the admin user and finalize MOFH configuration. If you prefer to skip
the wizard, manually create a row in the `users` table with `role = 'admin'`
and `status = 'active'`, then create an empty file at
`packages/api/data/.installed`.

---

## 3. Installation Method B — Docker

Docker is the recommended deployment method for self-hosters who want a
reproducible, isolated environment. The repository ships a multi-stage
`Dockerfile` that builds the shared, api, and web packages and produces a
single image that serves both the static frontend and the API behind a built-in
reverse proxy. The image is based on `node:20-alpine` to keep the final size
around 180 MB.

### 3.1 Build the Image

```bash
# Clone and build
git clone https://github.com/carsaimz/carsai-host.git
cd carsai-host

docker build -t carsai-host:1.0.0 -f docker/Dockerfile .
```

The build is split into three stages: `deps` (installs production dependencies
and compiles native addons with `python3`, `make`, `g++`), `build` (compiles
the TypeScript packages and runs Vite to produce the static frontend bundle),
and `runtime` (copies only the artifacts needed to run, plus a tiny `tini`
init system for proper signal handling). The runtime image runs as a non-root
user `carsai` (UID 1001) for defence in depth.

### 3.2 Run with docker-compose

Create a `docker-compose.yml` file in your deployment directory:

```yaml
version: "3.9"

services:
  carsai:
    image: carsai-host:1.0.0
    restart: unless-stopped
    ports:
      - "127.0.0.1:3000:3000"
    environment:
      NODE_ENV: production
      PORT: "3000"
      APP_URL: https://carsai.example.com
      API_URL: https://carsai.example.com/api/v1
      DATABASE_URL: /data/carsai.db
      JWT_SECRET: ${JWT_SECRET}
      JWT_REFRESH_SECRET: ${JWT_REFRESH_SECRET}
      MOFH_RESELLER_USERNAME: ${MOFH_RESELLER_USERNAME}
      MOFH_RESELLER_PASSWORD: ${MOFH_RESELLER_PASSWORD}
      MOFH_DEFAULT_DOMAIN: ${MOFH_DEFAULT_DOMAIN}
      SMTP_HOST: ${SMTP_HOST}
      SMTP_PORT: "587"
      SMTP_USER: ${SMTP_USER}
      SMTP_PASS: ${SMTP_PASS}
      SMTP_FROM: "CARSAI HOST <noreply@carsai.example.com>"
      CORS_ORIGINS: https://carsai.example.com
    volumes:
      - ./data:/data
      - ./uploads:/app/uploads
      - ./logs:/app/logs
```

Start the stack:

```bash
# Pull secrets from a .env file in the same directory
docker compose --env-file .env up -d

# Tail logs
docker compose logs -f carsai

# Run migrations inside the container
docker compose exec carsai node dist/scripts/migrate.js
```

The persistent volumes (`./data`, `./uploads`, `./logs`) survive container
rebuilds. Back them up daily using the procedure described in
`DEPLOYMENT.md`. To upgrade to a new version of CARSAI HOST, pull the new
image, run migrations, and restart the container — there is no need to wipe
data.

### 3.3 Reverse Proxy in Front of Docker

Even though the container listens on `127.0.0.1:3000`, you should put Nginx or
Caddy in front of it to terminate TLS and to serve the static frontend bundle
directly from disk (faster than piping through Node). A complete
`nginx.conf` example is provided in `DEPLOYMENT.md`. If you prefer Caddy, a
three-line `Caddyfile` is sufficient:

```
carsai.example.com {
  reverse_proxy 127.0.0.1:3000
}
```

Caddy automatically provisions and renews Let's Encrypt certificates, which
removes one entire category of operational toil.

---

## 4. Installation Method C — Production (PM2 + Nginx)

For deployments on a bare VPS without Docker, the recommended stack is
PM2 as the Node process manager and Nginx as the reverse proxy. PM2 provides
automatic restarts on crash, log rotation, cluster mode, and zero-downtime
reloads via `pm2 reload`. Nginx handles TLS termination, gzip compression,
static file caching, and request buffering.

### 4.1 Build the Production Bundle

```bash
# As the deploy user
git clone https://github.com/carsaimz/carsai-host.git /opt/carsai-host
cd /opt/carsai-host
pnpm install --frozen-lockfile --prod=false   # need devDeps to build
pnpm --filter @carsai/shared build
pnpm --filter @carsai/api     build
pnpm --filter @carsai/web     build
pnpm prune --prod                              # remove devDeps after build
```

The build output lands in `packages/api/dist/` (compiled Node ESM) and
`packages/web/dist/` (Vite static bundle: HTML, JS, CSS, images). The API's
`start` script is `node dist/index.js`. Make sure the directories `data/`,
`uploads/`, and `logs/` exist and are writable by the user that will run PM2.

### 4.2 Create the PM2 Ecosystem File

Save the following as `/opt/carsai-host/ecosystem.config.cjs`:

```javascript
module.exports = {
  apps: [
    {
      name: 'carsai-api',
      script: 'packages/api/dist/index.js',
      cwd: '/opt/carsai-host/packages/api',
      instances: 1,                // single instance — SQLite is not cluster-safe
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: '3000',
      },
      max_memory_restart: '512M',
      error_file: '/opt/carsai-host/logs/api.err.log',
      out_file:    '/opt/carsai-host/logs/api.out.log',
      merge_logs: true,
      time: true,
    },
  ],
};
```

Start the API under PM2 and persist the process list so that it survives
reboots:

```bash
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup systemd    # follow the printed instructions to enable boot service
```

### 4.3 Configure Nginx

Create `/etc/nginx/sites-available/carsai.conf`:

```nginx
server {
    listen 80;
    server_name carsai.example.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name carsai.example.com;

    ssl_certificate     /etc/letsencrypt/live/carsai.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/carsai.example.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;

    # Static frontend (Vite build)
    root /opt/carsai-host/packages/web/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # API reverse proxy
    location /api/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host              $host;
        proxy_set_header X-Real-IP         $remote_addr;
        proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade           $http_upgrade;
        proxy_set_header Connection        "upgrade";
        proxy_read_timeout 60s;
    }

    # Uploads
    location /uploads/ {
        alias /opt/carsai-host/uploads/;
        expires 7d;
        add_header Cache-Control "public, immutable";
    }

    # Gzip
    gzip on;
    gzip_types text/css application/javascript application/json image/svg+xml;
}
```

Enable the site, test the config, and reload:

```bash
sudo ln -s /etc/nginx/sites-available/carsai.conf /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 4.4 Issue the TLS Certificate

```bash
sudo certbot --nginx -d carsai.example.com \
  --agree-tos --no-eff-email --email admin@carsai.example.com
```

Certbot will automatically modify the Nginx config to point at the new
certificate and add the HSTS header. A systemd timer renews the certificate
every 60 days.

---

## 5. Post-Install Verification

After any of the three installation methods, run the following verification
steps to confirm the system is healthy. These steps exercise every external
dependency (database, MOFH, SMTP) and surface misconfiguration before real
users hit the panel.

### 5.1 Health Check

```bash
curl -s http://localhost:3000/api/v1/health | jq .
```

Expected response:

```json
{ "success": true, "data": { "status": "ok", "timestamp": "2024-..." } }
```

If the response is a connection refused, check that the API process is running
(`pm2 status` or `docker compose ps`). If the response is `502 Bad Gateway`
from Nginx, the API is not listening on `127.0.0.1:3000`; verify the `PORT`
and `HOST` env vars.

### 5.2 Database Migrations

```bash
# Inside the repo root
pnpm db:migrate

# Or inside Docker
docker compose exec carsai node dist/scripts/migrate.js
```

The migrate script is idempotent. It prints `Applied: 0001_initial.sql` on
first run and `No pending migrations` on subsequent runs. To verify the
schema manually, open the SQLite file:

```bash
sqlite3 packages/api/data/carsai.db ".tables"
# Expect: users, refresh_tokens, password_resets, hosting_accounts, domains,
#         dns_records, tickets, ticket_replies, blog_posts, blog_categories,
#         forum_categories, forum_topics, forum_replies, notifications,
#         audit_logs, api_tokens, webhooks, webhook_deliveries, cron_jobs,
#         backups, settings, sessions, plugins
```

### 5.3 MOFH Connectivity Test

```bash
# From the repo root, with the API env loaded
node --input-type=module -e "
import { mofhClient } from './packages/api/src/services/mofh-client.js';
console.log('configured:', mofhClient.isConfigured());
const r = await mofhClient.checkDomainAvailability('test-' + Date.now() + '.yourdomain.com');
console.log(r);
"
```

A healthy response looks like `{ available: true, message: 'OK' }` or
`{ available: false, message: 'Domain already in use' }`. A response of
`MOFH API returned HTTP 401` means the reseller credentials are wrong; a
timeout means the API endpoint is unreachable from your server (check outbound
HTTPS to `panel.myownfreehost.com`).

### 5.4 SMTP Test

```bash
# Trigger a forgot-password email for any registered user
curl -s -X POST http://localhost:3000/api/v1/auth/forgot-password \
  -H 'Content-Type: application/json' \
  -d '{"email":"your-real-inbox@example.com"}'
```

If the inbox receives the reset email within 30 seconds, SMTP is working. If
not, check `logs/api.err.log` for `EAUTH` (wrong credentials), `ECONNECTION`
(network blocked), or `Message failed` (recipient rejected). See the
troubleshooting section below for resolution steps.

---

## 6. Troubleshooting

This section catalogues the most common installation issues and their
solutions. If your issue is not listed here, search the GitHub issue tracker
and open a new issue with the output of `pnpm doctor` and the relevant log
snippets.

### 6.1 Port Conflicts

If `pnpm dev` exits with `EADDRINUSE: address already in use 0.0.0.0:3000`,
another process is bound to port 3000. Identify and kill it:

```bash
sudo lsof -i :3000
sudo kill -9 <PID>
```

Alternatively, change the `PORT` env var in `packages/api/.env` to a free port
(e.g. `3001`) and update the Vite proxy target in `packages/web/vite.config.ts`
to match. Remember to also update Nginx's `proxy_pass` line if you are in a
production deployment.

### 6.2 Permission Errors

The directories `data/`, `uploads/`, and `logs/` must be writable by the user
that runs the Node process. If you see `EACCES: permission denied` when
writing the SQLite WAL file or uploading an avatar, fix ownership:

```bash
sudo chown -R carsai:carsai /opt/carsai-host/{data,uploads,logs}
sudo chmod -R 0750           /opt/carsai-host/{data,uploads,logs}
```

For Docker deployments, ensure the host directories mounted as volumes have
UID/GID `1001:1001` (the user inside the container) or override the
`user:` field in `docker-compose.yml` to match the host user.

### 6.3 MOFH Authentication Failures

MOFH uses HTTP Basic Auth with your reseller username and password. If the API
returns `HTTP 401` from the MOFH endpoint, double-check that you copied the
credentials exactly as shown in the iFastNet reseller panel (they are
case-sensitive and may contain special characters that need URL-encoding if
passed via a URL — but you should pass them through env vars to avoid that).
Wait at least 60 seconds between retries because MOFH will temporarily
blacklist your IP after 5 failed attempts. If you forgot your reseller
password, use the "Reset API Password" link in the reseller panel.

### 6.4 SQLite WAL Mode

SQLite is configured with Write-Ahead Logging (`PRAGMA journal_mode = WAL`) in
`packages/api/src/db/index.ts`. WAL significantly improves write throughput
and allows concurrent readers, but it produces two sidecar files
(`carsai.db-wal` and `carsai.db-shm`) next to the main database. If you back
up only `carsai.db`, you will lose data that has not been checkpointed. Always
back up using the `.backup` command (see `DEPLOYMENT.md`) or stop the API
before copying the file. To force a checkpoint manually:

```bash
sqlite3 packages/api/data/carsai.db "PRAGMA wal_checkpoint(TRUNCATE);"
```

### 6.5 SMTP Connection Issues

The most common SMTP problems are: using port 465 with `SMTP_SECURE=false`
(465 is implicit TLS, must use `SMTP_SECURE=true`), using port 587 with
`SMTP_SECURE=true` (587 is STARTTLS, must use `SMTP_SECURE=false`), or
forgetting to enable "Less secure apps" / create an app password for Gmail.
For Office 365, use `smtp.office365.com:587` with the user's primary SMTP
address. For Mailgun, use `smtp.mailgun.org:587` with the domain's SMTP
credentials (not the API key).

### 6.6 better-sqlite3 Build Errors

If `pnpm install` fails with `gyp ERR! stack Error: not found: python3` or
`make: g++: No such file or directory`, install the build toolchain:

```bash
# Debian / Ubuntu
sudo apt-get install -y python3 make g++ build-essential

# Alpine (inside Docker)
apk add --no-cache python3 make g++

# macOS
xcode-select --install
```

If you see `NODE_MODULE_VERSION mismatch` after a Node upgrade, the native
addon was compiled against an older Node ABI. Run `pnpm rebuild better-sqlite3`
to recompile against the current Node.

---

## 7. Updating to a New Version

CARSAI HOST follows semantic versioning. Patch and minor updates are
backward-compatible and safe to apply in-place. Major version updates may
include database migrations that require a maintenance window — always read
`CHANGELOG.md` before upgrading across a major boundary.

### 7.1 Standard Update Procedure

```bash
# 1. Stop the API (graceful — lets in-flight requests finish)
pm2 stop carsai-api       # or: docker compose stop carsai

# 2. Backup the database (mandatory before every update)
sqlite3 /opt/carsai-host/packages/api/data/carsai.db ".backup /backups/carsai-$(date +%F).db"

# 3. Pull the new code
cd /opt/carsai-host
git fetch --tags
git checkout v1.1.0           # replace with the target version tag

# 4. Install/update dependencies
pnpm install --frozen-lockfile

# 5. Rebuild the shared, api, and web packages
pnpm --filter @carsai/shared build
pnpm --filter @carsai/api     build
pnpm --filter @carsai/web     build
pnpm prune --prod

# 6. Run any new migrations
pnpm db:migrate

# 7. Restart the API
pm2 start carsai-api        # or: docker compose up -d

# 8. Smoke-test
curl -s https://carsai.example.com/api/v1/health | jq .
```

### 7.2 Zero-Downtime Update (Blue/Green)

For zero-downtime updates on a single server, deploy the new version to a
second directory (`/opt/carsai-host-green`), switch the Nginx upstream with a
single reload, then drain and remove the old version. This is documented in
detail in `DEPLOYMENT.md` under "Zero-downtime updates". Note that SQLite
does not support concurrent writers from two processes, so the blue/green
deployment must point both instances at the same database file through a
brief read-only window or use Litestream for replication.

---

## 8. Uninstalling

To remove CARSAI HOST completely from a server, stop the processes, delete the
install directory, and remove the Nginx config and TLS certificates:

```bash
# 1. Stop PM2 process and remove from list
pm2 stop carsai-api
pm2 delete carsai-api
pm2 save

# 2. (Docker) stop and remove containers, volumes, and the image
docker compose down -v
docker rmi carsai-host:1.0.0

# 3. Remove Nginx config and reload
sudo rm /etc/nginx/sites-enabled/carsai.conf
sudo rm /etc/nginx/sites-available/carsai.conf
sudo nginx -t && sudo systemctl reload nginx

# 4. Revoke TLS certificate (optional — leaves certbot renewal alone otherwise)
sudo certbot delete --cert-name carsai.example.com

# 5. Remove the install directory and data
sudo rm -rf /opt/carsai-host

# 6. Remove the carsai user (if you created one)
sudo userdel carsai
```

If you intend to reinstall later, keep a copy of the `data/`, `uploads/`, and
`logs/` directories somewhere safe — they contain the user database, ticket
history, and audit logs. The MOFH-created hosting accounts on iFastNet are
not affected by uninstalling CARSAI HOST; they remain on the iFastNet servers
and must be managed directly through the reseller panel if you no longer have
CARSAI HOST installed.
