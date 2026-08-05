#!/usr/bin/env bash
# scripts/dev.sh
#
# Start the CARSAI HOST dev environment: API (port 3000), web (5173)
# and installer (5174) in parallel. Logs are prefixed with the
# package name.
#
# Usage:
#   ./scripts/dev.sh                # start all three
#   ./scripts/dev.sh api            # start only the API
#   ./scripts/dev.sh web installer  # start web + installer only
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

log() {
  printf '\033[1;36m[dev]\033[0m %s\n' "$*"
}

if ! command -v pnpm >/dev/null 2>&1; then
  echo "pnpm is not installed. Install it with: npm install -g pnpm@9" >&2
  exit 1
fi

# Determine which services to start.
SERVICES=("${@:-api web installer}")
if [[ $# -eq 0 ]]; then
  SERVICES=(api web installer)
fi

PIDS=()

cleanup() {
  log "Stopping dev servers..."
  for pid in "${PIDS[@]}"; do
    if kill -0 "$pid" 2>/dev/null; then
      kill "$pid" 2>/dev/null || true
    fi
  done
  wait 2>/dev/null || true
}
trap cleanup EXIT INT TERM

# ─── Ensure .env exists for the API ────────────────────────────
if [[ ! -f packages/api/.env ]]; then
  log "Creating packages/api/.env from .env.example..."
  cp packages/api/.env.example packages/api/.env
  JWT_SECRET="$(openssl rand -hex 32 2>/dev/null || head -c 32 /dev/urandom | xxd -p | head -c 64)"
  JWT_REFRESH_SECRET="$(openssl rand -hex 32 2>/dev/null || head -c 32 /dev/urandom | xxd -p | head -c 64)"
  sed -i.bak "s|^JWT_SECRET=.*|JWT_SECRET=$JWT_SECRET|" packages/api/.env
  sed -i.bak "s|^JWT_REFRESH_SECRET=.*|JWT_REFRESH_SECRET=$JWT_REFRESH_SECRET|" packages/api/.env
  rm -f packages/api/.env.bak
fi

# ─── Run migrations once before starting the API ───────────────
if [[ " ${SERVICES[*]} " =~ " api " ]]; then
  log "Running database migrations..."
  ( cd packages/api && node scripts/migrate.js ) || log "WARNING: migrations failed, API will still attempt to start"
fi

# ─── Start services ────────────────────────────────────────────
for svc in "${SERVICES[@]}"; do
  case "$svc" in
    api)
      log "Starting API on http://localhost:3000  (pnpm --filter @carsai/api dev)"
      pnpm --filter @carsai/api dev &
      PIDS+=("$!")
      ;;
    web)
      log "Starting web on http://localhost:5173  (pnpm --filter @carsai/web dev)"
      pnpm --filter @carsai/web dev &
      PIDS+=("$!")
      ;;
    installer)
      log "Starting installer on http://localhost:5174  (pnpm --filter @carsai/installer dev)"
      pnpm --filter @carsai/installer dev &
      PIDS+=("$!")
      ;;
    *)
      echo "Unknown service: $svc (valid: api | web | installer)" >&2
      exit 1
      ;;
  esac
done

log "All dev servers running. Press Ctrl+C to stop."

# Wait for any to exit; cleanup() will kill the rest.
wait "${PIDS[@]}" 2>/dev/null || true
