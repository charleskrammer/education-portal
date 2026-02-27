import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";
import { SESSION_COOKIE, SESSION_MAX_AGE } from "@/lib/session";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return NextResponse.redirect(
      new URL("/login?error=sso_failed", process.env.NEXTAUTH_URL!)
    );
  }

  const user = await db.user.findUnique({ where: { email: session.user.email } });
  if (!user) {
    return NextResponse.redirect(
      new URL("/login?error=not_provisioned", process.env.NEXTAUTH_URL!)
    );
  }

  const expiresAt = new Date(Date.now() + SESSION_MAX_AGE * 1000);
  const dbSession = await db.session.create({ data: { userId: user.id, expiresAt } });

  const res = NextResponse.redirect(
    new URL("/dashboard", process.env.NEXTAUTH_URL!)
  );
  const host = req.headers.get("host") ?? "";
  const isLocalhost = host.startsWith("localhost") || host.startsWith("127.0.0.1");

  res.cookies.set(SESSION_COOKIE, dbSession.id, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
    secure: process.env.NODE_ENV === "production" && !isLocalhost,
  });
  return res;
}
