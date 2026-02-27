import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { db } from "@/lib/db";

async function requireAdmin() {
  const user = await getSessionUser();
  if (!user) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  if (user.role !== "admin") return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  return { user };
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const body = await req.json() as { name?: string; track?: string };

  const team = await db.team.update({
    where: { id: params.id },
    data: {
      ...(body.name  && { name: body.name }),
      ...(body.track && { track: body.track }),
    },
    include: { _count: { select: { users: true } } },
  });

  return NextResponse.json({
    team: {
      id: team.id,
      name: team.name,
      track: team.track,
      userCount: team._count.users,
    },
  });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const count = await db.user.count({ where: { teamId: params.id } });
  if (count > 0) {
    return NextResponse.json(
      { error: `Cannot delete a team with ${count} user${count === 1 ? "" : "s"}. Reassign users first.` },
      { status: 409 }
    );
  }

  await db.team.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
