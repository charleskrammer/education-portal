# Coding Conventions

**Analysis Date:** 2026-02-23

## Naming Patterns

**Files:**
- Components: PascalCase (`StepCard.tsx`, `VideoCard.tsx`, `AuthProvider.tsx`)
- Utilities/Hooks: camelCase (`useProgress.ts`, `youtube.ts`, `auth.ts`, `training.ts`)
- Pages: lowercase with dashes for route segments (`page.tsx`, `layout.tsx`, `not-found.tsx`)
- API routes: route.ts in api directories

**Functions:**
- camelCase for all exported functions (`getStepById`, `getAllVideos`, `getYouTubeId`, `sanitizeUser`)
- camelCase for internal helper functions (`tokenize`, `rankVideos`, `normalizeState`, `loadStore`)
- React components: PascalCase for both named exports and defaults
- Hooks: Prefixed with `use` (camelCase): `useProgress`, `useAuth`

**Variables:**
- camelCase for all local and module-level variables
- UPPERCASE with underscores for constants: `STORAGE_KEY`, `LEGACY_KEY`, `DEFAULT_MODEL`, `FALLBACK_MESSAGE`
- Object properties: camelCase (e.g., `isLoading`, `onToggle`, `isDone`)

**Types:**
- PascalCase for all type/interface names: `User`, `UserRole`, `AuthContextValue`, `Step`, `Topic`, `Video`
- Type unions and literal types: PascalCase for the type name, lowercase for literals: `type UserRole = "learner" | "manager"`
- Union discriminators: PascalCase `type AssistantResponse = { is_claude_usage: boolean }`

## Code Style

**Formatting:**
- Default Next.js configuration with no custom .prettierrc
- Whitespace: 2-space indentation (standard JavaScript/TypeScript)
- String quotes: Double quotes throughout (observed consistently in all files)
- Trailing commas: Used in multiline structures
- Line length: No strict enforcement observed, but typically 80-100 characters

**Linting:**
- ESLint with `eslint-config-next` (v8.57.0)
- No custom .eslintrc file (uses Next.js defaults)
- Run: `npm run lint` (via `next lint`)
- TypeScript strict mode enabled in `tsconfig.json`

**React-specific:**
- Use "use client" directive for client components (consistently used)
- Server components (default) for layout, pages, API routes
- No inline styles; use Tailwind CSS classes exclusively
- Components accept props destructured in function signature: `function StepCard({ step }: { step: Step })`

## Import Organization

**Order:**
1. React imports (e.g., `import { useState } from "react"`)
2. Next.js built-ins (e.g., `import Link from "next/link"`, `import type { Metadata }`)
3. Third-party packages (none observed in current codebase)
4. Path aliases from `@/*` (e.g., `import type { User } from "@/lib/auth"`)
5. Relative imports (minimal usage, path aliases preferred)

**Path Aliases:**
- `@/` resolves to `./src/` (configured in `tsconfig.json`)
- Always use path aliases for imports: `@/components`, `@/lib`, `@/data`
- Avoid relative imports (`../`) in favor of path aliases

**Type Imports:**
- Use `import type { TypeName }` for type-only imports (observed in multiple files)
- Keeps bundle size down and improves clarity

**Import Example:**
```typescript
import { useState } from "react";
import type { Metadata } from "next";
import { IBM_Plex_Sans } from "next/font/google";

import type { User } from "@/lib/auth";
import { authenticate, sanitizeUser } from "@/lib/auth";
```

## Error Handling

**Patterns:**
- Try-catch blocks for JSON parsing, localStorage access, and async fetch calls
- Silent failure in catch blocks: `catch { }` without error logging (by design for non-critical operations)
- Graceful fallbacks: Return null, empty objects, or default values when errors occur
- Example from `useProgress.ts`:
  ```typescript
  try {
    const parsed = JSON.parse(raw) as User;
    if (parsed?.id) {
      setUser(parsed);
    }
  } catch {
    window.localStorage.removeItem(STORAGE_KEY);
  }
  ```

**API Error Handling:**
- HTTP status codes returned with error details (e.g., `{ status: 400 }`, `{ status: 500 }`)
- NextResponse.json() used for JSON responses
- Validation before processing: Check existence, type, and content before proceeding
- Example from `api/assistant/route.ts`:
  ```typescript
  if (!apiKey) {
    return NextResponse.json(
      { error: "Missing ANTHROPIC_API_KEY..." },
      { status: 400 }
    );
  }
  ```

**Error Messages:**
- User-friendly error strings returned to frontend (e.g., "Unable to reach the assistant. Please try again.")
- Technical details logged (details field in responses)

## Logging

**Framework:** console (no external logging framework)

**Patterns:**
- No explicit logging statements observed in current codebase
- Errors are handled silently or returned to user
- No debug logging; errors managed via try-catch and error messages

## Comments

**When to Comment:**
- No extensive comments observed (code is self-documenting with clear function/variable names)
- Comments minimal but used for complex logic like video ranking algorithms
- Inline comments used sparingly for non-obvious operations

**JSDoc/TSDoc:**
- No JSDoc comments observed in the codebase
- Type annotations preferred over documentation comments
- Types themselves serve as documentation (e.g., `AssistantResponse` type clearly documents response shape)

## Function Design

**Size:** Small, focused functions with single responsibility

**Parameters:**
- Destructured object parameters in React components: `{ children }: { children: React.ReactNode }`
- Simple parameters for utility functions (primitives or well-typed objects)
- Optional parameters marked with `?`: `example_prompt?: string`

**Return Values:**
- Explicit return type annotations on all exported functions
- Void functions used for setters and side effects
- API handlers return NextResponse or NextResponse.json()
- Utility functions return simple types or objects

**Example:**
```typescript
export const authenticate = (username: string, password: string): User | null => {
  const match = rawUsers.find(
    (user) => user.id.toLowerCase() === username.toLowerCase() && user.password === password
  );
  return match ? sanitizeUser(match) : null;
};
```

## Module Design

**Exports:**
- Named exports preferred for utilities and types
- Default exports for React components
- Both export types and functions from lib modules

**Barrel Files:**
- Not used; files import directly from specific modules
- `@/lib/auth` imports functions directly, not re-exported elsewhere

**Module Organization:**
- `src/lib/` contains utilities and data transformations
- `src/components/` contains React components
- `src/app/` contains pages and API routes
- Clear separation of concerns

**Example from `lib/auth.ts`:**
```typescript
export type User = { ... };
export const authenticate = (...) => { ... };
export const sanitizeUser = (...) => { ... };
```

## Type Safety

**TypeScript Configuration:**
- `strict: true` enabled (enforces strict null checks, strict function types, etc.)
- `noEmit: true` (compilation type-checked but not emitted)
- Inference used where types are obvious, explicit annotations on public functions
- Generic types used in React hooks (e.g., `useState<ProgressState>`)

---

*Convention analysis: 2026-02-23*
