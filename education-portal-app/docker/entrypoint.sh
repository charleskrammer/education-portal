#!/bin/sh
set -e

echo "[entrypoint] Running database migrations..."
npx prisma migrate deploy

if [ "$SEED_DB" = "true" ]; then
  echo "[entrypoint] Seeding database..."
  node prisma/dist-seed/seed.js
fi

echo "[entrypoint] Starting Next.js server..."
exec node server.js
