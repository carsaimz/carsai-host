#!/usr/bin/env bash
# scripts/release.sh
#
# Bump the version, commit, tag and push. Triggers the release.yml
# GitHub Actions workflow which builds and pushes Docker images to GHCR.
#
# Usage:
#   ./scripts/release.sh 1.2.0           # release v1.2.0
#   ./scripts/release.sh 1.2.0 --beta    # release v1.2.0-beta.1 (prerelease)
#   ./scripts/release.sh patch           # bump patch (1.0.0 -> 1.0.1)
#   ./scripts/release.sh minor           # bump minor
#   ./scripts/release.sh major           # bump major
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

log() {
  printf '\033[1;35m[release]\033[0m %s\n' "$*"
}
err() {
  printf '\033[1;31m[release][error]\033[0m %s\n' "$*" >&2
}

# ─── Pre-flight ────────────────────────────────────────────────
if ! command -v git >/dev/null 2>&1; then
  err "git is not installed"
  exit 1
fi

if [[ -n "$(git status --porcelain --untracked-files=no)" ]]; then
  err "Working tree is dirty. Commit or stash your changes first."
  git status --short
  exit 1
fi

BRANCH="$(git rev-parse --abbrev-ref HEAD)"
if [[ "$BRANCH" != "main" ]]; then
  err "Releases must be cut from 'main' (currently on '$BRANCH')."
  exit 1
fi

# ─── Determine the new version ─────────────────────────────────
INPUT="${1:-}"
BETA=0
if [[ "${2:-}" == "--beta" || "${2:-}" == "-b" ]]; then
  BETA=1
fi

if [[ -z "$INPUT" ]]; then
  err "Usage: $0 <version|patch|minor|major> [--beta]"
  err "Example: $0 1.2.0  or  $0 patch"
  exit 1
fi

# Current version is the highest semver tag, falling back to 0.0.0.
CURRENT="$(git describe --tags --abbrev=0 2>/dev/null || echo "v0.0.0")"
CURRENT="${CURRENT#v}"
log "Current version: v$CURRENT"

case "$INPUT" in
  patch|minor|major)
    IFS='.' read -r MAJOR MINOR PATCH <<<"$CURRENT"
    case "$INPUT" in
      patch) PATCH=$((PATCH + 1)) ;;
      minor) MINOR=$((MINOR + 1)); PATCH=0 ;;
      major) MAJOR=$((MAJOR + 1)); MINOR=0; PATCH=0 ;;
    esac
    NEW_VERSION="$MAJOR.$MINOR.$PATCH"
    ;;
  *)
    if [[ ! "$INPUT" =~ ^[0-9]+\.[0-9]+\.[0-9]+([.-][A-Za-z0-9]+)?$ ]]; then
      err "Invalid version: $INPUT"
      exit 1
    fi
    NEW_VERSION="$INPUT"
    ;;
esac

if [[ "$BETA" -eq 1 ]]; then
  # Append -beta.N
  TODAY="$(date +%Y%m%d)"
  NEW_VERSION="${NEW_VERSION}-beta.${TODAY}"
fi

if [[ "$NEW_VERSION" == "$CURRENT" ]]; then
  err "Version is already v$CURRENT"
  exit 1
fi

log "Bumping version: v$CURRENT -> v$NEW_VERSION"

# ─── Update version in package.json files ──────────────────────
# We update the root package.json + each workspace package.
for pkg in package.json packages/*/package.json; do
  if [[ -f "$pkg" ]]; then
    # Use node so we don't need jq.
    node -e "
      const fs = require('fs');
      const p = process.argv[1];
      const j = JSON.parse(fs.readFileSync(p, 'utf8'));
      j.version = process.argv[2];
      fs.writeFileSync(p, JSON.stringify(j, null, 2) + '\n');
    " "$pkg" "$NEW_VERSION"
  fi
done

# ─── Update CHANGELOG.md ───────────────────────────────────────
CHANGELOG="CHANGELOG.md"
if [[ -f "$CHANGELOG" ]]; then
  TODAY_ISO="$(date +%Y-%m-%d)"
  # Insert a new section after the # Changelog header.
  python3 - "$CHANGELOG" "$NEW_VERSION" "$TODAY_ISO" <<'PY'
import sys
path, version, date = sys.argv[1], sys.argv[2], sys.argv[3]
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()
header = f"## [{version}] - {date}\n\n- See the commit history for the full list of changes in this release.\n"
# Insert after the first heading line
lines = content.split('\n')
out = []
inserted = False
for i, line in enumerate(lines):
    out.append(line)
    if not inserted and line.startswith('# ') and i == 0:
        out.append('')
        out.append(header.rstrip('\n'))
        inserted = True
with open(path, 'w', encoding='utf-8') as f:
    f.write('\n'.join(out))
PY
fi

# ─── Commit, tag, push ─────────────────────────────────────────
git add package.json packages/*/package.json CHANGELOG.md
git commit -m "chore(release): v${NEW_VERSION}

Released by scripts/release.sh on $(date -u +%Y-%m-%dT%H:%M:%SZ)."

git tag -a "v${NEW_VERSION}" -m "CARSAI HOST v${NEW_VERSION}"

log "Pushing to origin..."
git push origin main
git push origin "v${NEW_VERSION}"

log ""
log "Done. v${NEW_VERSION} has been tagged and pushed."
log "The release.yml workflow will build Docker images and publish them to"
log "  ghcr.io/carsaimz/carsai-host-api:v${NEW_VERSION}"
log "  ghcr.io/carsaimz/carsai-host-web:v${NEW_VERSION}"
log "  ghcr.io/carsaimz/carsai-host-installer:v${NEW_VERSION}"
log ""
log "Track the run: https://github.com/$(git remote get-url origin | sed -E 's#.*github\.com[:/]##; s#\.git$##')/actions"
