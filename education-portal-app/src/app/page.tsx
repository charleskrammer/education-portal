"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/components/auth/AuthProvider";

const FEATURES = [
  { icon: "🎬", title: "Curated video library", desc: "Hand-picked official Anthropic videos across 4 learning steps." },
  { icon: "🧠", title: "Quizzes after every video", desc: "Objective quizzes with instant feedback to lock in knowledge." },
  { icon: "🏆", title: "Score & ranking", desc: "Earn points, climb the company leaderboard, and earn a grade." },
  { icon: "📊", title: "Manager insights", desc: "Track team progress, engagement, and score trends at a glance." },
];

const STEPS = [
  { num: "1", title: "AI Basics", desc: "Interface, Artifacts, Projects & Connectors" },
  { num: "2", title: "Daily Use", desc: "Research, files, marketing & finance workflows" },
  { num: "3", title: "AI Code Mastery", desc: "Agentic terminal coding & browser automation" },
  { num: "4", title: "AI Agents", desc: "Build autonomous agents with AI as the brain" },
];

export default function RootPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && user) {
      router.replace("/dashboard");
    }
  }, [isLoading, user, router]);

  // While checking session, show nothing (avoids flash)
  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-sm text-slate-500">Loading…</p>
      </div>
    );
  }

  // Logged in → redirect handled above
  if (user) return null;

  // ── Public landing page ──
  return (
    <div className="flex flex-col">

      {/* Hero */}
      <section className="relative overflow-hidden px-6 py-24 text-center">
        <div className="absolute -left-24 top-0 h-72 w-72 rounded-full bg-teal-200/40 blur-3xl" />
        <div className="absolute -right-24 bottom-0 h-72 w-72 rounded-full bg-amber-200/40 blur-3xl" />
        <div className="relative z-10 mx-auto max-w-3xl">
          <span className="inline-block rounded-full border border-teal-200 bg-teal-50 px-4 py-1 text-xs font-semibold uppercase tracking-widest text-teal-700">
            Internal learning platform
          </span>
          <h1 className="mt-6 text-5xl font-heading font-bold leading-tight text-ink">
            Master AI.<br />
            <span className="text-teal-600">Level up your team.</span>
          </h1>
          <p className="mt-5 text-lg leading-relaxed text-slate-600">
            A 4-step learning path built from official AI training videos — with quizzes, scoring,
            and team dashboards to turn your whole organisation into AI experts.
          </p>
          <div className="mt-10">
            <Link href="/login" className="solid-button text-base px-8 py-3">
              Sign in to get started →
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="px-6 py-12">
        <div className="mx-auto max-w-5xl grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f) => (
            <div key={f.title} className="section-card p-5">
              <span className="text-3xl">{f.icon}</span>
              <h3 className="mt-3 text-sm font-semibold text-ink">{f.title}</h3>
              <p className="mt-1 text-xs leading-relaxed text-slate-500">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Learning path preview */}
      <section className="px-6 py-12">
        <div className="mx-auto max-w-5xl">
          <h2 className="mb-6 text-center text-xl font-heading font-semibold text-ink">
            The 4-step journey
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s) => (
              <div key={s.num} className="rounded-2xl border border-slate-200 bg-white p-5">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-teal-100 text-xs font-bold text-teal-700">
                  {s.num}
                </span>
                <p className="mt-3 text-sm font-semibold text-ink">{s.title}</p>
                <p className="mt-1 text-xs text-slate-500">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 py-16 text-center">
        <div className="mx-auto max-w-xl">
          <h2 className="text-2xl font-heading font-semibold text-ink">Ready to start learning?</h2>
          <p className="mt-3 text-sm text-slate-500">Sign in with your team account to access the full learning path.</p>
          <div className="mt-6">
            <Link href="/login" className="solid-button text-base px-8 py-3">
              Sign in →
            </Link>
          </div>
        </div>
      </section>

    </div>
  );
}
