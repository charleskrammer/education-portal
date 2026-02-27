import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { db } from "@/lib/db";

async function requireAdmin() {
  const user = await getSessionUser();
  if (!user) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  if (user.role !== "admin") return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  return { user };
}

export async function GET() {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const users = await db.user.findMany({
    orderBy: [{ teamId: "asc" }, { name: "asc" }],
    include: { team: true },
  });

  return NextResponse.json({
    users: users.map((u) => ({
      id: u.id,
      externalId: u.externalId,
      name: u.name,
      email: u.email,
      role: u.role,
      teamId: u.teamId,
      teamName: u.team.name,
      createdAt: u.createdAt,
    })),
  });
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const { name, email, role, teamId } = await req.json() as {
    name: string; email: string; role: string; teamId: string;
  };

  if (!name || !email || !role || !teamId) {
    return NextResponse.json({ error: "name, email, role and teamId are required" }, { status: 400 });
  }

  const externalId = email.replace("@", ".").toLowerCase();

  const user = await db.user.create({
    data: { externalId, name, email: email.toLowerCase(), role, teamId, passwordHash: null },
    include: { team: true },
  });

  return NextResponse.json({
    user: {
      id: user.id,
      externalId: user.externalId,
      name: user.name,
      email: user.email,
      role: user.role,
      teamId: user.teamId,
      teamName: user.team.name,
    },
  }, { status: 201 });
}
