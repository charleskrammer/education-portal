import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/session";

// GET /api/progress — returns all video progress for the current user
export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const progress = await db.videoProgress.findMany({
    where: { userId: user.id },
  });

  const videos: Record<string, { done: boolean; completedAt?: string }> = {};
  for (const p of progress) {
    videos[p.videoId] = {
      done: p.done,
      completedAt: p.completedAt?.toISOString(),
    };
  }

  return NextResponse.json({ videos });
}

// POST /api/progress — upsert video progress
export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json() as { videoId: string; done: boolean };
  const { videoId, done } = body;

  if (!videoId || typeof done !== "boolean") {
    return NextResponse.json({ error: "videoId and done required" }, { status: 400 });
  }

  const completedAt = done ? new Date() : null;

  const record = await db.videoProgress.upsert({
    where: { userId_videoId: { userId: user.id, videoId } },
    update: { done, completedAt },
    create: { userId: user.id, videoId, done, completedAt },
  });

  return NextResponse.json({ videoId: record.videoId, done: record.done });
}
