# Operations Runbook — AI Training Portal

**Maintained by:** XBO DevOps
**Last updated:** 2026-02-24

This runbook covers day-to-day operational tasks for the AI Training Portal. All commands assume Docker Compose for local/staging environments and the GHCR image for production.

---

## Table of Contents

1. [Service Architecture](#service-architecture)
2. [Starting and Stopping Services](#starting-and-stopping-services)
3. [Debugging a Failing Container](#debugging-a-failing-container)
4. [Restarting Services](#restarting-services)
5. [Database Operations](#database-operations)
6. [Rollback Procedure](#rollback-procedure)
7. [Log Collection](#log-collection)
8. [Resource Sizing](#resource-sizing)
9. [Health Checks](#health-checks)
10. [Common Failure Scenarios](#common-failure-scenarios)

---

## Service Architecture

```
                ┌─────────────────────────────────────┐
                │         docker-compose.yml           │
                │                                     │
                │  ┌──────────┐     ┌──────────────┐  │
  :3000 ────────┼─►│   web    │────►│      db      │  │
                │  │ (Next.js)│     │ (postgres:16) │  │
                │  └──────────┘     └──────┬───────┘  │
                │                          │           │
                │                   db_data (volume)   │
                └─────────────────────────────────────┘
```

- **web**: Next.js standalone server. Stateless. Rebuilt on every `docker compose up --build`.
- **db**: PostgreSQL 16. State persisted in `db_data` named volume. Never rebuild without backing up.
- **Migrations**: Run automatically at container startup via `prisma migrate deploy` in `entrypoint.sh`.
- **Seed**: Runs if `SEED_DB=true` (default in Compose). Idempotent — safe to run every startup.

---

## Starting and Stopping Services

### Start (first run or after code changes)
```bash
docker compose up --build
```

### Start (background, no rebuild)
```bash
docker compose up -d
```

### Start (background, force rebuild)
```bash
docker compose up --build -d
```

### Stop (preserve DB volume)
```bash
docker compose down
```

### Stop and wipe all data (destructive)
```bash
docker compose down -v
```

### Stop only the web container (useful for rolling restart)
```bash
docker compose stop web
docker compose start web
```

---

## Debugging a Failing Container

### Check container status and health
```bash
docker compose ps
```

### Follow live logs (all services)
```bash
docker compose logs -f
```

### Follow logs for a specific service
```bash
docker compose logs -f web
docker compose logs -f db
```

### Get last 100 lines of web logs
```bash
docker compose logs --tail=100 web
```

### Inspect container health status
```bash
docker inspect $(docker compose ps -q web) | jq '.[0].State.Health'
```

### Open a shell in the running web container
```bash
docker compose exec web sh
```

### Run a one-off command in the web container
```bash
# Check Prisma can connect to the DB
docker compose exec web node_modules/.bin/prisma db pull

# Check environment variables (never log secrets in prod)
docker compose exec web printenv DATABASE_URL
```

### Check health endpoint directly
```bash
curl -s http://localhost:3000/api/health
# Expected: {"status":"ok","timestamp":"..."}
```

---

## Restarting Services

### Graceful restart of the web container
```bash
# This sends SIGTERM to the running container (Node receives it via exec),
# waits for graceful shutdown (default 10s), then starts a new container.
docker compose restart web
```

### Force restart (kill + start)
```bash
docker compose kill web && docker compose up -d web
```

### Full stack restart without rebuild
```bash
docker compose down && docker compose up -d
```

### Full stack restart with rebuild (deploy new code)
```bash
docker compose down && docker compose up --build -d
```

---

## Database Operations

### Access the Postgres shell
```bash
docker compose exec db psql -U postgres -d claude_training
```

### Run a quick query
```bash
docker compose exec db psql -U postgres -d claude_training -c "SELECT id, externalId, role FROM \"User\";"
```

### Run pending migrations manually
```bash
docker compose exec web node_modules/.bin/prisma migrate deploy
```

### Run database seed manually (idempotent)
```bash
docker compose exec web node prisma/dist-seed/seed.js
```

### Open Prisma Studio (local only)
```bash
# Requires DATABASE_URL in your local environment
npm run db:studio
# Opens at http://localhost:5555
```

### Backup the database
```bash
# Dump to file
docker compose exec db pg_dump -U postgres claude_training > backup_$(date +%Y%m%d_%H%M%S).sql

# Dump compressed
docker compose exec db pg_dump -U postgres -Fc claude_training > backup_$(date +%Y%m%d_%H%M%S).dump
```

### Restore the database from backup
```bash
# DESTRUCTIVE: drops and recreates the database
docker compose exec -T db psql -U postgres -c "DROP DATABASE IF EXISTS claude_training;"
docker compose exec -T db psql -U postgres -c "CREATE DATABASE claude_training;"
docker compose exec -T db psql -U postgres claude_training < backup_20260224_120000.sql
```

### Reset the database (wipe all data, re-migrate, re-seed)
```bash
# WARNING: This destroys all data permanently
docker compose down -v
docker compose up --build -d
# entrypoint.sh will run migrations and seed automatically
```

### Check migration status
```bash
docker compose exec web node_modules/.bin/prisma migrate status
```

---

## Rollback Procedure

### Rollback to previous Docker image (GHCR)

1. Identify the last known-good image tag:
```bash
# List recent image tags on GHCR
# Replace with your actual image name
curl -s "https://ghcr.io/v2/charleskrammer/ai-plateforme/tags/list" \
  -H "Authorization: Bearer $(echo $GITHUB_TOKEN | base64)" | jq .
```

2. Update `docker-compose.yml` to use a pinned tag instead of `build: .`:
```yaml
# Temporary rollback — replace build: . with:
image: ghcr.io/charleskrammer/ai-plateforme:sha-<commit>
```

3. Pull and restart:
```bash
docker compose pull web
docker compose up -d web
```

4. After confirming stability, revert `docker-compose.yml` and redeploy from code.

### Rollback a database migration

Prisma does not support automatic rollback. Procedure:

1. Identify the migration to roll back by checking `prisma/migrations/`.
2. Manually write the reverse SQL and execute it via `psql`.
3. Delete the migration directory from `prisma/migrations/`.
4. Restore from backup if the migration caused data loss.

**Recommendation:** Always take a database backup (`pg_dump`) before running `prisma migrate deploy` in production.

---

## Log Collection

### All logs go to stdout/stderr
The web container writes all logs to stdout/stderr. No log files are written inside the container.

### Production log collection
Logs should be collected by:
- **Vercel**: Automatically collected, available in Vercel dashboard.
- **Docker/VPS**: Use a logging driver (e.g., `--log-driver=json-file` with rotation, or ship to Loki/Datadog/CloudWatch).

### Log format
Application logs follow this pattern:
```
[service/route] Error message {context}
```
Example:
```
[auth/login] DB connection lost Error: ...
[quiz/submit] Unique constraint failed { code: 'P2002' }
```

### Setting log verbosity
Prisma logging is controlled by `NODE_ENV`:
- `development`: logs `error` + `warn`
- `production`: logs `error` only

---

## Resource Sizing

### Minimum recommended (single-user / demo)
| Resource | Value |
|----------|-------|
| CPU | 0.5 vCPU |
| Memory | 512 MB |
| Disk | 2 GB (including DB volume) |

### Recommended (team of 5–20 users)
| Resource | Value |
|----------|-------|
| CPU | 1 vCPU |
| Memory | 1 GB |
| Disk | 10 GB |
| DB connections | 5–10 concurrent (Prisma connection pool default) |

### Notes on connection pooling
- **Local Docker Compose**: Direct connections, no pooler needed.
- **Neon/Vercel Postgres (serverless)**: Use the pooled connection string for `DATABASE_URL` (add `?pgbouncer=true&connection_limit=1`). Use the direct/unpooled string for `DATABASE_URL_UNPOOLED` (used by `prisma migrate deploy`).
- **Supabase**: Use the connection string with `?pgbouncer=true` for the pooled path.

---

## Health Checks

### Application health endpoint
```
GET /api/health
```
Returns `200 { "status": "ok", "timestamp": "<ISO>" }` immediately with no DB dependency.

This endpoint is used by:
- Docker HEALTHCHECK directive
- docker-compose.yml healthcheck
- Load balancer health probes

### Database health (within Docker Compose)
The `db` service uses `pg_isready` as its healthcheck:
```
pg_isready -U postgres -d claude_training
```

The `web` service waits for `db` to be healthy before starting (`depends_on: db: condition: service_healthy`).

### Checking health manually
```bash
# Application
curl -f http://localhost:3000/api/health

# Database
docker compose exec db pg_isready -U postgres -d claude_training
```

---

## Common Failure Scenarios

### Web container exits immediately
```bash
# Check exit logs
docker compose logs web

# Common causes:
# 1. DATABASE_URL not set
#    Fix: ensure DATABASE_URL is set in environment or .env.local
# 2. DB not ready yet
#    Fix: check 'db' service health: docker compose ps
# 3. Migration failed
#    Fix: check for conflicting migrations, restore from backup
```

### Migration fails at startup
```bash
# Check logs for Prisma error
docker compose logs web | grep -i "migration\|prisma\|error"

# Common causes:
# 1. DB not running
# 2. Schema conflict (manual DB change without migration)
# Fix: If data loss is acceptable: docker compose down -v && docker compose up --build
# Fix: If data must be preserved: manually resolve the conflict via psql
```

### Port 3000 already in use
```bash
# Find the process using port 3000
lsof -i :3000
# Kill it or change the port mapping in docker-compose.yml:
#   ports:
#     - "3001:3000"
```

### Healthcheck perpetually unhealthy
```bash
# Inspect health logs
docker inspect $(docker compose ps -q web) | jq '.[0].State.Health.Log'

# Common causes:
# 1. Server not yet started (increase start_period in healthcheck config)
# 2. /api/health returns error (check application logs)
```

### `Error: Cannot find module '@prisma/client'`
```bash
# Regenerate Prisma client
docker compose exec web node_modules/.bin/prisma generate
docker compose restart web
```

### Out of disk space (DB volume)
```bash
# Check volume size
docker system df -v

# Prune unused images and volumes (CAUTION: data loss)
docker image prune -a
# Never prune volumes without backup:
# docker volume prune  <-- DO NOT RUN unless you have a backup
```
