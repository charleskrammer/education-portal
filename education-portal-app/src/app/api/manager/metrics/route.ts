import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/session";
import { getAllVideos } from "@/lib/training";
import { latestAttemptsPerQuiz, sumScore } from "@/lib/scoring/server";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== "manager") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const teamMembers = await db.user.findMany({
    where: { teamId: user.teamId },
    select: { id: true, externalId: true, name: true, role: true },
  });

  const allVideos = getAllVideos();
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const rows = await Promise.all(
    teamMembers.map(async (member) => {
      // Fetch all completed attempts once, use for all score computations
      const allAttempts = await db.quizAttempt.findMany({
        where: { userId: member.id, completedAt: { not: null } },
        orderBy: { completedAt: "asc" },
      });

      // Current score: latest attempt per quiz, all time
      const currentScore = sumScore(latestAttemptsPerQuiz(allAttempts));

      // Score before 7 days ago: latest attempt per quiz among those completed before the cutoff
      const attemptsBeforeCutoff = allAttempts.filter(
        (a) => a.completedAt && a.completedAt < sevenDaysAgo
      );
      const scoreBefore = sumScore(latestAttemptsPerQuiz(attemptsBeforeCutoff));
      const scoreDelta = currentScore - scoreBefore;

      // Login events (sessions) in past 7 days
      const logins7d = await db.session.count({
        where: { userId: member.id, createdAt: { gte: sevenDaysAgo } },
      });

      // Work week login days (Mon–Fri of current calendar week)
      const today = new Date();
      const dow = today.getDay();
      const daysFromMonday = dow === 0 ? 6 : dow - 1;
      const monday = new Date(today);
      monday.setDate(monday.getDate() - daysFromMonday);
      monday.setHours(0, 0, 0, 0);

      const weeklySessions = await db.session.findMany({
        where: { userId: member.id, createdAt: { gte: monday } },
        select: { createdAt: true },
      });
      const loginDaySet = new Set(weeklySessions.map((s) => s.createdAt.toDateString()));
      const workWeekDays = Array.from({ length: 5 }, (_, i) => {
        const d = new Date(monday);
        d.setDate(d.getDate() + i);
        return loginDaySet.has(d.toDateString());
      });

      // Quiz stats: accuracy from latest attempt per quiz only
      const latest = latestAttemptsPerQuiz(allAttempts);
      const quizzesCompleted = new Set(allAttempts.map((a) => a.quizId)).size;
      const totalAnswered = latest.reduce((s, a) => s + a.totalQuestions, 0);
      const totalCorrect = latest.reduce((s, a) => s + a.correctAnswers, 0);
      const accuracy = totalAnswered > 0 ? Math.round((totalCorrect / totalAnswered) * 100) : 0;

      // Video completion
      const progress = await db.videoProgress.findMany({
        where: { userId: member.id, done: true },
      });
      const videosCompleted = progress.length;
      const completionPct = allVideos.length > 0
        ? Math.round((videosCompleted / allVideos.length) * 100)
        : 0;

      return {
        member: { id: member.externalId, name: member.name, role: member.role },
        currentScore,
        scoreDelta,
        logins7d,
        workWeekDays,
        quizzesCompleted,
        accuracy,
        videosCompleted,
        completionPct,
      };
    })
  );

  rows.sort((a, b) => b.currentScore - a.currentScore);

  return NextResponse.json({ rows, teamId: user.teamId });
}
