# syntax=docker/dockerfile:1

# ── Stage 1: Install dependencies ─────────────────────────────────────────────
FROM node:24-bookworm-slim AS deps
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

RUN corepack enable

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# ── Stage 2: Build application ────────────────────────────────────────────────
FROM deps AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

COPY prisma ./prisma
RUN npx prisma generate

COPY . .
RUN DOCKER_BUILD=1 pnpm run build
RUN npx tsc -p prisma/tsconfig.seed.json
RUN pnpm prune --prod

# ── Stage 3: Production runtime ───────────────────────────────────────────────
FROM node:24-bookworm-slim AS runtime
WORKDIR /app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates openssl \
  && rm -rf /var/lib/apt/lists/*

# Non-root user: node (uid 1000) already exists in the node:* base image
RUN groupadd --gid 1001 nodejs \
  && useradd --uid 1001 --gid nodejs --shell /bin/bash --create-home nextjs

COPY docker/entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

# Copy standalone Next.js server and its bundled node_modules
COPY --from=build --chown=nextjs:nodejs /app/.next/standalone ./
# Overwrite standalone node_modules with the full pruned production set
# (provides prisma CLI + @prisma/client + bcryptjs for migrations & seeding)
COPY --from=build --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=build --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=build --chown=nextjs:nodejs /app/public ./public
COPY --from=build --chown=nextjs:nodejs /app/prisma ./prisma

EXPOSE 3000

# Health check: /api/health returns 200 {"status":"ok"} instantly with no DB
# dependency — a pure liveness probe. wget is available in bookworm-slim.
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD wget -qO- http://localhost:3000/api/health >/dev/null 2>&1 || exit 1

USER nextjs

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
