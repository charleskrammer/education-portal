// jest.config.frontend.js — Frontend (jsdom) test configuration.
// Covers: src/components/**/*.tsx and src/hooks/**/*.ts
// Uses Next.js SWC transformer with jsdom environment.
const nextJest = require("next/jest");

const createJestConfig = nextJest({ dir: "./" });

module.exports = createJestConfig({
  displayName: "frontend",
  testEnvironment: "jest-environment-jsdom",
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  testMatch: [
    "<rootDir>/src/components/**/*.test.tsx",
    "<rootDir>/src/components/**/*.test.ts",
    "<rootDir>/src/hooks/**/*.test.ts",
  ],
  collectCoverageFrom: [
    "src/components/auth/AuthProvider.tsx",
    "src/components/auth/AuthGate.tsx",
    "src/components/layout/NavBar.tsx",
    "src/components/ui/Quiz.tsx",
    "src/hooks/useApiProgress.ts",
    "src/hooks/useApiQuizAttempts.ts",
    "src/hooks/useDashboard.ts",
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
