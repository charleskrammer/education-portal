"use client";

import { useEffect, useState } from "react";
import Breadcrumbs from "@/components/layout/Breadcrumbs";
import { useAuth } from "@/components/auth/AuthProvider";
import { getAllVideos } from "@/lib/training";
import type { MemberRow, MetricsResponse } from "@/types/api";


export default function ManagerDashboardPage() {
  const { user } = useAuth();

  if (!user || user.role !== "manager") {
    return (
      <div className="flex flex-col gap-6">
        <Breadcrumbs items={[{ label: "My Dashboard", href: "/dashboard" }, { label: "Manager's Dashboard" }]} />
        <section className="section-card p-6">
          <h1 className="text-3xl font-heading font-semibold text-ink">Manager Dashboard</h1>
          <p className="mt-2 text-sm text-slate-600">This area is available to managers only.</p>
        </section>
      </div>
    );
  }

  return <ManagerView managerId={user.id} teamId={user.teamId} />;
}

function ManagerView({ managerId, teamId }: { managerId: string; teamId: string }) {
  const allVideos = getAllVideos();
  const [rows, setRows] = useState<MemberRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/manager/metrics")
      .then((r) => r.json())
      .then((data: MetricsResponse) => {
        setRows(data.rows ?? []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Aggregate KPIs
  const teamSize = rows.length;
  const activeMembers = rows.filter((r) => r.workWeekDays.filter(Boolean).length > 0).length;
  const totalTeamScore = rows.reduce((s, r) => s + r.currentScore, 0);
  const avgCompletion = teamSize > 0 ? Math.round(rows.reduce((s, r) => s + r.completionPct, 0) / teamSize) : 0;
  const totalScoreGain7d = rows.reduce((s, r) => s + (r.scoreDelta > 0 ? r.scoreDelta : 0), 0);
  const topScorer = rows[0];
  const maxScore = topScorer?.currentScore ?? 1;

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-sm text-slate-500">Loading team data…</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <Breadcrumbs items={[{ label: "My Dashboard", href: "/dashboard" }, { label: "Manager's Dashboard" }]} />

      {/* Header */}
      <section className="section-card relative overflow-hidden p-6">
        <div className="absolute -right-16 top-8 h-32 w-32 rounded-full bg-red-100/60 blur-3xl" />
        <div className="absolute left-10 top-0 h-24 w-24 rounded-full bg-amber-200/50 blur-2xl" />
        <div className="relative z-10">
          <span className="inline-block rounded-full bg-red-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-red-600">
            Manager View
          </span>
          <h1 className="mt-3 text-3xl font-heading font-semibold text-ink">
            Team {teamId}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {teamSize} member{teamSize !== 1 ? "s" : ""} · data from PostgreSQL
          </p>
        </div>
      </section>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Team members"
          value={`${teamSize}`}
          helper="In your team"
          color="slate"
          icon="👥"
        />
        <KpiCard
          label="Active (7d)"
          value={`${activeMembers} / ${teamSize}`}
          helper="Members with ≥1 login"
          color="teal"
          icon="✅"
        />
        <KpiCard
          label="Total Team Score"
          value={`${totalTeamScore} pts`}
          helper="Sum of all member scores"
          color="amber"
          icon="🏆"
        />
        <KpiCard
          label="Score gained (7d)"
          value={`+${totalScoreGain7d} pts`}
          helper="Total team progress"
          color="green"
          icon="📈"
        />
      </div>

      {/* Two-column: Score bar chart + Completion bar chart */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Score leaderboard bar chart */}
        <div className="section-card p-6">
          <h2 className="section-title">Score ranking</h2>
          <p className="mt-1 mb-5 text-xs text-slate-500">Total quiz score per member</p>
          <div className="flex flex-col gap-3">
            {rows.map((row, idx) => {
              const barPct = maxScore > 0 ? Math.round((row.currentScore / maxScore) * 100) : 0;
              const isMe = row.member.id === managerId;
              return (
                <div key={row.member.id}>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className={`font-semibold ${isMe ? "text-red-600" : "text-ink"}`}>
                      {idx === 0 ? "🥇 " : idx === 1 ? "🥈 " : idx === 2 ? "🥉 " : `${idx + 1}. `}
                      {row.member.name}
                      {isMe && <span className="ml-1 text-red-400">(you)</span>}
                    </span>
                    <span className="font-heading font-semibold text-teal-700">{row.currentScore} pts</span>
                  </div>
                  <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-3 rounded-full bg-gradient-to-r from-teal-400 to-teal-600 transition-all duration-500"
                      style={{ width: `${barPct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Video completion bar chart */}
        <div className="section-card p-6">
          <h2 className="section-title">Mission completion</h2>
          <p className="mt-1 mb-5 text-xs text-slate-500">% of learning path missions completed</p>
          <div className="flex flex-col gap-3">
            {rows.map((row) => {
              const isMe = row.member.id === managerId;
              return (
                <div key={row.member.id}>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className={`font-semibold ${isMe ? "text-red-600" : "text-ink"}`}>
                      {row.member.name}
                    </span>
                    <span className="text-slate-500">
                      {row.videosCompleted}/{allVideos.length} · {row.completionPct}%
                    </span>
                  </div>
                  <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-3 rounded-full bg-gradient-to-r from-amber-300 to-amber-500 transition-all duration-500"
                      style={{ width: `${row.completionPct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-4 flex items-center gap-2 text-xs text-slate-500">
            <div className="h-2 w-6 rounded-full bg-gradient-to-r from-amber-300 to-amber-500" />
            <span>Team avg: {avgCompletion}%</span>
          </div>
        </div>
      </div>

      {/* Engagement heatmap — current work week (Mon–Fri) */}
      {(() => {
        const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri"];
        return (
          <div className="section-card p-6">
            <h2 className="section-title">Weekly engagement</h2>
            <p className="mt-1 mb-5 text-xs text-slate-500">Login days this work week (Mon–Fri) per member</p>
            <div className="flex flex-col gap-4">
              {/* Header row with day labels */}
              <div className="flex gap-1 ml-36">
                {DAY_LABELS.map((d) => (
                  <div key={d} className="w-6 text-center text-[10px] text-slate-400">{d}</div>
                ))}
              </div>
              {rows.map((row) => {
                const isMe = row.member.id === managerId;
                const loginsThisWeek = row.workWeekDays.filter(Boolean).length;
                return (
                  <div key={row.member.id} className="flex items-center gap-4">
                    <span className={`w-32 shrink-0 text-sm font-semibold ${isMe ? "text-red-600" : "text-ink"}`}>
                      {row.member.name}
                    </span>
                    <div className="flex gap-1">
                      {row.workWeekDays.map((active, i) => (
                        <div
                          key={i}
                          title={DAY_LABELS[i]}
                          className={`h-6 w-6 rounded ${active ? "bg-teal-500" : "bg-slate-100"}`}
                        />
                      ))}
                    </div>
                    <span className="text-xs text-slate-400">{loginsThisWeek}/5 days</span>
                  </div>
                );
              })}
              <div className="mt-2 flex items-center gap-2 text-xs text-slate-400">
                <div className="flex gap-1">
                  <div className="h-4 w-4 rounded bg-slate-100" />
                  <div className="h-4 w-4 rounded bg-teal-500" />
                </div>
                <span>No login / Logged in</span>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Detail table */}
      <div className="section-card p-6">
        <h2 className="section-title">Member details</h2>
        <p className="mt-1 mb-4 text-xs text-slate-500">
          Score delta = quiz points earned in last 7 days · Accuracy = correct answers / total questions
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-xs font-semibold uppercase text-slate-500">
                <th className="pb-3 pr-4">Member</th>
                <th className="pb-3 pr-4 text-right">Score</th>
                <th className="pb-3 pr-4 text-right">+7d</th>
                <th className="pb-3 pr-4 text-right">Quizzes</th>
                <th className="pb-3 pr-4 text-right">Accuracy</th>
                <th className="pb-3 text-right">Logins (wk)</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const isMe = row.member.id === managerId;
                return (
                  <tr key={row.member.id} className={`border-b border-slate-50 ${isMe ? "bg-red-50/40" : ""}`}>
                    <td className={`py-3 pr-4 font-semibold ${isMe ? "text-red-600" : "text-ink"}`}>
                      {row.member.name}
                      {isMe && <span className="ml-2 text-xs font-normal text-red-400">you</span>}
                    </td>
                    <td className="py-3 pr-4 text-right font-heading font-semibold text-teal-700">
                      {row.currentScore} pts
                    </td>
                    <td className="py-3 pr-4 text-right">
                      <span className={`font-semibold ${row.scoreDelta > 0 ? "text-teal-600" : "text-slate-400"}`}>
                        {row.scoreDelta > 0 ? "+" : ""}{row.scoreDelta} pts
                      </span>
                    </td>
                    <td className="py-3 pr-4 text-right text-slate-600">{row.quizzesCompleted}</td>
                    <td className="py-3 pr-4 text-right">
                      <span className={`font-semibold ${row.accuracy >= 70 ? "text-teal-600" : row.accuracy >= 40 ? "text-amber-600" : "text-slate-400"}`}>
                        {row.accuracy > 0 ? `${row.accuracy}%` : "—"}
                      </span>
                    </td>
                    <td className="py-3 text-right">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${row.logins7d > 0 ? "bg-teal-100 text-teal-700" : "bg-slate-100 text-slate-400"}`}>
                        {row.logins7d}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function KpiCard({ label, value, helper, color, icon }: {
  label: string; value: string; helper: string; color: string; icon: string;
}) {
  const border: Record<string, string> = {
    slate: "border-slate-200", teal: "border-teal-200", amber: "border-amber-200", green: "border-green-200"
  };
  const bg: Record<string, string> = {
    slate: "bg-slate-50", teal: "bg-teal-50", amber: "bg-amber-50", green: "bg-green-50"
  };
  return (
    <div className={`rounded-2xl border ${border[color] ?? "border-slate-200"} ${bg[color] ?? "bg-white"} p-5`}>
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
        <span className="text-lg">{icon}</span>
      </div>
      <p className="mt-2 text-2xl font-heading font-bold text-ink">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{helper}</p>
    </div>
  );
}
