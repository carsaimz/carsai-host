#!/usr/bin/env bash
# scripts/seed-blog.sh
#
# Insert sample blog posts into a running CARSAI HOST instance by
# calling POST /api/v1/blog/posts as an admin. Requires:
#   - The API to be running on http://localhost:3000
#   - An admin account exists (created by the installer)
#
# Usage:
#   ./scripts/seed-blog.sh admin@example.com my-password
#   ./scripts/seed-blog.sh admin@example.com my-password https://api.example.com
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

EMAIL="${1:-}"
PASSWORD="${2:-}"
API_BASE="${3:-http://localhost:3000}"

log() {
  printf '\033[1;33m[seed-blog]\033[0m %s\n' "$*"
}
err() {
  printf '\033[1;31m[seed-blog][error]\033[0m %s\n' "$*" >&2
}

if [[ -z "$EMAIL" || -z "$PASSWORD" ]]; then
  err "Usage: $0 <admin-email> <admin-password> [api-base-url]"
  err "Example: $0 admin@carsai.host secret123"
  exit 1
fi

if ! command -v curl >/dev/null 2>&1; then
  err "curl is required"
  exit 1
fi

if ! command -v jq >/dev/null 2>&1; then
  log "jq is not installed; output will be raw JSON."
  JQ=""
else
  JQ="jq"
fi

# ─── Login as admin ────────────────────────────────────────────
log "Logging in as $EMAIL..."
LOGIN_RESP=$(curl -sS -X POST "${API_BASE}/api/v1/auth/login" \
  -H 'Content-Type: application/json' \
  -d "$(printf '{"email":"%s","password":"%s"}' "$EMAIL" "$PASSWORD")")

ACCESS_TOKEN=$(echo "$LOGIN_RESP" | jq -r '.data.tokens.accessToken // empty' 2>/dev/null || echo "")
if [[ -z "$ACCESS_TOKEN" ]]; then
  err "Login failed. Response:"
  echo "$LOGIN_RESP" >&2
  exit 1
fi
log "Got access token."

# ─── Seed posts ────────────────────────────────────────────────
POSTS=(
  '{"title":"Welcome to CARSAI HOST","excerpt":"A free hosting platform built on iFastNet + MOFH.","content":"<p>Welcome to CARSAI HOST, the free hosting platform powered by iFastNet (Byet) and the My Own Free Hosting XML-RPC API.</p><p>This is a sample blog post seeded by <code>scripts/seed-blog.sh</code>.</p>","category":"Announcements","tags":["welcome","news"],"status":"published"}'
  '{"title":"How to create your first hosting account","excerpt":"Step-by-step guide to provisioning a free hosting account via MOFH.","content":"<p>This guide walks you through creating your first hosting account from the CARSAI HOST dashboard.</p><ol><li>Sign in and open the Accounts page.</li><li>Click New account.</li><li>Choose a subdomain or custom domain.</li><li>Click Create -- the API provisions the account via the MOFH XML-RPC API.</li></ol>","category":"Tutorials","tags":["guide","mofh"],"status":"published"}'
  '{"title":"Securing your account with 2FA","excerpt":"Enable TOTP two-factor authentication to protect your account.","content":"<p>Two-factor authentication (TOTP) is available on every CARSAI HOST account. Enable it from Settings &rarr; Security.</p>","category":"Security","tags":["2fa","security"],"status":"published"}'
  '{"title":"Behind the scenes: how we encrypt FTP passwords","excerpt":"A technical deep-dive into our AES-256-GCM encryption layer.","content":"<p>FTP passwords returned by MOFH are encrypted at rest with AES-256-GCM. The encryption key is derived from JWT_SECRET via scrypt.</p>","category":"Engineering","tags":["security","engineering"],"status":"published"}'
  '{"title":"Mobile app now available","excerpt":"Manage your hosting on the go with the CARSAI HOST mobile app.","content":"<p>The CARSAI HOST mobile app (Capacitor 6) wraps the React web app and adds biometric auth, push notifications and encrypted on-device storage.</p>","category":"Announcements","tags":["mobile","release"],"status":"draft"}'
)

for post_json in "${POSTS[@]}"; do
  log "Creating post: $(echo "$post_json" | jq -r '.title' 2>/dev/null || echo '?')"
  RESP=$(curl -sS -X POST "${API_BASE}/api/v1/blog/posts" \
    -H 'Content-Type: application/json' \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    -d "$post_json")
  if [[ -n "$JQ" ]]; then
    echo "$RESP" | jq '{success, id: .data.id, slug: .data.slug, status: .data.status}'
  else
    echo "$RESP"
  fi
done

log "Seeded ${#POSTS[@]} posts."
