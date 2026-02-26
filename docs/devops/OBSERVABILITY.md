# Observability Standards — AI Training Portal

**Maintained by:** XBO DevOps
**Last updated:** 2026-02-24

---

## Logging Standards

### Principle: Structured stderr for errors, stdout for informational

All application logs go to **stdout/stderr only**. No log files are written inside the container. Container orchestration (Docker, Vercel) collects stdout/stderr automatically.

### Log levels by category

| Level | Stream | When to Use |
|-------|--------|-------------|
| `console.error()` | stderr | Caught exceptions, DB errors, unexpected failures |
| `console.warn()` | stderr | Recoverable issues, deprecated usage |
| `console.log()` | stdout | Startup messages, migration status, informational |

### Log format used in this codebase

All error logs follow the pattern:
```
[<service>/<route>] <message> <optional-error-object>
```

Examples from source:
```
[auth/login] DB connection lost Error: connect ECONNREFUSED
[quiz/submit] Unique constraint failed { code: 'P2002' }
```

This format makes log entries greppable by service/route name.

### What to log

**Always log:**
- Unhandled exceptions caught in `try/catch` (via `console.error`)
- Database errors (with full error object, no stack in production)
- Auth failures that are not user-input errors (e.g., DB unavailable during login)
- Startup events (migration start, migration complete, seed complete)

**Never log:**
- User passwords or password hashes
- Session IDs or cookies
- Full request bodies (may contain credentials)
- Anthropic API keys
- `DATABASE_URL` or any connection string with credentials

### Example: correct error logging in an API route
```typescript
try {
  // ... db operation
} catch (err) {
  console.error("[dashboard/kpis]", err);
  return NextResponse.json({ error: "Internal server error" }, { status: 500 });
}
```

**Never expose internal error details to the client.** Return a generic `{ error: "Internal server error" }` and log the full error server-side.

---

## Health Endpoint

### Endpoint
```
GET /api/health
```

### Response
```json
HTTP 200 OK
Content-Type: application/json

{
  "status": "ok",
  "timestamp": "2026-02-24T12:00:00.000Z"
}
```

### Design constraints
- **No database dependency.** The health endpoint must respond instantly even if the DB is down. Its purpose is liveness (is the process alive?), not readiness (can it serve requests?).
- **No authentication required.** Health endpoints must be publicly accessible to load balancers and Docker daemon.
- **Never return 5xx for a healthy process.** Only return non-200 if the process itself is in a bad state.

### Probing from Docker
The Dockerfile HEALTHCHECK and docker-compose.yml both use this endpoint:
```
HEALTHCHECK CMD wget -qO- http://localhost:3000/api/health || exit 1
```

### Probing from CI
After building and starting the container:
```bash
# Wait for health
timeout 60 sh -c 'until curl -sf http://localhost:3000/api/health; do sleep 2; done'
```

---

## Error Handling Standards

### API route error responses

All API routes must return structured JSON error responses. Never let Next.js return unformatted error pages from API routes.

| HTTP Status | When to Use |
|-------------|-------------|
| `400` | Client sent invalid input (missing fields, wrong types) |
| `401` | No session / session expired |
| `403` | Authenticated but insufficient role |
| `404` | Resource not found |
| `409` | Conflict (e.g., double-submit of quiz attempt) |
| `500` | Unexpected server error — log the full error, return generic message |

### Standard error response shape
```json
{ "error": "Human-readable message" }
```
For 500 errors, the message should always be generic (`"Internal server error"`). Never leak stack traces or DB error codes to clients.

### Prisma error codes to handle
| Code | Meaning | Correct Response |
|------|---------|-----------------|
| `P2002` | Unique constraint violation | `409 Conflict` |
| `P2025` | Record not found | `404 Not Found` |
| `P1001` | DB unreachable | `503 Service Unavailable` (or `500`) |

---

## Prisma Query Logging

Controlled by `NODE_ENV` in `src/lib/db.ts`:

```typescript
new PrismaClient({
  log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
})
```

- **Development**: Logs both errors and warnings (e.g., slow queries, deprecated usage).
- **Production**: Logs errors only. No query-level logging to avoid leaking data in logs.

To enable query-level logging temporarily in development for debugging:
```typescript
// Temporarily add "query" to the log array — never commit this
log: ["query", "error", "warn"]
```

---

## Startup Logging

`docker/entrypoint.sh` emits the following to stdout:
```
Applying Prisma migrations...
Migrations applied.
Seeding database...      # only if SEED_DB=true
Seed complete.           # only if SEED_DB=true
Starting Next.js on port 3000...
```

These messages indicate which phase of startup the container is in. If the container exits before "Starting Next.js...", the failure occurred during migrations or seeding.

---

## Observability in Production (Vercel)

When deployed to Vercel:
- Function logs are available in the Vercel dashboard under the "Logs" tab.
- Log retention: 1 hour (hobby), 7 days (pro/enterprise).
- All `console.error`, `console.warn`, and `console.log` calls from API routes appear in Vercel function logs.
- Edge middleware logs appear under "Edge Logs".

### Recommended log query for auth failures
```
[auth/login]
```

### Recommended log query for quiz submission errors
```
[quiz/submit]
```

---

## Future Observability Improvements

The following are documented improvements that are not yet implemented:

1. **Structured JSON logging**: Replace `console.error("[service]", err)` with a structured logger (e.g., `pino`) that outputs `{ level, service, message, error }` JSON objects. This enables log parsing and alerting in Datadog/Grafana Loki.

2. **Request ID propagation**: Add a `X-Request-ID` header to all API responses and log it with every error. Enables tracing a client error report to a specific server-side log entry.

3. **DB readiness endpoint**: Add a `/api/health/ready` endpoint that verifies DB connectivity (via `db.$queryRaw('SELECT 1')`). This distinguishes liveness from readiness for Kubernetes-style deployments.

4. **Error monitoring**: Integrate Sentry or similar for automatic error capture, grouping, and alerting on new error signatures.
