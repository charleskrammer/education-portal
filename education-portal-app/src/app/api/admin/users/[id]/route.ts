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

  const body = await req.json() as {
    name?: string; email?: string; role?: string; teamId?: string;
  };

  const user = await db.user.update({
    where: { id: params.id },
    data: {
      ...(body.name   && { name: body.name }),
      ...(body.email  && { email: body.email.toLowerCase() }),
      ...(body.role   && { role: body.role }),
      ...(body.teamId && { teamId: body.teamId }),
    },
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
  });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  await db.user.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
