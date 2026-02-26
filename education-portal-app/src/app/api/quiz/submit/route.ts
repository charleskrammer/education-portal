import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/session";
import { getAllVideos } from "@/lib/training";
import { scoreQuizAttempt, type AnswerPayload } from "@/lib/scoring/server";
import { SESSION_COOKIE } from "@/lib/session";

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sessionId = req.cookies.get(SESSION_COOKIE)?.value;
  if (!sessionId) return NextResponse.json({ error: "No session" }, { status: 401 });

  const body = await req.json() as { videoId: string; answers: AnswerPayload };
  const { videoId, answers } = body;

  if (!videoId || !Array.isArray(answers)) {
    return NextResponse.json({ error: "videoId and answers required" }, { status: 400 });
  }

  // Look up authoritative quiz questions
  const allVideos = getAllVideos();
  const video = allVideos.find((v) => v.id === videoId);
  if (!video?.quiz) {
    return NextResponse.json({ error: "Video or quiz not found" }, { status: 404 });
  }

  const questions = video.quiz.questions;

  // Determine attempt number (1-based)
  const previousAttempts = await db.quizAttempt.count({
    where: { userId: user.id, quizId: videoId },
  });
  const attemptNumber = previousAttempts + 1;
  const isFirstAttempt = attemptNumber === 1;

  // Score server-side
  const scored = scoreQuizAttempt(questions, answers, isFirstAttempt);

  // Persist with unique constraint protection against double-submit
  try {
    const attempt = await db.quizAttempt.create({
      data: {
        userId: user.id,
        sessionId,
        quizId: videoId,
        videoId,
        attemptNumber,
        completedAt: new Date(),
        totalQuestions: scored.totalQuestions,
        correctAnswers: scored.correctAnswers,
        firstTryCorrect: scored.firstTryCorrect,
        scoreEarned: scored.scoreEarned,
        answers: answers as object[],
      },
    });

    return NextResponse.json({
      attempt: {
        id: attempt.id,
        attemptNumber,
        totalQuestions: scored.totalQuestions,
        correctAnswers: scored.correctAnswers,
        firstTryCorrect: scored.firstTryCorrect,
        scoreEarned: scored.scoreEarned,
        isFirstAttempt,
      },
    });
  } catch (err: unknown) {
    // Unique constraint violation = double submit
    if (err && typeof err === "object" && "code" in err && (err as {code:string}).code === "P2002") {
      return NextResponse.json({ error: "Attempt already recorded" }, { status: 409 });
    }
    console.error("[quiz/submit]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
