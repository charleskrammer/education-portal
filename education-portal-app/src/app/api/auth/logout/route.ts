import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/session";

export async function POST(req: NextRequest) {
  // Do NOT delete the session from the DB on logout.
  // Sessions expire naturally after 24h via expiresAt, and are cleaned up
  // by getSessionUser() when accessed. Deleting here would erase login history
  // and break the manager dashboard's logins-in-7-days count (auto-logout at
  // 23:59 would wipe every day's session before the metrics query runs).
  // Just clear the cookie so the browser is no longer authenticated.
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, "", { maxAge: 0, path: "/" });
  return res;
}
