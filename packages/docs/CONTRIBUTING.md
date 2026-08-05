# CARSAI HOST — Contribution Guide

Thank you for your interest in contributing to CARSAI HOST. This
document explains how to set up a development environment, the
conventions we follow, and the process for getting your changes merged.
Whether you are fixing a typo in the docs or implementing a major
feature, the workflow is the same: fork, branch, commit, push, open a
pull request, address review feedback, merge. We aim to review every
PR within 5 business days and to merge approved PRs within 10.

---

## 1. Code of Conduct

By participating in this project you agree to uphold the following
standards. Be respectful and inclusive in all interactions. Assume good
faith: most disagreements stem from miscommunication, not malice. Focus
critique on the code, not the person. Harassment, personal attacks,
and discriminatory language are not tolerated and will result in a
warning, a temporary ban, or a permanent ban depending on severity.

If you witness or experience behaviour that violates this code,
contact the maintainers at **conduct@carsai.host**. All reports are
handled confidentially. The full Code of Conduct, including the
enforcement procedure, is at
https://carsai.host/code-of-conduct (mirrored in
`packages/docs/CODE_OF_CONDUCT.md` in the repo for offline reading).

We want CARSAI HOST to be a welcoming project for newcomers,
experienced developers, translators, designers, and everyone in
between. The diversity of our community is a strength, and we are
committed to keeping the project a place where everyone can contribute
without fear of being marginalised.

---

## 2. Development Environment Setup

### 2.1 Prerequisites

- **Node.js 20+** — install via your system package manager, nvm, or
  the official installer from https://nodejs.org.
- **pnpm 9+** — enable via `corepack enable && corepack prepare
  pnpm@9.12.0 --activate` (Node 16.13+ ships with corepack).
- **Git 2.30+** — for cloning, branching, and Conventional Commits.
- **Python 3, make, g++** — required to build the `better-sqlite3`
  native addon. On Debian/Ubuntu: `sudo apt-get install -y python3
  make g++ build-essential`. On macOS: `xcode-select --install`.

### 2.2 Fork and Clone

```bash
# 1. Fork the repo on GitHub (click the Fork button)
# 2. Clone your fork
git clone https://github.com/<your-username>/carsai-host.git
cd carsai-host

# 3. Add the upstream remote for syncing
git remote add upstream https://github.com/carsaimz/carsai-host.git
git fetch upstream

# 4. Install dependencies
pnpm install

# 5. Build the shared package (required by api and web)
pnpm --filter @carsai/shared build
```

### 2.3 Configure Environment

```bash
cp packages/api/.env.example packages/api/.env
cp packages/web/.env.example packages/web/.env

# Generate JWT secrets
echo "JWT_SECRET=$(openssl rand -hex 32)"           >> packages/api/.env
echo "JWT_REFRESH_SECRET=$(openssl rand -hex 32)"   >> packages/api/.env

# (Optional) Fill in MOFH credentials for real account creation tests.
# Leave blank to run in degraded mode — the API will start fine.
```

### 2.4 Initialise the Database

```bash
pnpm db:generate     # generates Drizzle migrations from schema.ts
pnpm db:migrate      # applies migrations to packages/api/data/carsai.db
```

### 2.5 Start the Dev Servers

```bash
pnpm dev
```

This runs `turbo run dev --parallel`, which starts the Vite dev server
on port 5173 and the Express API on port 3000 with hot reload. Open
http://localhost:5173 to see the frontend. The first run will redirect
you to `/install` — complete the wizard (or skip it by manually
creating an admin user in the database and touching
`packages/api/data/.installed`).

---

## 3. Branch Naming

All work happens on branches off `main`. Use the following prefixes to
indicate the type of work:

| Prefix | Purpose | Example |
|--------|---------|---------|
| `feature/` | New feature or enhancement | `feature/softaculous-integration` |
| `fix/` | Bug fix | `fix/refresh-token-reuse-detection` |
| `docs/` | Documentation only | `docs/mofh-rate-limits` |
| `chore/` | Tooling, deps, refactors with no behavior change | `chore/upgrade-drizzle-0.34` |
| `refactor/` | Code restructuring with no behavior change | `refactor/extract-mofh-service` |
| `test/` | Test-only changes | `test/auth-route-integration` |
| `perf/` | Performance improvement | `perf/cache-blog-posts` |
| `i18n/` | Translation updates | `i18n/fr-blog-namespace` |
| `release/` | Release preparation (maintainers only) | `release/v1.1.0` |

Branch names use **kebab-case** (lowercase, hyphen-separated). The
prefix is followed by a slash and a short, descriptive name. Keep the
name under 40 characters so it fits comfortably in `git log --oneline`
and PR titles.

```bash
# Create a branch
git checkout -b feature/softaculous-integration main

# Keep it up to date with upstream
git fetch upstream
git rebase upstream/main
```

Rebasing (rather than merging) keeps the history linear and makes
bisecting easier. If you are not comfortable with rebase, merge is
acceptable — the maintainer will squash-merge your PR anyway, so the
intermediate history does not matter.

---

## 4. Conventional Commits

CARSAI HOST follows the **Conventional Commits** specification
(https://www.conventionalcommits.org/). Every commit message must
start with a type, an optional scope in parentheses, an optional `!`
for breaking changes, a colon, and a short description in the
imperative mood.

### 4.1 Allowed Types

| Type | Meaning |
|------|---------|
| `feat` | A new feature visible to users |
| `fix` | A bug fix |
| `docs` | Documentation changes (Markdown, docstrings) |
| `style` | Code style only (whitespace, formatting, semicolons) |
| `refactor` | Code restructuring with no behavior change |
| `perf` | Performance improvement |
| `test` | Adding or fixing tests |
| `build` | Build system, dependencies, package.json |
| `ci` | CI/CD configuration |
| `chore` | Miscellaneous tasks that don't fit elsewhere |
| `revert` | Reverting a previous commit |

### 4.2 Examples

```
feat: add Softaculous one-click installer
feat(api): add GET /api/v1/softaculous/apps endpoint
fix(auth): detect refresh token reuse across families
docs(api): document the /webhooks endpoints
refactor(mofh): extract XML-RPC parser into separate module
perf(db): add composite index on hosting_accounts(user_id, status)
test(accounts): add integration test for MOFH createAccount
chore(deps): upgrade drizzle-orm to 0.34.0
ci: cache pnpm store in GitHub Actions
```

### 4.3 Breaking Changes

If your commit introduces a breaking change, add `!` after the type
and scope, and include a `BREAKING CHANGE:` footer describing the
migration path:

```
feat(api)!: change /accounts response shape

The "password" field is no longer included in GET /accounts/:id
responses. Use the dedicated POST /accounts/:id/reveal-password
endpoint instead.

BREAKING CHANGE: /accounts/:id no longer returns "password".
Frontend clients must call /accounts/:id/reveal-password.
```

Breaking changes require a major version bump (1.x.x -> 2.0.0) and
should be discussed in an issue before implementation.

### 4.4 Commit Body

The commit body (optional, separated from the subject by a blank line)
should explain **why** the change was made, not **what** changed (the
diff already shows that). Wrap lines at 72 characters. Reference
issues and PRs with `#123` syntax. Example:

```
fix(auth): detect refresh token reuse across families

The previous implementation only checked if the presented refresh
token was revoked, not if any sibling in the same family had been
used after it. This allowed an attacker who stole a refresh token
to continue using it after the legitimate user had rotated.

Closes #142.
```

---

## 5. Pull Request Workflow

### 5.1 Before Opening a PR

1. **Rebase on `main`** to avoid merge commits and to catch conflicts
   early: `git fetch upstream && git rebase upstream/main`.
2. **Run the full check suite locally**:
   ```bash
   pnpm lint        # ESLint across all packages
   pnpm typecheck   # TypeScript strict mode across all packages
   pnpm test        # Vitest unit + integration tests
   pnpm build       # Build all packages (catches build-only errors)
   ```
3. **Update documentation** if your change affects user-facing
   behaviour. The docs in `packages/docs/` should be updated in the
   same PR. The CHANGELOG entry is added by the maintainer at release
   time, so you do not need to touch `CHANGELOG.md`.
4. **Add tests** for new behaviour. Every new endpoint should have at
   least one integration test; every new service function should have
   at least one unit test. See section 7 for details.

### 5.2 Opening the PR

Open the PR against the `carsaimz/carsai-host` `main` branch. The PR
template (in `.github/pull_request_template.md`) asks for:

- **Summary** — 2-3 sentences explaining what the PR does and why.
- **Type of change** — feature / fix / docs / refactor / test / chore.
- **Breaking change** — yes/no (with migration notes if yes).
- **Checklist** — `[x]` items for tests, docs, lint, typecheck, build.
- **Related issues** — `Closes #123`, `Refs #456`.

Keep the PR description up to date as the PR evolves. If review
feedback changes the scope, update the summary so the maintainer can
write accurate release notes from the PR description alone.

### 5.3 Review Process

A maintainer will review your PR within 5 business days. The review
focuses on:

- **Correctness** — does the code do what the PR says it does? Are
  edge cases handled?
- **Security** — does the change introduce any new attack surface?
  Are inputs validated? Are outputs sanitised?
- **Tests** — are there tests for the new behaviour? Do they cover
  failure paths?
- **Documentation** — are the docs updated? Are there code comments
  where the logic is non-obvious?
- **Style** — does the code follow the existing patterns? Are names
  consistent? Is the diff minimal (no unrelated reformats)?

Address review feedback by pushing new commits to the same branch
(`git commit --fixup` is helpful). Do not force-push during review
unless asked — it makes the diff hard to follow. Once the PR is
approved, the maintainer will squash-merge it into `main`.

### 5.4 After Merge

After your PR is merged, delete your local branch and pull the latest
`main`:

```bash
git checkout main
git pull upstream main
git branch -d feature/your-branch-name
```

Your contribution will appear in the next release's CHANGELOG under
the appropriate section (`Features`, `Bug Fixes`, etc.). If you made
multiple contributions to a release, you will be listed once with a
summary of all your changes.

---

## 6. Code Style

### 6.1 Prettier

The repository ships a `.prettierrc` at the root that applies to all
packages. The configuration is:

```json
{
  "semi": true,
  "singleQuote": true,
  "trailingComma": "all",
  "printWidth": 100,
  "tabWidth": 2,
  "arrowParens": "always"
}
```

Run `pnpm format` to format the entire codebase. Most editors can be
configured to format on save (VS Code: install the Prettier extension
and set `editor.formatOnSave: true`). Do not disable Prettier for
individual files — if a file needs different formatting, discuss it in
an issue first.

### 6.2 ESLint

Each package has its own `.eslintrc.cjs` that extends the shared
config. The key rules:

- `@typescript-eslint/strict` — enables strict type checking rules.
- `@typescript-eslint/no-unused-vars` — error, with `argsIgnorePattern:
  ^_` to allow intentionally-unused parameters.
- `@typescript-eslint/no-floating-promises` — error. Every Promise
  must be `await`ed, `.catch()`ed, or explicitly marked with
  `void` to indicate fire-and-forget.
- `no-console` — error in production code. Use the `logger` utility
  from `packages/api/src/utils/logger.ts` instead.
- `eqeqeq` — error. Always use `===` and `!==`.

Run `pnpm lint` to check. Run `pnpm lint --fix` to auto-fix what can
be auto-fixed.

### 6.3 TypeScript Strict Mode

All packages have `"strict": true` in their `tsconfig.json`. This
enables strict null checks, no implicit any, and a host of other
safety nets. Do not weaken the strictness with `// @ts-ignore` or
`as any` — if the types are wrong, fix the types. If you genuinely
need to suppress a type error, use `// @ts-expect-error` with a
comment explaining why, so that the suppression is flagged if the
underlying issue is ever fixed.

---

## 7. Testing Requirements

### 7.1 Unit Tests

Unit tests live next to the source file with a `.test.ts` suffix. For
example, the unit tests for `packages/api/src/utils/auth.ts` are in
`packages/api/src/utils/auth.test.ts`. Tests use Vitest (the test
runner is configured in `packages/api/vitest.config.ts`).

Every service function should have at least one happy-path test and
one failure-path test. For example, the `MofhClient.createAccount`
function has tests for: successful creation (mock returns `result=1`),
MOFH rejection (mock returns `result=0` with a reason), and network
failure (mock throws a connection error). Run the unit tests with
`pnpm --filter @carsai/api test`.

### 7.2 Integration Tests

Integration tests live in `packages/api/test/` and exercise the full
Express stack: they start the API on a random port, make real HTTP
requests with `supertest`, and assert on the response. The database
is a temporary in-memory SQLite that is recreated for each test file.

Every route should have at least one integration test that covers:
the happy path (201/200 with the expected body), the auth failure
(401 without a token, 403 with wrong role), the validation failure
(400 with malformed body), and the not-found case (404 with a
non-existent ID). Run the integration tests with `pnpm --filter
@carsai/api test:integration`.

### 7.3 Test Coverage

Coverage is reported by Vitest but there is no hard threshold. As a
rule of thumb, aim for at least 80% line coverage on services and
routes. Coverage is not enforced in CI because chasing a number
leads to low-value tests; instead, reviewers evaluate whether the
tests meaningfully exercise the new behaviour.

### 7.4 Snapshot Tests

Avoid snapshot tests for serialised objects — they break on every
cosmetic change and reviewers cannot easily tell whether a diff is
correct. Use explicit assertions instead. The one exception is
generated output (e.g. the XML-RPC envelope in `MofhClient.call`)
where a snapshot makes sense because the output is a stable
deterministic string.

---

## 8. Documentation Updates

If your PR changes user-visible behaviour, you must update the
documentation in the same PR. The docs live in `packages/docs/` and
are written in Markdown. The relevant files:

| Change type | File to update |
|-------------|----------------|
| New API endpoint | `packages/docs/API.md` |
| New env var | `packages/docs/INSTALL.md` + `packages/api/.env.example` |
| New database table | `packages/docs/ARCHITECTURE.md` (section 4.2) |
| Security-relevant change | `packages/docs/SECURITY.md` |
| New MOFH operation | `packages/docs/MOFH.md` |
| New i18n key namespace | `packages/docs/I18N.md` (section 5.2) |
| Deployment change | `packages/docs/DEPLOYMENT.md` |
| Release | `packages/docs/CHANGELOG.md` (maintainers only) |

Each Markdown file is expected to have at least 150-200 words per
section, with paragraphs of 3-5 sentences. Avoid one-line sections
and placeholders. If you are not sure how to document something,
open a draft PR and ask — the maintainers are happy to help shape
the documentation.

Code comments should explain **why**, not **what**. A comment that
restates the code (`// increment counter`) adds noise; a comment that
explains a non-obvious decision (`// We use scryptSync instead of
pbkdf2 because scrypt is memory-hard and resists GPU brute-force`)
adds value. When in doubt, err on the side of more comments for
non-obvious logic and fewer comments for straightforward code.

---

## 9. Issue Triage

GitHub issues are the primary channel for bug reports, feature
requests, and questions. The maintainers triage issues twice weekly
(Tuesday and Friday). The triage process assigns one of the following
labels:

| Label | Meaning |
|-------|---------|
| `bug` | Confirmed defect in released code |
| `feature` | Request for new functionality |
| `enhancement` | Improvement to existing functionality |
| `question` | Usage question (converted to discussion if appropriate) |
| `duplicate` | Already tracked in another issue |
| `wontfix` | Out of scope or against project goals |
| `needs-repro` | Reporter needs to provide a reproduction |
| `needs-triage` | Newly opened, not yet reviewed |
| `good first issue` | Suitable for a newcomer |
| `help wanted` | Open to community contribution |
| `priority:low/medium/high/urgent` | Importance for next release |
| `area:*` | Component area (api, web, mobile, docs, i18n, mofh) |

If you open an issue, please include the following information so it
can be triaged quickly:

- **CARSAI HOST version** (from `GET /api/v1/info` or `package.json`).
- **Node.js and pnpm versions** (`node --version`, `pnpm --version`).
- **Operating system** (Linux distro, macOS version, Windows build).
- **Steps to reproduce** — the smallest set of steps that triggers
  the issue. Include the exact `curl` command or UI click sequence.
- **Expected behaviour** vs. **actual behaviour**.
- **Logs** — paste the relevant lines from `logs/api.err.log` or the
  browser console. Redact any secrets (passwords, tokens, MOFH
  credentials) before pasting.

Issues that go 30 days without a response from the reporter are
closed as `stale`. They can be reopened with a comment if the issue
is still relevant.

---

## 10. Release Process

Releases are cut by maintainers from the `main` branch. The process
is:

1. **Verify `main` is green.** The CI workflow on the latest commit
   must be passing with no flaky test failures.
2. **Bump the version.** Run `pnpm version <major|minor|patch>` at
   the repository root. This bumps the version in `package.json`,
   `packages/shared/src/constants/index.ts` (`APP_VERSION`), and
   `packages/api/src/index.ts` (the `/` route's `version` field).
3. **Update the CHANGELOG.** Add a new section to
   `packages/docs/CHANGELOG.md` with the version, date, and a
   categorised list of changes (`Features`, `Bug Fixes`, `Docs`,
   `Chores`). Each entry references the PR that introduced it.
4. **Commit and tag.** `git commit -m "chore(release): v1.1.0"` and
   `git tag v1.1.0`. Push both: `git push && git push --tags`.
5. **Build the Docker image.** `docker build -t carsai-host:1.1.0
   -f docker/Dockerfile .` and push to the registry.
6. **Publish the GitHub release.** Use the tag's commit as the
   target; copy the CHANGELOG section into the release notes.
7. **Announce.** Post to the project blog, the community forum, and
   the Discord/Matrix channels.

The release process is semi-automated: a GitHub Actions workflow
`.github/workflows/release.yml` handles steps 5-7 once the tag is
pushed. Steps 1-4 remain manual to give the maintainer a chance to
catch last-minute issues.

Patch releases (1.1.0 -> 1.1.1) may be cut from a `release/1.1.x`
maintenance branch if `main` has moved on to breaking changes. Minor
and major releases are always cut from `main`. We do not maintain
more than one minor release branch simultaneously — if you need a
fix backported, cherry-pick the commit onto `release/1.1.x` and
open a PR against that branch.
