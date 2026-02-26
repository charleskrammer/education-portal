# Testing Patterns

**Analysis Date:** 2026-02-23

## Test Framework

**Runner:**
- Not configured (no test framework currently in use)
- `package.json` contains no jest, vitest, or testing-library dependencies
- No test configuration files (.jestrc, vitest.config.ts, etc.)

**Assertion Library:**
- Not applicable (no testing infrastructure)

**Run Commands:**
- No test commands in package.json
- Only dev/build/start/lint commands defined

## Test File Organization

**Location:**
- No test files present in codebase
- No `__tests__` directories
- No `.test.ts`, `.spec.ts`, `.test.tsx`, or `.spec.tsx` files found

**Naming Convention:**
- Not established (no tests to reference)
- When testing is implemented, follow pattern: `[filename].test.ts` for unit tests
- Keep tests co-located with source or in `__tests__` directory at module level

**Structure:**
- Not applicable currently

## Test Structure

**Suite Organization:**
- Not established (no tests present)

**Recommended Pattern:**
When tests are added, follow standard Jest/Vitest structure:
```typescript
describe("Module or Component Name", () => {
  describe("specific function/behavior", () => {
    it("should do something specific", () => {
      // test code
    });
  });
});
```

**Patterns:**
- Setup/teardown: Would use `beforeEach`, `afterEach` if implemented
- Test isolation: Each test should be independent
- Clear test names describing expected behavior

## Mocking

**Framework:**
- Not configured (no mocking library)
- When implemented, consider jest.mock() or vitest mocking utilities

**Patterns:**
- Not established

**What to Mock (Recommended):**
- External API calls (localStorage, fetch, Anthropic API)
- React context providers (AuthProvider)
- System functions (Date.now, Math.random)
- File system operations

**What NOT to Mock (Recommended):**
- Pure utility functions (getYouTubeId, tokenize, sanitizeUser)
- Data transformations (rankVideos)
- Simple getters (getStepById)

## Fixtures and Factories

**Test Data:**
- Not established (no tests present)

**Recommended approach for this codebase:**
```typescript
// fixtures/user.ts
export const mockUser: User = {
  id: "user-001",
  name: "Test User",
  role: "learner",
  teamId: "team-001"
};

// fixtures/training.ts
export const mockVideo: Video = {
  id: "vid-001",
  title: "Test Video",
  channel: "Test Channel",
  url: "https://youtube.com/watch?v=test",
  reason: "Test video",
  level: "Beginner",
  duration: "10:00",
  views: "1K",
  published_date: "2024-01-01",
  top_pick: false
};
```

**Location:**
- Create `src/__tests__/fixtures/` or `src/**/__tests__/fixtures/` at module level

## Coverage

**Requirements:**
- Not enforced (no test infrastructure)
- No coverage thresholds configured

**View Coverage:**
- Would be configured in test runner when implemented

**Recommended:**
- Aim for >80% coverage for critical paths (auth, progress tracking, API handlers)
- Core utilities should have >90% coverage

## Test Types

**Unit Tests (Priority):**
- Scope: Test single functions in isolation
- Examples to implement:
  - `auth.ts`: `authenticate()`, `sanitizeUser()`, `getTeamById()`, `getUsersByTeam()`
  - `training.ts`: `getStepById()`, `getAllVideos()`, `getOfficialVideos()`
  - `youtube.ts`: `getYouTubeId()` with various URL formats
  - `useProgress.ts`: `useProgress()` hook with localStorage mocking
  - Utility functions in `api/assistant/route.ts`: `tokenize()`, `rankVideos()`, `safeJsonParse()`

**Integration Tests (Secondary):**
- Scope: Test interactions between modules
- Examples:
  - AuthProvider + useAuth hook
  - useProgress hook + localStorage + progress state updates
  - Video ranking with training data

**E2E Tests (Not Currently Used):**
- Framework: None configured
- When implemented, consider Playwright or Cypress
- Test full user flows: login → view step → mark video complete → take quiz

## Testing Critical Areas

**Authentication (`src/lib/auth.ts` & `src/components/AuthProvider.tsx`):**
- Test `authenticate()` with valid/invalid credentials
- Test `sanitizeUser()` removes sensitive data
- Test AuthProvider context provides correct user state
- Test localStorage persistence across page reloads
- Mock localStorage for test isolation

**Progress Tracking (`src/lib/useProgress.ts`):**
- Test video completion state persistence
- Test topic/step completion calculations
- Test migration from legacy storage format
- Test progress state normalization with various input formats
- Mock localStorage and Date.now()

**API Handlers (`src/app/api/assistant/route.ts`, `src/app/api/grade-case/route.ts`):**
- Test POST request with missing/invalid question
- Test response validation (JSON schema)
- Test video ranking algorithm with different queries
- Test error handling with network failures
- Mock Anthropic API responses
- Test environment variable validation (ANTHROPIC_API_KEY)

**UI Components (`src/components/*.tsx`):**
- Components are mostly presentational; test interaction handlers
- Test `VideoCard` toggle behavior
- Test `Quiz` answer selection and scoring
- Test `AuthGate` conditional rendering based on auth state

## Common Patterns to Test

**Async Testing (When Implemented):**
```typescript
it("should fetch assistant response", async () => {
  const mockResponse = { ok: true, json: async () => ({ /* data */ }) };
  global.fetch = jest.fn(() => Promise.resolve(mockResponse));

  const result = await POST(mockRequest);

  expect(fetch).toHaveBeenCalledWith("https://api.anthropic.com/v1/messages", expect.any(Object));
});
```

**Error Testing (When Implemented):**
```typescript
it("should handle missing API key", async () => {
  process.env.ANTHROPIC_API_KEY = "";

  const result = await POST(mockRequest);

  expect(result.status).toBe(400);
  expect(result.body).toContain("Missing ANTHROPIC_API_KEY");
});
```

**localStorage Mocking (When Implemented):**
```typescript
beforeEach(() => {
  const store = {};
  global.localStorage.getItem = jest.fn((key) => store[key] || null);
  global.localStorage.setItem = jest.fn((key, value) => { store[key] = value; });
  global.localStorage.removeItem = jest.fn((key) => { delete store[key]; });
});
```

**React Hook Testing (When Implemented):**
```typescript
import { renderHook, act } from "@testing-library/react";

it("should update progress on video completion", () => {
  const { result } = renderHook(() => useProgress("user-123"));

  act(() => {
    result.current.setVideoDone(mockVideo, true);
  });

  expect(result.current.isVideoDone(mockVideo.id)).toBe(true);
});
```

## Recommendations for Test Setup

**1. Install Test Dependencies:**
```bash
npm install --save-dev vitest @testing-library/react @testing-library/jest-dom @vitest/ui
```

**2. Create vitest.config.ts:**
```typescript
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/__tests__/setup.ts"]
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src")
    }
  }
});
```

**3. Start with High-Value Tests:**
- Authentication flow (`src/lib/auth.ts`)
- Progress persistence (`src/lib/useProgress.ts`)
- API validation (`src/app/api/assistant/route.ts`)

**4. Use Fixtures:**
- Create `src/__tests__/fixtures/` with mock data
- Reference in all tests for consistency

---

*Testing analysis: 2026-02-23*
