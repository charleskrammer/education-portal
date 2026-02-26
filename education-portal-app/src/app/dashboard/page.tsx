"use client";

import Link from "next/link";
import Breadcrumbs from "@/components/layout/Breadcrumbs";
import { useAuth } from "@/components/auth/AuthProvider";
import { training } from "@/lib/training";
import { useApiProgress } from "@/hooks/useApiProgress";
import { useDashboard } from "@/hooks/useDashboard";

const GRADE_COLORS: Record<string, string> = {
  A: "bg-amber-100 text-amber-800 border-amber-300",
  B: "bg-teal-100 text-teal-800 border-teal-300",
  C: "bg-blue-100 text-blue-800 border-blue-300",
  D: "bg-slate-100 text-slate-700 border-slate-300",
};

export default function DashboardPage() {
  const { user } = useAuth();
  const { kpis, loading } = useDashboard(user?.internalId);
  const { state } = useApiProgress(user?.internalId);

  const { totalScore, quizzesCompleted, accuracy, streak, rank, total, percentile, grade, top10 } = kpis;

  const masteredTopics = training.steps.flatMap((step) =>
    step.topics.map((topic) => ({
      topic,
      step,
      done: topic.videos.length > 0 && topic.videos.every((v) => Boolean(state.videos[v.id]?.done)),
    }))
  );

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-sm text-slate-500">Loading…</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-10">
      <Breadcrumbs items={[{ label: "My Dashboard" }]} />

      {/* Hero KPIs */}
      <section className="section-card relative overflow-hidden p-6">
        <div className="absolute -right-16 top-8 h-32 w-32 rounded-full bg-teal-200/60 blur-3xl" />
        <div className="absolute left-10 top-0 h-24 w-24 rounded-full bg-amber-200/60 blur-2xl" />
        <div className="relative z-10 flex flex-col gap-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Mission control</p>
          <h1 className="text-3xl font-heading font-semibold text-ink">
            {user?.name ? `Welcome back, ${user.name.split(" ")[0]}` : "Your dashboard"}
          </h1>
          <p className="text-sm text-slate-600">Your quiz performance drives your score and track ranking.</p>
          <div className="mt-2 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard label="Quizzes completed" value={`${quizzesCompleted}`} helper="Videos with quiz submitted" />
            <KpiCard label="Overall accuracy" value={`${accuracy}%`} helper="Questions answered correctly" />
            <KpiCard label="Total score" value={`${totalScore} pts`} helper="From all quiz attempts" />
            <KpiCard
              label="Learning streak"
              value={streak > 0 ? `${streak} day${streak !== 1 ? "s" : ""}` : "0 days"}
              helper={streak > 0 ? "Consecutive work-week login days" : "Log in daily to build a streak"}
            />
          </div>
        </div>
      </section>

      {/* Rank + Grade */}
      <section className="grid gap-6 md:grid-cols-2">
        <div className="section-card p-6">
          <h2 className="section-title">Your track ranking</h2>
          <div className="mt-4 flex items-end gap-4">
            <div>
              <p className="text-4xl font-heading font-bold text-ink">
                #{rank}
                <span className="ml-2 text-lg font-normal text-slate-400">of {total}</span>
              </p>
              <p className="mt-1 text-xs text-slate-500">Ranked by total quiz score · {percentile}th percentile</p>
            </div>
            <div className={`rounded-2xl border px-4 py-2 text-center font-heading font-bold text-3xl ${GRADE_COLORS[grade]}`}>
              {grade}
            </div>
          </div>
          <div className="mt-4 text-xs text-slate-500 space-y-1">
            <p>A = top 10% · B = top 25% · C = top 50% · D = below median</p>
            <p>Score only increases — keep completing quizzes to climb.</p>
          </div>
        </div>

        <div className="section-card p-6">
          <h2 className="section-title">Next best moves</h2>
          <div className="mt-4 flex flex-col gap-3 text-sm text-slate-600">
            <p>Watch a video, mark it complete, then take the quiz to earn points.</p>
            <p>First-try correct answers earn a +5 bonus per question.</p>
            <p><Link href="/path" className="font-semibold text-moss">Continue the learning path →</Link></p>
            {user?.role === "manager" && (
              <p><Link href="/manager" className="font-semibold text-moss">View manager dashboard →</Link></p>
            )}
          </div>
        </div>
      </section>

      {/* Company Top 10 */}
      <section className="section-card p-6">
        <h2 className="section-title">Top 10 in your track</h2>
        <p className="mt-1 text-xs text-slate-500">Ranked by total quiz score across your track.</p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-xs font-semibold uppercase text-slate-500">
                <th className="pb-2 pr-4">Rank</th>
                <th className="pb-2 pr-4">Name</th>
                <th className="pb-2 text-right">Score</th>
              </tr>
            </thead>
            <tbody>
              {top10.map((entry) => {
                const isMe = entry.id === user?.id;
                return (
                  <tr key={entry.id} className={`border-b border-slate-50 ${isMe ? "bg-amber-50" : ""}`}>
                    <td className="py-2 pr-4 font-semibold text-slate-500">
                      {entry.position === 1 ? "🥇" : entry.position === 2 ? "🥈" : entry.position === 3 ? "🥉" : `#${entry.position}`}
                    </td>
                    <td className="py-2 pr-4 font-semibold text-ink">
                      {entry.name}
                      {isMe && <span className="ml-2 text-xs text-amber-600 font-normal">you</span>}
                    </td>
                    <td className="py-2 text-right font-heading font-semibold text-teal-700">{entry.score} pts</td>
                  </tr>
                );
              })}
              {top10.length === 0 && (
                <tr><td colSpan={3} className="py-6 text-center text-slate-500">No quiz scores yet. Complete a quiz to appear here.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Topic Progress */}
      <section className="section-card p-6">
        <h2 className="section-title">Topic progress</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {masteredTopics.map(({ topic, step, done }) => (
            <div key={topic.id} className={`rounded-2xl border px-4 py-3 text-sm ${done ? "border-teal-200 bg-teal-50" : "border-slate-200 bg-white"}`}>
              <p className="font-semibold text-ink">{topic.title}</p>
              <p className="text-xs text-slate-500">Step {step.id}: {step.title}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function KpiCard({ label, value, helper }: { label: string; value: string; helper: string }) {
  return (
    <div className="rounded-2xl border border-white/70 bg-white/80 p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-heading font-semibold text-ink">{value}</p>
      <p className="text-xs text-slate-500">{helper}</p>
    </div>
  );
}
