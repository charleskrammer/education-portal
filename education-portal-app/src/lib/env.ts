/**
 * src/lib/env.ts — Startup environment variable validation.
 *
 * Import this module early in any server-side entry point that requires
 * these variables. It throws at module load time if required vars are absent,
 * giving a clear error instead of a cryptic runtime failure.
 *
 * Usage:
 *   import "@/lib/env";  // in src/lib/db.ts or a top-level server file
 *
 * Note: This module is intentionally NOT imported in API route files that are
 * also tested in unit tests (it would fail without a real env). Instead it is
 * imported by db.ts which is always mocked in tests.
 */

type EnvSpec = {
  key: string;
  required: boolean;
  description: string;
};

const ENV_SPECS: EnvSpec[] = [
  {
    key: "DATABASE_URL",
    required: true,
    description: "PostgreSQL connection string (pooled for serverless, direct for migrations)",
  },
  {
    key: "NODE_ENV",
    required: false,
    description: "Runtime environment: 'production' | 'development' | 'test'",
  },
  {
    key: "ANTHROPIC_API_KEY",
    required: false,
    description: "Anthropic API key — required only for AI assistant and grade-case features",
  },
  {
    key: "ANTHROPIC_MODEL",
    required: false,
    description: "Anthropic model ID (defaults to claude-sonnet-4-20250514 if absent)",
  },
];

/**
 * Validate environment variables against the spec list.
 * Throws on missing required vars. Logs warnings for missing optional vars
 * only in development mode to avoid noisy production logs.
 *
 * @returns Record of validated env vars (for testing convenience)
 */
export function validateEnv(): Record<string, string | undefined> {
  const missing: string[] = [];

  for (const spec of ENV_SPECS) {
    const value = process.env[spec.key];
    if (spec.required && !value) {
      missing.push(`  ${spec.key}: ${spec.description}`);
    } else if (
      !spec.required &&
      !value &&
      process.env.NODE_ENV === "development"
    ) {
      console.warn(
        `[env] Optional variable ${spec.key} is not set. ${spec.description}`
      );
    }
  }

  if (missing.length > 0) {
    const message = [
      "FATAL: Required environment variables are missing.",
      "Set the following variables and restart:",
      ...missing,
    ].join("\n");
    throw new Error(message);
  }

  return Object.fromEntries(
    ENV_SPECS.map((s) => [s.key, process.env[s.key]])
  );
}

// Run validation immediately on import — fail fast at startup.
// Skipped in test environment to avoid requiring env vars in unit tests.
if (process.env.NODE_ENV !== "test") {
  validateEnv();
}
