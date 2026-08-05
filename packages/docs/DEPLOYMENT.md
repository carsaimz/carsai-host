# CARSAI HOST — Production Deployment Guide

This guide covers everything you need to deploy CARSAI HOST to a
production server. It assumes you have already read `INSTALL.md` and
have a working local development environment. The three deployment
options (Docker Compose, PM2 + Nginx, and systemd on bare metal) are
documented in detail, followed by backup, SSL, log rotation,
monitoring, update, rollback, and hardening procedures. Read the
entire guide before deploying — skipping a section (especially the
backup and hardening sections) is a recipe for an outage.

---

## 1. Pre-Deployment Checklist

Before you start the deployment, verify that you have every
prerequisite in hand. Skipping any of these will result in a half-
working deployment that fails at the worst possible moment.

### 1.1 Server Provisioning

- [ ] A VPS or dedicated server with at least 2 vCPU and 4 GB RAM.
- [ ] Ubuntu 22.04 LTS or Debian 12 (recommended). Alpine, Fedora,
  and Rocky Linux work but are not tested in CI.
- [ ] Root or sudo access for the initial setup.
- [ ] A non-root user `carsai` with `sudo` privileges for running the
  application.
- [ ] Ports 80 and 443 open in the cloud provider's firewall. Port
  22 (SSH) should be restricted to your IP or a bastion host.

### 1.2 Domain and DNS

- [ ] A domain name (e.g. `carsai.example.com`) pointing at the
  server's public IP with an A record.
- [ ] DNS propagation verified: `dig carsai.example.com +short`
  returns the server's IP.
- [ ] (Optional) A wildcard CNAME `*.carsai.example.com` pointing at
  the same IP, if you want users to access the panel at
  `panel.carsai.example.com` and the API at `api.carsai.example.com`.

### 1.3 Environment Variables

- [ ] `JWT_SECRET` and `JWT_REFRESH_SECRET` — 64-character hex
  strings generated with `openssl rand -hex 32`. **Different** values
  for each.
- [ ] `MOFH_RESELLER_USERNAME` and `MOFH_RESELLER_PASSWORD` — your
  iFastNet reseller credentials (see `MOFH.md`).
- [ ] `MOFH_DEFAULT_DOMAIN` — the reseller domain users will see in
  their cPanel URL.
- [ ] `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`,
  `SMTP_FROM` — credentials for an SMTP relay. Test with
  `swaks --to you@example.com --server $SMTP_HOST --auth` before
  deploying.
- [ ] `CORS_ORIGINS` — the exact origin of your frontend (e.g.
  `https://carsai.example.com`). Never use `*` in production.
- [ ] (Optional) `GOOGLE_CLIENT_ID`/`SECRET` and
  `GITHUB_CLIENT_ID`/`SECRET` if you want OAuth login.

### 1.4 Third-Party Accounts

- [ ] An iFastNet reseller account at
  https://ifastnet.com/affiliate.html.
- [ ] An SMTP provider (Gmail with an app password, Mailgun, SendGrid,
  Amazon SES, or your own Postfix relay).
- [ ] (Optional) A Cloudflare account for DNS + DDoS protection in
  front of your origin server.
- [ ] (Optional) A Uptime Kuma instance for external monitoring.

---

## 2. Option A — Docker Compose

Docker Compose is the recommended deployment method because it
encapsulates the entire stack in a single declarative file, survives
server reinstalls (just copy the `docker-compose.yml` and the `data/`
volume), and makes upgrades a one-command operation.

### 2.1 Directory Layout

```bash
sudo mkdir -p /opt/carsai-host/{data,uploads,logs}
sudo chown -R 1001:1001 /opt/carsai-host  # UID inside the container
cd /opt/carsai-host
```

### 2.2 docker-compose.yml

Create `/opt/carsai-host/docker-compose.yml`:

```yaml
version: "3.9"

services:
  carsai:
    image: carsai-host:1.0.0
    container_name: carsai
    restart: unless-stopped
    ports:
      - "127.0.0.1:3000:3000"
    env_file: .env
    volumes:
      - ./data:/data
      - ./uploads:/app/uploads
      - ./logs:/app/logs
    healthcheck:
      test: ["CMD", "wget", "-qO-", "http://localhost:3000/api/v1/health"]
      interval: 30s
      timeout: 5s
      retries: 3
      start_period: 30s
    logging:
      driver: json-file
      options:
        max-size: "10m"
        max-file: "5"

  redis:
    image: redis:7-alpine
    container_name: carsai-redis
    restart: unless-stopped
    volumes:
      - ./redis:/data
    command: ["redis-server", "--appendonly", "yes"]
```

### 2.3 .env File

Create `/opt/carsai-host/.env` with the production values (see
`packages/api/.env.example` for the full list). The most critical:

```bash
NODE_ENV=production
PORT=3000
APP_URL=https://carsai.example.com
API_URL=https://carsai.example.com/api/v1

DATABASE_URL=/data/carsai.db
JWT_SECRET=<64-hex>
JWT_REFRESH_SECRET=<64-hex>

MOFH_RESELLER_USERNAME=<your-reseller-user>
MOFH_RESELLER_PASSWORD=<your-reseller-pass>
MOFH_DEFAULT_DOMAIN=yourdomain.com

SMTP_HOST=smtp.mailgun.org
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=postmaster@mg.yourdomain.com
SMTP_PASS=<smtp-password>
SMTP_FROM=CARSAI HOST <noreply@carsai.example.com>

CORS_ORIGINS=https://carsai.example.com
REDIS_URL=redis://redis:6379
```

### 2.4 Start the Stack

```bash
cd /opt/carsai-host
docker compose pull
docker compose up -d

# Verify health
curl -s http://127.0.0.1:3000/api/v1/health | jq .

# Run migrations inside the container
docker compose exec carsai node dist/scripts/migrate.js
```

### 2.5 Nginx in Front

Even with Docker, put Nginx on the host for TLS termination and to
serve the static frontend bundle directly. See section 4.2 for the
Nginx config — point `proxy_pass` at `http://127.0.0.1:3000` and
the `root` at `/opt/carsai-host/web-dist/` (you can copy the static
bundle out of the container with `docker compose cp carsai:/app/packages/web/dist
./web-dist`).

---

## 3. Option B — PM2 + Nginx

PM2 is the recommended process manager for non-Docker deployments.
It handles restarts, log rotation, and zero-downtime reloads. This
option is best when you want maximum control over the runtime
environment and are comfortable managing Node.js processes directly.

### 3.1 Install PM2

```bash
sudo npm install -g pm2@latest
pm2 --version    # should be 5.4+
```

### 3.2 Build the Application

```bash
cd /opt/carsai-host
git clone https://github.com/carsaimz/carsai-host.git .
pnpm install --frozen-lockfile
pnpm --filter @carsai/shared build
pnpm --filter @carsai/api     build
pnpm --filter @carsai/web     build
pnpm prune --prod
```

### 3.3 PM2 Ecosystem File

Create `/opt/carsai-host/ecosystem.config.cjs`:

```javascript
module.exports = {
  apps: [
    {
      name: 'carsai-api',
      script: 'packages/api/dist/index.js',
      cwd: '/opt/carsai-host/packages/api',
      instances: 1,
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
    {
      name: 'carsai-worker',
      script: 'packages/api/dist/worker.js',
      cwd: '/opt/carsai-host/packages/api',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
      },
      max_memory_restart: '256M',
      error_file: '/opt/carsai-host/logs/worker.err.log',
      out_file:    '/opt/carsai-host/logs/worker.out.log',
    },
  ],
};
```

### 3.4 Start and Persist

```bash
cd /opt/carsai-host
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup systemd    # follow the printed instructions
```

The `pm2 startup` command prints a `sudo systemctl enable pm2-carsai`
line that you must run to make PM2 start on boot. Run it once and PM2
will faithfully restart your processes (in the state saved by
`pm2 save`) every time the server boots.

---

## 4. Option C — Bare Metal with systemd

For deployments where Docker and PM2 are not desired (e.g. due to
organisational policy), CARSAI HOST can be run as a native systemd
service. This option gives you the operating system's own process
supervision, which is robust and well-understood by sysadmins.

### 4.1 Build (Same as PM2)

Follow steps 3.1 and 3.2 above.

### 4.2 systemd Unit File

Create `/etc/systemd/system/carsai-api.service`:

```ini
[Unit]
Description=CARSAI HOST API
After=network.target
Wants=network-online.target

[Service]
Type=simple
User=carsai
Group=carsai
WorkingDirectory=/opt/carsai-host/packages/api
EnvironmentFile=/opt/carsai-host/packages/api/.env
ExecStart=/usr/bin/node dist/index.js
Restart=on-failure
RestartSec=5
StandardOutput=append:/opt/carsai-host/logs/api.out.log
StandardError=append:/opt/carsai-host/logs/api.err.log

# Hardening
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/opt/carsai-host/data /opt/carsai-host/uploads /opt/carsai-host/logs
LockPersonality=true
RestrictRealtime=true
RestrictSUIDSGID=true

[Install]
WantedBy=multi-user.target
```

Enable and start:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now carsai-api
sudo systemctl status carsai-api
```

### 4.3 Worker Unit (Optional)

If you run background jobs (SSL issuance, backups), create a second
unit `/etc/systemd/system/carsai-worker.service` pointing at
`dist/worker.js` with the same hardening directives.

---

## 5. Nginx Reverse Proxy Configuration

Regardless of the deployment option, Nginx sits in front of the
Node.js process for TLS termination, gzip compression, static file
serving, and request buffering. The complete configuration:

```nginx
# /etc/nginx/sites-available/carsai.conf

# Rate limiting zone (defence in depth — the app also rate-limits)
limit_req_zone $binary_remote_addr zone=carsai:10m rate=10r/s;

# HTTP -> HTTPS redirect
server {
    listen 80;
    listen [::]:80;
    server_name carsai.example.com www.carsai.example.com;
    return 301 https://$host$request_uri;
}

# HTTPS server
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name carsai.example.com www.carsai.example.com;

    # TLS
    ssl_certificate     /etc/letsencrypt/live/carsai.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/carsai.example.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 1d;
    ssl_session_tickets off;

    # OCSP stapling
    ssl_stapling on;
    ssl_stapling_verify on;
    resolver 1.1.1.1 8.8.8.8 valid=300s;
    resolver_timeout 5s;

    # Security headers
    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Permissions-Policy "geolocation=(), microphone=(), camera=()" always;

    # Static frontend (Vite build)
    root /opt/carsai-host/packages/web/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
        add_header Cache-Control "no-store, must-revalidate";
    }

    location ~* \.(?:css|js|woff2?|svg|png|jpg|jpeg|gif|webp|ico)$ {
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # API reverse proxy
    location /api/ {
        limit_req zone=carsai burst=20 nodelay;
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host              $host;
        proxy_set_header X-Real-IP         $remote_addr;
        proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade           $http_upgrade;
        proxy_set_header Connection        "upgrade";
        proxy_read_timeout 60s;
        proxy_send_timeout 60s;
        client_max_body_size 100m;
    }

    # WebSocket
    location /ws {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade    $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_read_timeout 86400;
    }

    # Uploads
    location /uploads/ {
        alias /opt/carsai-host/uploads/;
        expires 7d;
        add_header Cache-Control "public";
        add_header X-Content-Type-Options "nosniff" always;
    }

    # Gzip
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/javascript
        application/json
        application/xml
        application/xml+rss
        image/svg+xml;
}
```

Enable and reload:

```bash
sudo ln -s /etc/nginx/sites-available/carsai.conf /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

## 6. Database Backup Strategy

SQLite's simplicity is also its backup challenge: the database is a
single file, but copying the file while writes are in progress can
produce a corrupt backup (the copy may include a half-written page).
The safe way to back up SQLite is the `.backup` command, which uses
the online backup API to produce a consistent snapshot without
locking the database.

### 6.1 Backup Script

Create `/opt/carsai-host/scripts/backup-db.sh`:

```bash
#!/usr/bin/env bash
set -euo pipefail

DB_PATH="/opt/carsai-host/packages/api/data/carsai.db"
BACKUP_DIR="/backups/carsai"
DATE=$(date +%F-%H%M)
BACKUP_FILE="${BACKUP_DIR}/carsai-${DATE}.db"

mkdir -p "$BACKUP_DIR"

# Use SQLite's online backup API (safe with WAL)
sqlite3 "$DB_PATH" ".backup '$BACKUP_FILE'"

# Compress
gzip -9 "$BACKUP_FILE"

# Prune: keep last 7 daily, 4 weekly, 12 monthly
find "$BACKUP_DIR" -name "carsai-*.db.gz" -mtime +7  -delete
find "$BACKUP_DIR" -name "carsai-*.db.gz" -mtime +30 -delete
find "$BACKUP_DIR" -name "carsai-*.db.gz" -mtime +365 -delete

# (Optional) Upload to S3
# aws s3 cp "$BACKUP_FILE.gz" "s3://your-bucket/carsai/$(basename "$BACKUP_FILE.gz")" \
#   --sse AES256

echo "Backup OK: ${BACKUP_FILE}.gz"
```

Make it executable and schedule it:

```bash
sudo chmod +x /opt/carsai-host/scripts/backup-db.sh
sudo crontab -e
# Add:
0 2 * * * /opt/carsai-host/scripts/backup-db.sh >> /var/log/carsai-backup.log 2>&1
```

### 6.2 Restore Procedure

```bash
# Stop the API
sudo systemctl stop carsai-api    # or: pm2 stop carsai-api

# Restore
gunzip -c /backups/carsai/carsai-2024-11-15-0200.db.gz > /opt/carsai-host/packages/api/data/carsai.db

# Restart
sudo systemctl start carsai-api
```

### 6.3 Uploads Backup

The `uploads/` directory contains user avatars, ticket attachments,
and other file-based assets. Back it up with `rsync` daily:

```bash
rsync -a --delete /opt/carsai-host/uploads/ /backups/carsai/uploads/
```

---

## 7. SSL Certificate Installation

### 7.1 Issue with Certbot

```bash
sudo apt-get install -y certbot python3-certbot-nginx
sudo certbot --nginx -d carsai.example.com -d www.carsai.example.com \
  --agree-tos --no-eff-email --email admin@carsai.example.com \
  --redirect
```

Certbot will modify the Nginx config to point at the new certificate,
add the HSTS header, and configure the renewal timer.

### 7.2 Verify Renewal

```bash
sudo certbot renew --dry-run
```

The dry-run should succeed. The actual renewal happens automatically
twice daily via the `certbot.timer` systemd unit. After renewal,
Certbot runs the `--deploy-hook` (configured in
`/etc/letsencrypt/renewal/carsai.example.com.conf`) which reloads
Nginx:

```ini
[renewalparams]
deploy_hook = systemctl reload nginx
```

### 7.3 Wildcard Certificates

If you use a wildcard (`*.carsai.example.com`), Certbot requires
DNS-01 challenge, which needs a DNS provider plugin (e.g.
`certbot-dns-cloudflare`). The procedure is more involved; see
https://certbot.eff.org/instructions for the plugin-specific
instructions.

---

## 8. Log Rotation

The application logs (via Winston in `packages/api/src/utils/logger.ts`)
rotate daily by default, but the PM2/systemd logs and the Nginx
access/error logs need explicit rotation. Use `logrotate`.

### 8.1 logrotate Config

Create `/etc/logrotate.d/carsai`:

```
/opt/carsai-host/logs/*.log {
    daily
    missingok
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 carsai carsai
    sharedscripts
    postrotate
        if systemctl is-active carsai-api; then
            systemctl reload carsai-api 2>/dev/null || true
        fi
        if pm2 list 2>/dev/null | grep -q carsai-api; then
            pm2 reload carsai-api 2>/dev/null || true
        fi
    endscript
}

/var/log/nginx/carsai-*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 0640 www-data adm
    sharedscripts
    postrotate
        systemctl reload nginx 2>/dev/null || true
    endscript
}
```

Test the config:

```bash
sudo logrotate -d /etc/logrotate.d/carsai   # dry-run
sudo logrotate -f /etc/logrotate.d/carsai   # force rotation
```

---

## 9. Monitoring

### 9.1 PM2 Built-in Monitor

```bash
pm2 monit              # terminal UI
pm2 status             # one-shot status
pm2 logs carsai-api --lines 100
```

PM2's `monit` shows CPU, memory, and event loop lag in real time. It
is the fastest way to spot a memory leak or a runaway event loop.

### 9.2 Uptime Kuma (External)

Deploy Uptime Kuma (https://github.com/louislam/uptime-kuma) on a
**separate** server (so that it notices when your main server is
down). Configure it to monitor:

- `GET https://carsai.example.com/api/v1/health` every 30 seconds.
  Expected: HTTP 200 with `{"status":"ok"}`. Alert if 5 consecutive
  checks fail.
- `GET https://carsai.example.com/` every 60 seconds. Expected: HTTP
  200 with HTML containing `CARSAI HOST`. Alert if 3 consecutive
  checks fail.
- TLS certificate expiry: alert when 14 days remain.
- DNS resolution: alert if `carsai.example.com` stops resolving.

Configure notifications (email, Slack, Discord, Telegram, Pushover)
in Uptime Kuma's settings. Test the notification by deliberately
stopping the API and confirming that you receive an alert within 2
minutes.

### 9.3 Application Metrics

The `/api/v1/admin/stats` endpoint (admin-only) exposes request counts,
memory usage, and process uptime. Poll it every 5 minutes with a
script that pushes the metrics to Graphite, Prometheus, or Datadog.
The script can be a simple `curl | jq` pipeline run from cron.

---

## 10. Updating Deployment

### 10.1 Standard Update (Brief Downtime)

```bash
# 1. Backup
/opt/carsai-host/scripts/backup-db.sh

# 2. Stop
pm2 stop carsai-api        # or: sudo systemctl stop carsai-api
# (Docker) docker compose stop carsai

# 3. Pull and rebuild
cd /opt/carsai-host
git fetch --tags
git checkout v1.1.0
pnpm install --frozen-lockfile
pnpm --filter @carsai/shared build
pnpm --filter @carsai/api     build
pnpm --filter @carsai/web     build
pnpm prune --prod

# 4. Migrate
pnpm db:migrate

# 5. Restart
pm2 start carsai-api       # or: sudo systemctl start carsai-api
# (Docker) docker compose up -d

# 6. Smoke-test
curl -s https://carsai.example.com/api/v1/health | jq .
```

Expected downtime: 30-60 seconds for a typical patch update.

### 10.2 Zero-Downtime (Blue/Green)

For zero-downtime updates, deploy the new version to a second
directory and switch Nginx's upstream with a single reload.

```bash
# 1. Deploy v1.1.0 to /opt/carsai-host-green (same procedure as above)
# 2. Run migrations on the green instance (SQLite allows concurrent
#    readers, so the blue instance keeps serving while green migrates)
# 3. Switch Nginx upstream:
sudo sed -i 's|proxy_pass http://127.0.0.1:3000|proxy_pass http://127.0.0.1:3001|' \
  /etc/nginx/sites-available/carsai.conf
sudo nginx -t && sudo systemctl reload nginx
# 4. Drain and stop blue (after 60s grace period for in-flight requests)
pm2 stop carsai-api-blue
# 5. Promote green to blue for next deploy
mv /opt/carsai-host /opt/carsai-host-blue-old
mv /opt/carsai-host-green /opt/carsai-host
```

Note: SQLite does not support concurrent writers from two processes.
During the switchover window, only the green instance should be
running writes. The blue instance should be put in read-only mode
(which the API supports via the `READ_ONLY=true` env var) before the
switchover.

---

## 11. Rollback Procedure

If the new version is broken, roll back to the previous version:

### 11.1 Code Rollback

```bash
pm2 stop carsai-api
cd /opt/carsai-host
git checkout v1.0.0       # previous version tag
pnpm install --frozen-lockfile
pnpm --filter @carsai/shared build
pnpm --filter @carsai/api     build
pnpm --filter @carsai/web     build
pnpm prune --prod
pm2 start carsai-api
```

### 11.2 Database Rollback (If Migration Ran)

If the new version ran a migration that changed the schema, rolling
back the code alone is not enough — the database schema must also be
rolled back. Drizzle ORM generates a down-migration for every
up-migration; it lives in `packages/api/migrations/` with a
`down.sql` suffix.

```bash
pm2 stop carsai-api

# Restore from the pre-update backup (preferred — always have one)
gunzip -c /backups/carsai/carsai-<pre-update-date>.db.gz \
  > /opt/carsai-host/packages/api/data/carsai.db

# Or run the down-migration (riskier — only if no backup)
# pnpm --filter @carsai/api node scripts/migrate-down.js 0002_some_migration

pm2 start carsai-api
```

Always prefer restoring from backup over running a down-migration:
down-migrations can lose data (e.g. if a column was added and
subsequently populated, the down-migration drops the column and the
data is gone), while a backup restore brings the database back to
exactly the state it was in before the update.

---

## 12. Hardening Checklist

After deployment, run through this checklist to harden the server.
Every item reduces the attack surface; together they make the server
significantly harder to compromise.

### 12.1 Firewall (ufw)

```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp           # SSH (consider restricting to your IP)
sudo ufw allow 80/tcp           # HTTP (for certbot + redirect)
sudo ufw allow 443/tcp          # HTTPS
sudo ufw enable
sudo ufw status verbose
```

### 12.2 SSH Hardening

Edit `/etc/ssh/sshd_config`:

```
PermitRootLogin no
PasswordAuthentication no
PubkeyAuthentication yes
AllowUsers carsai
MaxAuthTries 3
LoginGraceTime 30
```

Restart SSH: `sudo systemctl restart sshd`. Test your key-based login
in a **new** terminal before closing the existing session, in case
the config is broken.

### 12.3 fail2ban

```bash
sudo apt-get install -y fail2ban
sudo tee /etc/fail2ban/jail.d/carsai.local <<EOF
[sshd]
enabled = true
maxretry = 3
bantime = 1h
findtime = 10m

[nginx-limit-req]
enabled = true
maxretry = 5
bantime = 10m
EOF

sudo systemctl enable --now fail2ban
sudo fail2ban-client status
```

### 12.4 Automatic Security Updates

```bash
sudo apt-get install -y unattended-upgrades
sudo dpkg-reconfigure -plow unattended-upgrades
```

This enables automatic installation of security patches (kernel,
glibc, OpenSSL, etc.) as soon as they are released by the distro.
Reboots are not automatic — install `needrestart` and review its
output after applying updates to see if a reboot is needed.

### 12.5 Cloudflare (Optional but Recommended)

Put Cloudflare in front of your origin server. Cloudflare provides
free DDoS protection, a WAF, and edge caching. Set the DNS records
to "proxied" (orange cloud). In Cloudflare's SSL/TLS settings,
choose "Full (strict)" so that Cloudflare validates the origin
certificate. Create a Cloudflare Origin Certificate (15-year
validity) and install it on the server instead of (or in addition
to) the Let's Encrypt certificate.

### 12.6 Disable Unused Services

```bash
sudo systemctl disable --now apache2     # if installed but unused
sudo systemctl disable --now postfix     # if you use external SMTP
sudo systemctl disable --now rpcbind
sudo systemctl disable --now avahi-daemon
```

Every disabled service is one less potential vulnerability. Audit
the running services with `sudo ss -tlnp` and disable anything you
do not actively need.

### 12.7 Final Verification

- [ ] `https://carsai.example.com` loads and shows the landing page.
- [ ] `https://carsai.example.com/api/v1/health` returns `{"status":"ok"}`.
- [ ] SSL Labs grade is A or A+ (https://www.ssllabs.com/ssltest/).
- [ ] SecurityHeaders.com grade is A or better.
- [ ] `sudo ufw status` shows only ports 22, 80, 443.
- [ ] `sudo fail2ban-client status sshd` shows the jail active.
- [ ] The backup script ran successfully at 02:00 (check
      `/var/log/carsai-backup.log`).
- [ ] Uptime Kuma shows all monitors green.
- [ ] You can SSH in with your key only (password login rejected).

Congratulations — your CARSAI HOST deployment is production-ready.
