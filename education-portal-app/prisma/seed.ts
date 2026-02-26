import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

const USERS = [
  { externalId: "alex",  name: "Alex Johnson",  role: "learner",  teamId: "alpha", password: "claude123" },
  { externalId: "sara",  name: "Sara Williams", role: "manager",  teamId: "alpha", password: "manage123" },
  { externalId: "mike",  name: "Mike Chen",      role: "learner",  teamId: "alpha", password: "claude123" },
  { externalId: "tom",   name: "Tom Becker",     role: "manager",  teamId: "beta",  password: "manage123" },
  { externalId: "nina",  name: "Nina Patel",     role: "learner",  teamId: "beta",  password: "claude123" },
];

const TEAMS = [
  { id: "alpha", name: "Alpha" },
  { id: "beta",  name: "Beta"  },
];

async function main() {
  console.log("Seeding teams…");
  for (const team of TEAMS) {
    await db.team.upsert({
      where: { id: team.id },
      update: { name: team.name },
      create: { id: team.id, name: team.name },
    });
  }

  console.log("Seeding users…");
  for (const u of USERS) {
    const passwordHash = await bcrypt.hash(u.password, 10);
    await db.user.upsert({
      where: { externalId: u.externalId },
      update: { name: u.name, role: u.role, teamId: u.teamId, passwordHash },
      create: { externalId: u.externalId, name: u.name, role: u.role, teamId: u.teamId, passwordHash },
    });
  }

  console.log("Seed complete.");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => db.$disconnect());
