# Codebase Structure

## Overview

Domain-based folder layout. Each folder owns one feature area.

```
src/
  app/                      Next.js routing (untouched by convention)
  components/
    auth/                   AuthProvider, AuthGate
    layout/                 NavBar, Breadcrumbs, AIAssistantWidget
    training/               VideoCard, VideoAssessment, TopicSection, StepClient, StepCard
    ui/                     Quiz, ResourceCard
  hooks/                    useApiProgress, useApiQuizAttempts, useDashboard
  lib/
    db/index.ts             Prisma singleton
    env/index.ts            Startup env-var validation
    scoring/
      index.ts              Pure scoring math (grade, percentile, points)
      server.ts             Server-side quiz scoring and attempt helpers
    session/index.ts        Cookie-based session helper
    training/index.ts       Training data types and accessors
    youtube/index.ts        YouTube URL parser
  types/
    api.ts                  Shared response types (AssistantResponse, MemberRow, MetricsResponse)
  data/
    training.json           Training content (steps, topics, videos, quizzes)
```

## Conventions

- **Barrel pattern**: every `lib/X/` folder exports via `index.ts`. Import as `@/lib/X` — TypeScript resolves to `index.ts` automatically.
- **Exception**: `@/lib/scoring/server` is imported explicitly (server-only, not re-exported from index).
- **Components**: grouped by feature domain. A new auth component goes in `components/auth/`, a new training component in `components/training/`, etc.
- **Types**: shared API response types live in `src/types/api.ts`. Component-local types stay inline.
- **Tests**: co-located next to the file they test (`foo.ts` → `foo.test.ts` or `index.test.ts`).
