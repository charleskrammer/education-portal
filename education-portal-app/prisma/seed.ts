import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

// ── Dev track teams ────────────────────────────────────────────────────────
// Team: alpha (dev)  — manager: sara
// Team: gamma (dev)  — manager: leo
// ── Business track teams ───────────────────────────────────────────────────
// Team: beta    (business) — manager: tom
// Team: delta   (business) — manager: claire

const TEAMS = [
  { id: "alpha", name: "Alpha",   track: "dev"      },
  { id: "gamma", name: "Gamma",   track: "dev"      },
  { id: "beta",  name: "Beta",    track: "business" },
  { id: "delta", name: "Delta",   track: "business" },
  { id: "ai",    name: "AI",      track: "dev"      },
];

const USERS = [
  // ── Alpha (dev) ──────────────────────────────────────────────────────────
  { externalId: "sara",    name: "Sara Williams",   role: "manager", teamId: "alpha", password: "manage123" },
  { externalId: "alex",    name: "Alex Johnson",    role: "learner", teamId: "alpha", password: "claude123" },
  { externalId: "mike",    name: "Mike Chen",       role: "learner", teamId: "alpha", password: "claude123" },
  { externalId: "priya",   name: "Priya Sharma",    role: "learner", teamId: "alpha", password: "claude123" },
  { externalId: "jordan",  name: "Jordan Lee",      role: "learner", teamId: "alpha", password: "claude123" },

  // ── Gamma (dev) ──────────────────────────────────────────────────────────
  { externalId: "leo",     name: "Leo Dubois",      role: "manager", teamId: "gamma", password: "manage123" },
  { externalId: "yuki",    name: "Yuki Tanaka",     role: "learner", teamId: "gamma", password: "claude123" },
  { externalId: "rami",    name: "Rami Khalil",     role: "learner", teamId: "gamma", password: "claude123" },
  { externalId: "sofia",   name: "Sofia Moreau",    role: "learner", teamId: "gamma", password: "claude123" },
  { externalId: "dan",     name: "Dan Eriksson",    role: "learner", teamId: "gamma", password: "claude123" },

  // ── Beta (business) ──────────────────────────────────────────────────────
  { externalId: "tom",     name: "Tom Becker",      role: "manager", teamId: "beta",  password: "manage123" },
  { externalId: "nina",    name: "Nina Patel",      role: "learner", teamId: "beta",  password: "claude123" },
  { externalId: "carlos",  name: "Carlos Reyes",    role: "learner", teamId: "beta",  password: "claude123" },
  { externalId: "amara",   name: "Amara Diallo",    role: "learner", teamId: "beta",  password: "claude123" },
  { externalId: "helen",   name: "Helen Park",      role: "learner", teamId: "beta",  password: "claude123" },

  // ── Delta (business) ─────────────────────────────────────────────────────
  { externalId: "claire",  name: "Claire Fontaine", role: "manager", teamId: "delta", password: "manage123" },
  { externalId: "omar",    name: "Omar Hassan",     role: "learner", teamId: "delta", password: "claude123" },
  { externalId: "lucy",    name: "Lucy Marsh",      role: "learner", teamId: "delta", password: "claude123" },
  { externalId: "ben",     name: "Ben Adeyemi",     role: "learner", teamId: "delta", password: "claude123" },
  { externalId: "mei",     name: "Mei Zhang",       role: "learner", teamId: "delta", password: "claude123" },

  // ── AI (dev) ─────────────────────────────────────────────────────────────
  { externalId: "lior.k",   name: "Lior K",    role: "manager", teamId: "ai", email: "lior.k@xbo.com",    password: "manage123" },
  { externalId: "charles.k", name: "Charles K", role: "learner", teamId: "ai", email: "charles.k@xbo.com", password: "claude123" },
];

async function main() {
  console.log("Seeding teams…");
  for (const team of TEAMS) {
    await db.team.upsert({
      where: { id: team.id },
      update: { name: team.name, track: team.track },
      create: { id: team.id, name: team.name, track: team.track },
    });
  }

  console.log("Seeding users…");
  for (const u of USERS) {
    const passwordHash = u.password ? await bcrypt.hash(u.password, 10) : null;
    await db.user.upsert({
      where: { externalId: u.externalId },
      update: { name: u.name, role: u.role, teamId: u.teamId, passwordHash, email: u.email ?? null },
      create: { externalId: u.externalId, name: u.name, role: u.role, teamId: u.teamId, passwordHash, email: u.email ?? null },
    });
  }

  console.log("Seed complete.");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => db.$disconnect());
