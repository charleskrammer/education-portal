import { cookies } from "next/headers";
import { db } from "@/lib/db";

export const SESSION_COOKIE = "sid";
export const SESSION_MAX_AGE = 60 * 60 * 24; // 24 hours in seconds

export type SessionUser = {
  id: string;
  externalId: string;
  name: string;
  role: string;
  teamId: string;
};

/** Read the current session from the cookie and return the user, or null. */
export async function getSessionUser(): Promise<SessionUser | null> {
  const cookieStore = cookies();
  const sessionId = cookieStore.get(SESSION_COOKIE)?.value;
  if (!sessionId) return null;

  const session = await db.session.findUnique({
    where: { id: sessionId },
    include: { user: true },
  });

  if (!session) return null;
  if (session.expiresAt && session.expiresAt < new Date()) {
    await db.session.delete({ where: { id: sessionId } }).catch(() => {});
    return null;
  }

  return {
    id: session.user.id,
    externalId: session.user.externalId,
    name: session.user.name,
    role: session.user.role,
    teamId: session.user.teamId,
  };
}
