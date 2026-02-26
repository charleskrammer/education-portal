# AI Training Portal

[![CI](https://github.com/charleskrammer/AI-Plateforme/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/charleskrammer/AI-Plateforme/actions/workflows/ci.yml)

An internal learning management system for teams mastering AI. Built with **Next.js 14 App Router**, TypeScript, Tailwind CSS, and **PostgreSQL + Prisma** for full persistence.

---

## Run locally (Docker Compose — recommended)

One command starts the full stack (Next.js + PostgreSQL). No local Node.js or Postgres install required.

### Prerequisites
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) ≥ 4.x (includes Compose v2)

### Steps

```bash
# 1. Clone
git clone <repo-url> && cd <repo>

# 2. (Optional) add AI assistant key
echo "ANTHROPIC_API_KEY=your-key-here" > .env.local

# 3. Start — builds image, starts Postgres, runs migrations, seeds demo accounts
docker compose up --build

# → Portal available at http://localhost:3000
```

**Stop and clean up:**
```bash
docker compose down          # stop containers, keep DB volume
docker compose down -v       # stop containers AND wipe DB volume
```

### Environment variables (Compose)

| Variable | Default in Compose | Description |
|---|---|---|
| `DATABASE_URL` | `postgresql://postgres:postgres@db:5432/...` | Set automatically by Compose |
| `SEED_DB` | `true` | Seeds demo accounts on startup (idempotent) |
| `ANTHROPIC_API_KEY` | — | Optional — add to `.env.local` for AI features |

### Run from pre-built image (no clone required)

```bash
docker run -d \
  --name claude-training-portal \
  -p 3000:3000 \
  -e DATABASE_URL="postgresql://..." \
  -e SEED_DB=true \
  ghcr.io/<owner>/claude-training-portal:latest
```

---

## Testing & Coverage

Coverage thresholds are enforced in CI (≥90% statements/branches/functions/lines).

```bash
# Run all tests with coverage enforcement
npm test

# Backend only (API routes + lib logic, Node env)
npm run test:backend

# Frontend only (components + hooks, jsdom env)
npm run test:frontend
```

## YAML Linting

```bash
# Requires: pip install yamllint
npm run lint:yaml
```

## Security Scanning (Trivy)

```bash
# Filesystem scan (vuln + secret + misconfig)
trivy fs --scanners vuln,secret,misconfig --severity HIGH,CRITICAL .

# Image scan (after building)
docker build -t claude-training-portal .
trivy image --severity HIGH,CRITICAL claude-training-portal
```

---

## Local Development Setup

### Prerequisites
- Node.js 20+
- PostgreSQL running locally (or Neon/Supabase)

### Setup

```bash
npm install
cp .env.example .env.local    # fill in DATABASE_URL
npx prisma migrate dev --name init
npx prisma db seed
npm run dev
# → http://localhost:3000
```

---

## Database Setup

### Prerequisites
- PostgreSQL running locally (or use Neon/Supabase for hosted)

### Setup
1. Copy `.env.example` to `.env.local` and set `DATABASE_URL`
2. Install dependencies: `npm install`
3. Run migrations: `npx prisma migrate dev --name init`
4. Seed the database: `npx prisma db seed`
5. Start the dev server: `npm run dev`

### Scoring Rules
- Base: 10 pts per correct answer
- First-try bonus: +5 pts per question answered correctly on the FIRST click, but ONLY on the user's very first attempt for that quiz (enforced server-side via DB `attemptNumber = 1`)
- Retrying a quiz: score is recomputed from scratch, no first-try bonus

### Streak
- Computed from Session records in the DB
- Work-week streak: counts consecutive Mon-Fri days with at least one session, skipping weekends

### 7-Day Metrics
- Login count: count of Session records in the past 7 days
- Score delta: total score minus score from attempts completed before 7 days ago
- All computed server-side in `/api/manager/metrics`

---

## Demo Accounts

Credentials are seeded into the database by `prisma/seed.ts`.

| Username | Password   | Role    | Team  |
|----------|------------|---------|-------|
| alex     | claude123  | learner | alpha |
| mike     | claude123  | learner | alpha |
| nina     | claude123  | learner | beta  |
| sara     | manage123  | manager | alpha |
| tom      | manage123  | manager | beta  |

---

## Learning Path — 4 Steps

All videos sourced **exclusively** from the **Anthropic official YouTube channel**.

### Step 1 — Claude Basics (~45 min)
Discover Claude, create Artifacts, and master Projects and Connectors.

| Topic | Videos |
|-------|--------|
| Introduction to Claude | Getting started with Claude.ai · Turn ideas into interactive artifacts |
| Projects, Memory and Connectors | Getting started with projects · Getting started with connectors |

### Step 2 — Daily Use (~60 min)
Research, file management, and real business productivity workflows.

| Topic | Videos |
|-------|--------|
| Research and Web Analysis | Getting started with research in Claude.ai |
| Files and Document Workflows | Claude can create and edit files |
| Business Productivity | How Anthropic uses Claude in Marketing · Claude for Financial Services Keynote |

### Step 3 — Claude Code Mastery (~90 min)
Master Claude Code — Anthropic's agentic terminal coding tool.

| Topic | Videos |
|-------|--------|
| Claude Code Fundamentals | Claude Code best practices · Let Claude handle work in your browser |
| Claude Code in Professional Workflows | How Anthropic uses Claude in Legal |

### Step 4 — Advanced Usage — AI Agents (~90 min)
Understand AI agents and build autonomous systems with Claude.

| Topic | Videos |
|-------|--------|
| What Are AI Agents? | Getting started with Claude.ai (agentic lens) · Connectors — Tool Use & Agent Integrations |
| Building Agents with Claude | Claude Code — Agentic Coding Loops · Browser automation — Orchestration Patterns |

---

## Video Sourcing Policy

Only these YouTube channels are permitted in `src/data/training.json`:

- **`"Anthropic"`** — Anthropic official YouTube channel
- **`"Claude"`** — Claude official YouTube channel

The `validateChannels()` function in `src/lib/training.ts` checks all videos against this allowlist. No external web search or third-party video discovery is implemented.

---

## Quiz Formats

Each video has an objective quiz with **no open-ended questions** and **no case studies**.

Supported question types:
- **Multiple choice** — 4 options, single correct answer
- **True / False** — 2 options

Behavior:
- Selecting an answer shows **immediate feedback and explanation**
- All questions must be answered before submitting
- **"Submit quiz"** button locks all answers and reveals scores
- **"Retry"** resets the quiz for a fresh attempt (first-attempt bonus resets too)

---

## Scoring Rules

Score is computed **only from quiz performance** — not from video completion.

| Event | Points |
|-------|--------|
| Correct answer (any attempt) | +10 pts |
| First-attempt bonus (correct on the very first click) | +5 pts |
| Incorrect answer | 0 pts |

**Max per question:** 15 pts (10 base + 5 first-try bonus)

**Total score** = sum of `pointsEarned` across all `VideoAttempt` records stored for that user.

Score is deterministic and fully reproducible from `localStorage` key `claude-training-quiz.v1`.

**Example:** 3-question quiz, all answered correctly on first try → `3 × 15 = 45 pts`

---

## Ranking & Grade Calculation

Rankings are company-wide, based entirely on total quiz score.

**Rank position** = `(users with strictly higher score) + 1`
Rank #1 = highest total score.

**Percentile** = `floor(users_scored_below / (total_users − 1) × 100)`

**Grade label** from percentile:

| Grade | Percentile |
|-------|-----------|
| S | ≥ 90 |
| A | 66 – 89 |
| B | 33 – 65 |
| C | < 33 |

---

## Personal Dashboard (`/dashboard`)

Default landing page after login. Shows:

- **KPIs:** Quizzes completed · Overall accuracy % · Total score · Learning streak (consecutive login days)
- **Company rank:** #N of M · percentile · grade label (S/A/B/C)
- **Top 10 leaderboard:** Company-wide, by total quiz score
- **Topic progress grid:** All topics colour-coded (teal = complete)

---

## Manager Dashboard (`/manager`)

Available to `role: "manager"` accounts. Aggregates **all users** across the whole company.

| Column | Definition |
|--------|-----------|
| Total score | Sum of `pointsEarned` from all quiz attempts |
| +7d delta | Points earned in the last 7 days (`currentScore − scoreBefore(now − 7d)`) |
| Logins (7d) | Distinct calendar days with ≥1 login in the past 7 days |

---

## localStorage Keys

| Key | Contents |
|-----|----------|
| `claude-training-user.v1` | Current authenticated user |
| `claude-training-progress.v3` | Video completion states per user |
| `claude-training-quiz.v1` | Quiz attempt results (score source of truth) |
| `claude-training-logins.v1` | Login event timestamps per user |

---

## Routes

| Route | Description | Auth |
|-------|-------------|------|
| `/` | Redirect → `/dashboard` (logged in) or `/login` | — |
| `/login` | Demo account login | Public |
| `/dashboard` | Personal dashboard — default home | Required |
| `/path` | 4-step learning path overview | Required |
| `/step/[id]` | Step detail — topics, videos, quizzes | Required |
| `/search` | Search portal videos only (no external sources) | Required |
| `/resources` | Official Anthropic resources | Required |
| `/assistant` | AI assistant (Claude-powered) | Required |
| `/manager` | Company-wide manager dashboard | Manager only |

**/security has been removed.** That route no longer exists.

---

## Environment Variables

Required for the AI assistant API route:

```bash
ANTHROPIC_API_KEY=your-key-here
ANTHROPIC_MODEL=claude-sonnet-4-6   # optional
```

Create a `.env.local` file in the project root.

---

## Adding Videos

All content is in `src/data/training.json`. Video format:

```json
{
  "id": "unique-id",
  "title": "Video title",
  "channel": "Anthropic",
  "url": "https://www.youtube.com/watch?v=...",
  "reason": "Why this video is included",
  "level": "Beginner | Regular | Advanced",
  "duration": "unknown",
  "views": "unknown",
  "published_date": "unknown",
  "top_pick": true,
  "official": true,
  "quiz": {
    "questions": [
      {
        "id": "unique-q-id",
        "question": "...",
        "choices": ["Option A", "Option B", "Option C", "Option D"],
        "answerIndex": 0,
        "explanation": "..."
      }
    ]
  }
}
```

**Rules:**
- `channel` must be `"Anthropic"` or `"Claude"` (enforced by `validateChannels()`)
- No `case_study` field — only objective quiz formats
- IDs must be unique across the entire file
- Use `"unknown"` for metadata you cannot verify

---

## Manual QA Checklist

### Auth & Routing
- [ ] `/` redirects to `/login` when not logged in
- [ ] `/` redirects to `/dashboard` when logged in
- [ ] Login records an event (DevTools → Application → localStorage → `claude-training-logins.v1`)
- [ ] Logout clears session; any route redirects to `/login`
- [ ] `/security` returns 404 (route was deleted)

### Learning Path
- [ ] `/path` shows exactly **4 steps** with correct titles
- [ ] `/step/1` through `/step/4` load without error
- [ ] All videos show `Channel: Anthropic`
- [ ] No "Case study" tab appears anywhere in the UI

### Quizzes & Scoring
- [ ] Marking a video complete shows "Take the quiz" button
- [ ] "Submit quiz" is disabled until all questions answered
- [ ] After submitting: correct = green, incorrect = amber, explanations shown
- [ ] Score displayed: `X / Y pts`
- [ ] Quiz attempt saved (DevTools → `claude-training-quiz.v1`)
- [ ] Retrying quiz resets answers and re-saves on next submission

### Personal Dashboard
- [ ] KPIs update after completing a quiz
- [ ] Rank and grade appear; "you" label visible in Top 10
- [ ] Learning streak increases on consecutive login days
- [ ] Topic grid shows teal for fully-completed topics

### Manager Dashboard
- [ ] Only accessible to manager accounts
- [ ] Shows all 5 users (not just one team)
- [ ] Logins (7d) counts update after each login
- [ ] Score delta is 0 for users with no recent quiz activity

### Search
- [ ] "Portal videos only · Anthropic official channel" badge visible
- [ ] Results contain only portal videos matching the query
- [ ] "No results" empty state shown for unmatched queries
