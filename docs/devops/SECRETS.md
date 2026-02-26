# Secret Management Guide — AI Training Portal

**Maintained by:** XBO DevOps
**Last updated:** 2026-02-24

---

## Principle

**No secret ever touches the filesystem of a committed file, a Docker image layer, or a CI log.** This is non-negotiable.

---

## Secret Inventory

| Secret | Required | Where Used | Sensitivity |
|--------|----------|------------|-------------|
| `DATABASE_URL` | Yes | Prisma client, entrypoint.sh | HIGH — grants full DB access |
| `DATABASE_URL_UNPOOLED` | Yes (Neon/Vercel) | `prisma migrate deploy` | HIGH |
| `ANTHROPIC_API_KEY` | No (AI features) | `/api/grade-case`, `/api/assistant` | HIGH — costs money if leaked |
| `ANTHROPIC_MODEL` | No | `/api/grade-case` | LOW — public model name |
| `NODE_ENV` | No | Next.js, Prisma logging | LOW — not a secret, but affects behavior |

There is **no `SESSION_SECRET`** in this application. Sessions are DB-backed (Prisma `Session` model with random UUIDs), not JWT-signed. No symmetric key is required.

---

## Local Development

### Setup
```bash
# 1. Copy the example file — DO NOT edit .env.example directly
cp .env.example .env.local

# 2. Fill in your values
# DATABASE_URL: your local Postgres connection string
# ANTHROPIC_API_KEY: optional, only needed for AI features

# 3. Verify .env.local is NOT tracked
git ls-files .env.local
# Expected: no output (file is ignored by .gitignore)
```

### .gitignore coverage
`.env*` is covered by the `.gitignore` pattern. This prevents `.env`, `.env.local`, `.env.production`, and any variant from being accidentally committed.

**Verify at any time:**
```bash
git check-ignore -v .env.local
# Expected output: .gitignore:35:.env*    .env.local
```

---

## CI/CD (GitHub Actions)

Secrets are injected via GitHub Actions repository secrets. They are **never printed**, **never echoed**, and **never written to disk**.

### Required secrets for CI
| GitHub Secret Name | Maps to | Required For |
|--------------------|---------|--------------|
| `GITHUB_TOKEN` | Auto-provided | GHCR publish |

### Optional secrets for CI
| GitHub Secret Name | Maps to | Required For |
|--------------------|---------|--------------|
| `ANTHROPIC_API_KEY` | `ANTHROPIC_API_KEY` | AI-related tests (currently mocked) |

### Adding a new CI secret
1. Go to: `https://github.com/charleskrammer/AI-Plateforme/settings/secrets/actions`
2. Click "New repository secret"
3. Name it and paste the value
4. Reference it in `.github/workflows/ci.yml` as `${{ secrets.SECRET_NAME }}`

### CI secrets are NOT available in fork PRs
GitHub Actions does not expose repository secrets to pull requests from forks. AI-feature tests are mocked to work without the API key.

---

## Production Deployment

### Vercel (current deployment target)
Vercel injects environment variables through the Vercel dashboard or CLI. They are encrypted at rest and never exposed in logs.

```bash
# Set a secret via Vercel CLI
vercel env add ANTHROPIC_API_KEY production

# List configured env vars (values hidden)
vercel env ls
```

Vercel also auto-injects `DATABASE_URL` and `DATABASE_URL_UNPOOLED` when the Neon integration is connected. Do not set these manually if using the Neon marketplace integration.

### Self-hosted Docker
Use Docker secrets or environment injection at runtime. Never pass secrets via `docker build --build-arg`.

```bash
# Correct: inject at runtime
docker run \
  -e DATABASE_URL="postgresql://..." \
  -e ANTHROPIC_API_KEY="sk-ant-..." \
  ghcr.io/charleskrammer/ai-plateforme:latest

# Wrong: do NOT bake into image
# docker build --build-arg DATABASE_URL="..." .
```

For Docker Swarm / compose production:
```yaml
# Use external secret references, not inline values
secrets:
  db_url:
    external: true

services:
  web:
    secrets:
      - db_url
    environment:
      DATABASE_URL_FILE: /run/secrets/db_url
```

---

## Key Rotation

### Anthropic API Key
If `ANTHROPIC_API_KEY` is suspected compromised:
1. Log in to [console.anthropic.com](https://console.anthropic.com)
2. Navigate to API Keys and revoke the compromised key
3. Generate a new key
4. Update:
   - Vercel dashboard (Production, Preview, Development environments)
   - GitHub Actions secrets (if used in CI)
   - Local `.env.local` files on all developer machines
5. Verify the old key no longer works:
   ```bash
   curl -s -o /dev/null -w "%{http_code}" \
     -H "x-api-key: OLD_KEY_HERE" \
     -H "anthropic-version: 2023-06-01" \
     https://api.anthropic.com/v1/models
   # Expected after revocation: 401
   ```

### Database Password
If `DATABASE_URL` credentials are suspected compromised:
1. Generate new credentials in your Postgres provider (Neon/Supabase/RDS)
2. Update `DATABASE_URL` and `DATABASE_URL_UNPOOLED` in all environments
3. Restart the application

---

## Secret Scanning

### Pre-commit check (manual)
```bash
# Scan for common secret patterns in staged files
git diff --cached | grep -E "(sk-ant-|password\s*=\s*['\"][^'\"]{8}|api_key\s*=)"
```

### Trivy secret scan (automated in CI)
The CI pipeline runs:
```bash
trivy fs --scanners secret --severity HIGH,CRITICAL .
```
This catches common secret patterns including Anthropic API keys, AWS keys, and generic high-entropy strings.

### If a secret is committed
1. **Immediately rotate the secret** — assume it is compromised.
2. Remove the secret from git history:
   ```bash
   # Using git-filter-repo (preferred over BFG)
   git filter-repo --path .env --invert-paths
   # or for a specific string:
   git filter-repo --replace-text <(echo "sk-ant-ACTUAL_KEY==>REDACTED")
   ```
3. Force-push to all branches (coordinate with team).
4. Notify affected service owners.
5. Document in incident log.

---

## What is NOT a secret

The following are **not secrets** and can safely appear in code:
- `ANTHROPIC_MODEL` value (e.g., `claude-sonnet-4-20250514`) — public model name
- Demo user passwords (`claude123`, `manage123`) in `prisma/seed.ts` — intentionally public demo data
- `NODE_ENV` values (`production`, `development`) — configuration, not credentials
- Port numbers, hostnames (without credentials)
