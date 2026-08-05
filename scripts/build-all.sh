#!/usr/bin/env bash
# scripts/build-all.sh
#
# Build every package in the CARSAI HOST monorepo in dependency order:
#   1. @carsai/shared   (Zod schemas, types, i18n)
#   2. @carsai/api      (Express + Drizzle + better-sqlite3)
#   3. @carsai/web      (Vite + React SPA)
#   4. @carsai/installer (Vite + React installer wizard)
#
# Prerequisites:
#   - Node.js >= 20
#   - pnpm >= 9
#
# Usage:
#   ./scripts/build-all.sh          # install + build everything
#   ./scripts/build-all.sh --skip-install  # skip pnpm install
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

SKIP_INSTALL=0
if [[ "${1:-}" == "--skip-install" ]]; then
  SKIP_INSTALL=1
fi

log() {
  printf '\033[1;34m[build-all]\033[0m %s\n' "$*"
}

err() {
  printf '\033[1;31m[build-all][error]\033[0m %s\n' "$*" >&2
}

# ─── Pre-flight checks ─────────────────────────────────────────
if ! command -v pnpm >/dev/null 2>&1; then
  err "pnpm is not installed. Install it with: npm install -g pnpm@9"
  exit 1
fi

NODE_MAJOR="$(node -p 'process.versions.node.split(".")[0]')"
if [[ "$NODE_MAJOR" -lt 20 ]]; then
  err "Node.js >= 20 is required (running $(node -v))"
  exit 1
fi

# ─── Install dependencies ──────────────────────────────────────
if [[ "$SKIP_INSTALL" -eq 0 ]]; then
  log "Installing workspace dependencies (pnpm install --frozen-lockfile)..."
  if [[ -f pnpm-lock.yaml ]]; then
    pnpm install --frozen-lockfile
  else
    pnpm install
  fi
else
  log "Skipping pnpm install (--skip-install)"
fi

# ─── Build each package in dependency order ─────────────────────
PACKAGES=(@carsai/shared @carsai/api @carsai/web @carsai/installer)

for pkg in "${PACKAGES[@]}"; do
  log "Building $pkg..."
  if ! pnpm --filter "$pkg" build; then
    err "Build failed for $pkg"
    exit 1
  fi
done

# ─── Run migrations as a smoke test (idempotent) ───────────────
log "Running database migrations (smoke test)..."
if [[ ! -f packages/api/.env ]]; then
  cp packages/api/.env.example packages/api/.env
  # Generate random JWT secrets so env.ts validation passes.
  JWT_SECRET="$(openssl rand -hex 32 2>/dev/null || head -c 32 /dev/urandom | xxd -p | head -c 64)"
  JWT_REFRESH_SECRET="$(openssl rand -hex 32 2>/dev/null || head -c 32 /dev/urandom | xxd -p | head -c 64)"
  sed -i.bak "s|^JWT_SECRET=.*|JWT_SECRET=$JWT_SECRET|" packages/api/.env
  sed -i.bak "s|^JWT_REFRESH_SECRET=.*|JWT_REFRESH_SECRET=$JWT_REFRESH_SECRET|" packages/api/.env
  rm -f packages/api/.env.bak
fi
( cd packages/api && node scripts/migrate.js )

log "All packages built successfully."
log "  - shared:     packages/shared/dist"
log "  - api:        packages/api/dist"
log "  - web:        packages/web/dist"
log "  - installer:  packages/installer/dist"
