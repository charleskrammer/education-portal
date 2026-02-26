// jest.config.backend.js — Backend (Node) test configuration.
// Covers: src/lib/*.ts business logic + src/app/api/**/*.ts route handlers.
// Uses Next.js SWC transformer (no ts-jest required).
const nextJest = require("next/jest");

const createJestConfig = nextJest({ dir: "./" });

module.exports = createJestConfig({
  displayName: "backend",
  testEnvironment: "node",
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },
  testMatch: [
    "<rootDir>/src/lib/**/*.test.ts",
    "<rootDir>/src/app/api/**/*.test.ts",
  ],
  collectCoverageFrom: [
    // Pure business logic
    "src/lib/scoring/index.ts",
    "src/lib/scoring/server.ts",
    "src/lib/training/index.ts",
    "src/lib/session/index.ts",
    // API route handlers
    "src/app/api/auth/login/route.ts",
    "src/app/api/auth/logout/route.ts",
    "src/app/api/auth/me/route.ts",
    "src/app/api/quiz/submit/route.ts",
    "src/app/api/quiz/[videoId]/route.ts",
    "src/app/api/progress/route.ts",
    "src/app/api/dashboard/kpis/route.ts",
    "src/app/api/manager/metrics/route.ts",
    "src/app/api/grade-case/route.ts",
    // Excluded: assistant/route.ts requires live Anthropic API key
    // Excluded: src/lib/db.ts is a singleton (tested by mocking in all route tests)
  ],
  coverageThreshold: {
    global: {
      statements: 90,
      branches: 90,
      functions: 90,
      lines: 90,
    },
  },
});
