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

  const teams = await db.team.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { users: true } } },
  });
  return NextResponse.json({ teams });
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const { name, track } = await req.json() as { name: string; track: string };
  if (!name || !track) {
    return NextResponse.json({ error: "name and track are required" }, { status: 400 });
  }

  const id = name.toLowerCase().replace(/[^a-z0-9]/g, "-");
  const team = await db.team.create({ data: { id, name, track } });
  return NextResponse.json({ team }, { status: 201 });
}
