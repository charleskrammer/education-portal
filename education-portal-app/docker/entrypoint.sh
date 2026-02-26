#!/bin/sh
set -e

log() { printf 'ts=%s level=info msg="%s"\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$1"; }
log_err() { printf 'ts=%s level=error msg="%s"\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$1" >&2; }

log "running database migrations"
npx prisma migrate deploy

if [ "$SEED_DB" = "true" ]; then
  log "seeding database"
  node prisma/dist-seed/seed.js
fi

log "starting Next.js server port=8080"
exec node server.js
