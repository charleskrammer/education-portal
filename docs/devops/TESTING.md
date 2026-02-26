# Testing Guide — AI Training Portal

**Maintained by:** XBO DevOps
**Last updated:** 2026-02-24

---

## Overview

This project uses **Jest 29** with separate configurations for backend (Node environment) and frontend (jsdom environment). Coverage thresholds are enforced at 90% across all four metrics for both suites.

---

## Test Architecture

### Two Jest configurations

| Config | File | Environment | Covers |
|--------|------|-------------|--------|
| Backend | `jest.config.backend.js` | `node` | `src/lib/*.ts`, `src/app/api/**/*.ts` |
| Frontend | `jest.config.frontend.js` | `jest-environment-jsdom` | `src/components/**/*.tsx`, `src/hooks/**/*.ts` |

Both configs use **Next.js SWC transformer** (via `next/jest`) — no `ts-jest` required. Path alias `@/` maps to `src/` in both configs.

### Test setup file
`jest.setup.ts` imports `@testing-library/jest-dom` to extend Jest matchers with DOM assertions (`toBeInTheDocument`, `toHaveTextContent`, etc.). Referenced only by `jest.config.frontend.js`.

---

## Running Tests

### All tests (backend + frontend, coverage enforced)
```bash
npm test
```

### Backend tests only
```bash
npm run test:backend
```

### Frontend tests only
```bash
npm run test:frontend
```

### With coverage output (explicit)
```bash
# Backend coverage report
npm run test:coverage:backend

# Frontend coverage report
npm run test:coverage:frontend
```

### Without coverage enforcement (watch mode, development)
```bash
# Backend
npx jest --config jest.config.backend.js --watch

# Frontend
npx jest --config jest.config.frontend.js --watch
```

### Run a single test file
```bash
npx jest --config jest.config.backend.js src/lib/scoring.test.ts
npx jest --config jest.config.frontend.js src/components/Quiz.test.tsx
```

### Run tests matching a name pattern
```bash
npx jest --config jest.config.backend.js -t "calcQuizPoints"
```

---

## Coverage Thresholds

Both suites enforce **90% minimum** for all four metrics:

| Metric | Threshold |
|--------|-----------|
| Statements | ≥ 90% |
| Branches | ≥ 90% |
| Functions | ≥ 90% |
| Lines | ≥ 90% |

CI fails if any metric falls below 90%. Coverage is measured only against the files listed in `collectCoverageFrom` in each config — not all source files.

### Backend coverage scope
```
src/lib/scoring.ts
src/lib/scoring.server.ts
src/lib/training.ts
src/lib/auth.ts
src/lib/session.ts
src/app/api/auth/login/route.ts
src/app/api/auth/logout/route.ts
src/app/api/auth/me/route.ts
src/app/api/quiz/submit/route.ts
src/app/api/quiz/[videoId]/route.ts
src/app/api/progress/route.ts
src/app/api/dashboard/kpis/route.ts
src/app/api/manager/metrics/route.ts
src/app/api/grade-case/route.ts
```

Excluded from backend coverage:
- `src/app/api/assistant/route.ts` — requires live Anthropic API (not mockable without SDK)
- `src/lib/db.ts` — singleton Prisma client, tested by mocking in all route tests
- `src/app/api/health/route.ts` — trivial (returns `{ status: "ok" }`, no branches)

### Frontend coverage scope
```
src/components/AuthProvider.tsx
src/components/AuthGate.tsx
src/components/NavBar.tsx
src/components/Quiz.tsx
src/hooks/useApiProgress.ts
src/hooks/useApiQuizAttempts.ts
src/hooks/useDashboard.ts
```

---

## Test File Inventory (21 files)

### Backend (lib + API routes)
| Test File | Tests | What It Validates |
|-----------|-------|-------------------|
| `src/lib/auth.test.ts` | 12 | Legacy auth helpers, sanitizeUser, authenticate, getTeamById |
| `src/lib/scoring.test.ts` | 14 | Scoring constants, computeGrade, computePercentile, computeRankPosition, calcQuizPoints, maxPoints |
| `src/lib/scoring.server.test.ts` | 13 | latestAttemptsPerQuiz, sumScore, scoreQuizAttempt with bonus logic |
| `src/lib/session.test.ts` | 7 | getSessionUser — null session, expired session, valid session, delete failure |
| `src/lib/training.test.ts` | 11 | ALLOWED_CHANNELS, isChannelAllowed, validateChannels, getStepById, getAllVideos, getOfficialVideos |
| `src/app/api/auth/login/route.test.ts` | 7 | POST /api/auth/login — 400/401/200/500 paths, session cookie |
| `src/app/api/auth/logout/route.test.ts` | 2 | POST /api/auth/logout — 200 response, cookie cleared |
| `src/app/api/auth/me/route.test.ts` | 2 | GET /api/auth/me — null session, valid session |
| `src/app/api/quiz/submit/route.test.ts` | 8 | POST /api/quiz/submit — 401/400/404/200/409/500, first-attempt bonus |
| `src/app/api/quiz/[videoId]/route.test.ts` | 4 | GET /api/quiz/:videoId — 401, empty attempts, multiple attempts, best |
| `src/app/api/progress/route.test.ts` | 7 | GET+POST /api/progress — auth, CRUD, upsert behavior |
| `src/app/api/dashboard/kpis/route.test.ts` | 4 | GET /api/dashboard/kpis — 401, zeroed KPIs, scoring, streak, grade |
| `src/app/api/manager/metrics/route.test.ts` | 4 | GET /api/manager/metrics — 401/403, team rows, sort, accuracy |
| `src/app/api/grade-case/route.test.ts` | 9 | POST /api/grade-case — missing key, incomplete body, API success/failure, score clamping, JSON extraction |

### Frontend (components + hooks)
| Test File | Tests | What It Validates |
|-----------|-------|-------------------|
| `src/components/AuthProvider.test.tsx` | 6 | AuthProvider mount, login(), logout(), error handling, useAuth guard |
| `src/components/AuthGate.test.tsx` | 7 | Public routes, loading state, redirect when unauthenticated, render when authenticated |
| `src/components/NavBar.test.tsx` | 5 | Unauthenticated nav, user info display, role-based links, logout call |
| `src/components/Quiz.test.tsx` | 11 | Render, submit gating, feedback, scoring display, retry, +15/+10/0 pts labels |
| `src/hooks/useApiProgress.test.ts` | 9 | Fetch, setVideoDone, setTopicDone, setStepDone, isTopicDone, isStepDone, statsForStep |
| `src/hooks/useApiQuizAttempts.test.ts` | 4 | Fetch, submitAttempt success, submitAttempt failure |
| `src/hooks/useDashboard.test.ts` | 4 | Fetch, defaults on error, loading state |

---

## Smoke Tests

### /api/auth/me returns 200 with user:null for unauthenticated requests
```bash
# After docker compose up --build:
curl -s http://localhost:3000/api/auth/me
# Expected: {"user":null}

# Verify HTTP status is 200 (not 401)
curl -o /dev/null -s -w "%{http_code}" http://localhost:3000/api/auth/me
# Expected: 200
```

**Note:** `/api/auth/me` deliberately returns `200 { user: null }` — not `401` — for unauthenticated requests. This is by design: the frontend `AuthProvider` polls this endpoint on mount to check session state, and a 401 would be mishandled as an error.

### /api/health returns 200
```bash
curl -s http://localhost:3000/api/health
# Expected: {"status":"ok","timestamp":"2026-02-24T..."}
```

### /api/auth/login rejects wrong credentials
```bash
curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"alex","password":"wrongpass"}'
# Expected: {"error":"Invalid credentials"} with HTTP 401
```

### /api/auth/login accepts demo credentials
```bash
curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"alex","password":"claude123"}'
# Expected: {"user":{"id":"alex","name":"Alex Johnson","role":"learner",...}}
```

---

## Adding New Tests

### Adding a backend test

1. Create `src/app/api/<your-route>/route.test.ts` (or `src/lib/<module>.test.ts`)
2. Add `/** @jest-environment node */` at the top
3. Mock all external dependencies (Prisma `@/lib/db`, `@/lib/session`)
4. Add the source file to `collectCoverageFrom` in `jest.config.backend.js`
5. Run `npm run test:backend` to verify

### Adding a frontend test

1. Create `src/components/<Component>.test.tsx` (or `src/hooks/<hook>.test.ts`)
2. Mock `next/navigation` and `next/link` if the component uses routing
3. Mock `./AuthProvider` (`useAuth`) for components that depend on auth state
4. Add the source file to `collectCoverageFrom` in `jest.config.frontend.js`
5. Run `npm run test:frontend` to verify

### Mocking Prisma in route tests

All Prisma calls must be mocked — never hit a real database in unit tests:

```typescript
jest.mock("@/lib/db", () => ({
  db: {
    user: { findUnique: jest.fn() },
    session: { create: jest.fn() },
    // Add only the methods your route calls
  },
}));

import { db } from "@/lib/db";
const mockFindUnique = db.user.findUnique as jest.Mock;
```

### Mocking the session in route tests

```typescript
jest.mock("@/lib/session", () => ({
  getSessionUser: jest.fn(),
  SESSION_COOKIE: "sid",
}));

import { getSessionUser } from "@/lib/session";
const mockGetSessionUser = getSessionUser as jest.Mock;

// Unauthenticated:
mockGetSessionUser.mockResolvedValue(null);

// Authenticated:
mockGetSessionUser.mockResolvedValue({
  id: "cuid-alex",
  externalId: "alex",
  name: "Alex Johnson",
  role: "learner",
  teamId: "alpha",
});
```

### Coverage gap workflow

If coverage drops below 90%:
1. Run `npm run test:coverage:backend` or `npm run test:coverage:frontend`
2. Open `coverage/lcov-report/index.html` in a browser
3. Find uncovered branches (yellow) and uncovered lines (red)
4. Add targeted tests for the missing cases
5. Re-run until all thresholds pass
