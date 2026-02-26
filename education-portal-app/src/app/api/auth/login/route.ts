import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { SESSION_COOKIE, SESSION_MAX_AGE } from "@/lib/session";

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json() as { username: string; password: string };

    if (!username || !password) {
      return NextResponse.json({ error: "Username and password required" }, { status: 400 });
    }

    const user = await db.user.findUnique({ where: { externalId: username.toLowerCase() } });
    if (!user) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    // Create session (expires in 24 h)
    const expiresAt = new Date(Date.now() + SESSION_MAX_AGE * 1000);
    const session = await db.session.create({
      data: { userId: user.id, expiresAt },
    });

    const res = NextResponse.json({
      user: {
        id: user.externalId,        // keep externalId as public "id" for UI compat
        internalId: user.id,
        name: user.name,
        role: user.role,
        teamId: user.teamId,
      },
    });

    res.cookies.set(SESSION_COOKIE, session.id, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_MAX_AGE,
      secure: process.env.NODE_ENV === "production",
    });

    return res;
  } catch (err) {
    console.error("[auth/login]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
