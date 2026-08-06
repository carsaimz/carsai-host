# Contributing to CARSAI HOST

Thank you for your interest in contributing to CARSAI HOST. This file
is a short summary of how to get started. Read it in full before
opening your first pull request. The maintainers are happy to answer
questions in GitHub Discussions if anything is unclear.

## Quick Start

```bash
# 1. Fork the repo on GitHub and clone your fork
git clone https://github.com/<your-username>/carsai-host.git
cd carsai-host

# 2. Add the upstream remote
git remote add upstream https://github.com/carsaimz/carsai-host.git

# 3. Install dependencies (requires Node 20+ and pnpm 9+)
corepack enable
corepack prepare pnpm@9.12.0 --activate
pnpm install

# 4. Build the shared package (required by api and web)
pnpm --filter @carsai/shared build

# 5. Configure environment
cp packages/api/.env.example packages/api/.env
cp packages/web/.env.example packages/web/.env
echo "JWT_SECRET=$(openssl rand -hex 32)"           >> packages/api/.env
echo "JWT_REFRESH_SECRET=$(openssl rand -hex 32)"   >> packages/api/.env

# 6. Initialise the database
pnpm db:generate
pnpm db:migrate

# 7. Start the dev servers
pnpm dev
```

Open http://localhost:5173 to see the frontend. The first run will
redirect to `/install` — complete the wizard or skip it by creating
an admin user directly in the database.

## Branch Naming

Use the prefix that matches your work:

- `feature/` — new feature or enhancement
- `fix/` — bug fix
- `docs/` — documentation only
- `chore/` — tooling, deps, refactors with no behaviour change
- `refactor/` — code restructuring with no behaviour change
- `test/` — test-only changes
- `perf/` — performance improvement
- `i18n/` — translation updates

Example: `feature/softaculous-integration`. Branch names use
kebab-case and should be under 40 characters.

## Conventional Commits

Every commit message must follow Conventional Commits
(https://www.conventionalcommits.org/):

```
<type>(<optional scope>): <short description in imperative mood>

<optional body explaining why, wrapped at 72 chars>

<optional footer with BREAKING CHANGE: or Closes #123>
```

Allowed types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`,
`test`, `build`, `ci`, `chore`, `revert`. Examples:

```
feat: add Softaculous one-click installer
fix(auth): detect refresh token reuse across families
docs(api): document the /webhooks endpoints
chore(deps): upgrade drizzle-orm to 0.34.0
```

## Before Opening a PR

1. Rebase on `main`: `git fetch upstream && git rebase upstream/main`.
2. Run the full check suite locally:
   ```bash
   pnpm lint
   pnpm typecheck
   pnpm test
   pnpm build
   ```
3. Add tests for new behaviour (unit tests for services, integration
   tests for routes).
4. Update the README and inline code comments if your change affects
   user-visible behaviour.

## Pull Request Workflow

1. Push your branch to your fork.
2. Open a PR against `carsaimz/carsai-host` `main`.
3. Fill in the PR template (summary, type of change, breaking change
   flag, checklist, related issues).
4. A maintainer will review within 5 business days. Address feedback
   by pushing new commits (do not force-push during review).
5. Once approved, the maintainer will squash-merge your PR.

## Code of Conduct

Be respectful and inclusive in all interactions. Harassment, personal
attacks, and discriminatory language are not tolerated. The full
Code of Conduct is at https://carsai.host/code-of-conduct. Reports
go to **conduct@carsai.host** and are handled confidentially.

## Need Help?

- **GitHub Discussions** — for questions about how to use or extend
  CARSAI HOST.
- **GitHub Issues** — for confirmed bugs and feature requests (search
  before opening a new one).
- **Discord/Matrix** — for real-time chat with the community (links
  in the README).

We look forward to your contribution.
