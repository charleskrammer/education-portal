import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/session";

export async function GET(
  _req: NextRequest,
  { params }: { params: { videoId: string } }
) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const attempts = await db.quizAttempt.findMany({
    where: { userId: user.id, videoId: params.videoId },
    orderBy: { attemptNumber: "asc" },
    select: {
      id: true,
      attemptNumber: true,
      correctAnswers: true,
      totalQuestions: true,
      firstTryCorrect: true,
      scoreEarned: true,
      completedAt: true,
    },
  });

  const best = attempts.length > 0
    ? attempts.reduce((b, a) => (a.scoreEarned > b.scoreEarned ? a : b))
    : null;

  return NextResponse.json({ attempts, best });
}
