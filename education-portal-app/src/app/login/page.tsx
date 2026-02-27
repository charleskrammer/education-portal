"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useAuth } from "@/components/auth/AuthProvider";

const DEMO_ACCOUNTS = [
  { id: "alex",  name: "Alex Johnson",  role: "learner",  teamId: "alpha" },
  { id: "sara",  name: "Sara Williams", role: "manager",  teamId: "alpha" },
  { id: "mike",  name: "Mike Chen",      role: "learner",  teamId: "alpha" },
  { id: "tom",   name: "Tom Becker",     role: "manager",  teamId: "beta"  },
  { id: "nina",  name: "Nina Patel",     role: "learner",  teamId: "beta"  },
];

const TEAM_NAMES: Record<string, string> = {
  alpha: "Alpha",
  beta: "Beta",
};

const SSO_ERRORS: Record<string, string> = {
  not_provisioned: "Your Microsoft account is not linked to a portal account. Contact your administrator.",
  sso_failed: "Microsoft sign-in failed. Please try again.",
};

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(
    SSO_ERRORS[searchParams.get("error") ?? ""] ?? null
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);
    const result = await login(username.trim(), password.trim());
    setIsSubmitting(false);
    if (!result.ok) { setError(result.error ?? "Unable to log in."); return; }
    router.push("/dashboard");
  };

  return (
    <div className="flex min-h-[80vh] items-center justify-center px-6 py-16">
      <div className="w-full max-w-md">

        {/* Logo / back link */}
        <div className="mb-8 text-center">
          <Link href="/" className="text-xs text-slate-400 hover:text-slate-600 transition">
            ← Back to home
          </Link>
          <h1 className="mt-4 text-3xl font-heading font-bold text-ink">Sign in</h1>
          <p className="mt-2 text-sm text-slate-500">Access your learning session</p>
        </div>

        {/* Form */}
        <div className="section-card p-8">
          <form className="grid gap-5" onSubmit={handleSubmit}>
            <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
              Username
              <input
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm focus:border-teal-400 focus:outline-none"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. alex"
                autoFocus
                required
              />
            </label>
            <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
              Password
              <input
                type="password"
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm focus:border-teal-400 focus:outline-none"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Your password"
                required
              />
            </label>
            {error && (
              <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-700">
                {error}
              </p>
            )}
            <button
              type="submit"
              className="solid-button mt-1 w-full justify-center"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Signing in…" : "Sign in →"}
            </button>
          </form>

          <div className="mt-5 flex items-center gap-3">
            <hr className="flex-1 border-slate-200" />
            <span className="text-xs text-slate-400">or</span>
            <hr className="flex-1 border-slate-200" />
          </div>

          <button
            type="button"
            className="mt-4 flex w-full items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 shadow-sm transition hover:border-teal-300 hover:bg-slate-50"
            onClick={() => signIn("azure-ad", { callbackUrl: "/api/auth/sso-callback" })}
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 21 21" width="20" height="20" aria-hidden="true">
              <rect x="1" y="1" width="9" height="9" fill="#f25022" />
              <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
              <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
              <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
            </svg>
            Sign in with Microsoft
          </button>
        </div>

        {/* Demo accounts */}
        <div className="mt-8">
          <p className="mb-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-400">
            Demo accounts — click to prefill
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            {DEMO_ACCOUNTS.map((u) => (
              <button
                key={u.id}
                type="button"
                className="rounded-2xl border border-slate-200 bg-white p-3 text-left shadow-sm transition hover:border-teal-300"
                onClick={() => {
                  setUsername(u.id);
                  setPassword(u.role === "manager" ? "manage123" : "claude123");
                }}
              >
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-ink">{u.name}</p>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${u.role === "manager" ? "bg-red-100 text-red-600" : "bg-teal-100 text-teal-700"}`}>
                    {u.role}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-slate-400">Team {TEAM_NAMES[u.teamId] ?? u.teamId}</p>
              </button>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
