import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/session";
import { computeGrade, computePercentile, computeRankPosition } from "@/lib/scoring";
import { latestAttemptsPerQuiz, sumScore } from "@/lib/scoring/server";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // --- Personal stats (latest attempt per quiz only) ---
  const allAttempts = await db.quizAttempt.findMany({
    where: { userId: user.id, completedAt: { not: null } },
    orderBy: { completedAt: "asc" },
  });

  const latest = latestAttemptsPerQuiz(allAttempts);

  const totalScore = sumScore(latest);
  const quizzesCompleted = new Set(allAttempts.map((a) => a.quizId)).size;
  const totalCorrect = latest.reduce((s, a) => s + a.correctAnswers, 0);
  const totalAnswered = latest.reduce((s, a) => s + a.totalQuestions, 0);
  const accuracy = totalAnswered > 0 ? Math.round((totalCorrect / totalAnswered) * 100) : 0;

  // --- Streak (work-week, login-based) ---
  const sessions = await db.session.findMany({
    where: { userId: user.id },
    select: { createdAt: true },
    orderBy: { createdAt: "desc" },
  });
  const loginDays = new Set(sessions.map((s) => s.createdAt.toDateString()));
  let streak = 0;
  const today = new Date();
  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dow = d.getDay();
    if (dow === 0 || dow === 6) continue;
    if (loginDays.has(d.toDateString())) {
      streak++;
    } else {
      break;
    }
  }

  // --- Company-wide ranking (latest attempt per quiz, per user) ---
  const allUsers = await db.user.findMany({ select: { id: true, externalId: true, name: true } });

  // Fetch all completed attempts for all users in one query
  const allUserAttempts = await db.quizAttempt.findMany({
    where: { completedAt: { not: null } },
    select: { userId: true, quizId: true, completedAt: true, scoreEarned: true, correctAnswers: true, totalQuestions: true },
    orderBy: { completedAt: "asc" },
  });

  // Group by userId, then compute latest-per-quiz score for each
  const attemptsByUser = new Map<string, typeof allUserAttempts>();
  for (const a of allUserAttempts) {
    if (!attemptsByUser.has(a.userId)) attemptsByUser.set(a.userId, []);
    attemptsByUser.get(a.userId)!.push(a);
  }

  const userScoreMap = new Map<string, number>();
  for (const u of allUsers) {
    const userAttempts = attemptsByUser.get(u.id) ?? [];
    userScoreMap.set(u.id, sumScore(latestAttemptsPerQuiz(userAttempts)));
  }

  const allScoresComplete = allUsers.map((u) => userScoreMap.get(u.id) ?? 0);
  const myScore = userScoreMap.get(user.id) ?? 0;

  const rank = computeRankPosition(myScore, allScoresComplete);
  const total = allUsers.length;
  const percentile = computePercentile(myScore, allScoresComplete);
  const grade = computeGrade(percentile);

  // --- Top 10 leaderboard ---
  const top10 = allUsers
    .map((u) => ({ id: u.externalId, name: u.name, score: userScoreMap.get(u.id) ?? 0 }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 10)
    .map((entry, idx) => ({ ...entry, position: idx + 1 }));

  return NextResponse.json({
    totalScore,
    quizzesCompleted,
    accuracy,
    streak,
    rank,
    total,
    percentile,
    grade,
    top10,
  });
}
