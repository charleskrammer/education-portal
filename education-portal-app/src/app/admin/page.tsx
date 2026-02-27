"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import Breadcrumbs from "@/components/layout/Breadcrumbs";

type AdminUser = {
  id: string;
  externalId: string;
  name: string;
  email: string | null;
  role: string;
  teamId: string;
  teamName: string;
  createdAt: string;
};

type AdminTeam = { id: string; name: string; track: string; userCount: number };

const ROLES = ["learner", "manager", "admin"];
const TRACKS = ["business", "dev"];

const ROLE_BADGE: Record<string, string> = {
  admin:   "bg-purple-100 text-purple-700",
  manager: "bg-red-100 text-red-600",
  learner: "bg-teal-100 text-teal-700",
};

const TRACK_BADGE: Record<string, string> = {
  business: "bg-orange-100 text-orange-700",
  dev:      "bg-blue-100 text-blue-700",
};

export default function AdminPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  const [users, setUsers]   = useState<AdminUser[]>([]);
  const [teams, setTeams]   = useState<AdminTeam[]>([]);
  const [fetching, setFetching] = useState(true);

  // ── User add / edit form ────────────────────────────────────────────────────
  const [editTarget, setEditTarget] = useState<AdminUser | null>(null);
  const [form, setForm] = useState({ name: "", email: "", role: "learner", teamId: "" });
  const [formError, setFormError] = useState<string | null>(null);
  const [formSaving, setFormSaving] = useState(false);

  // ── Team add / edit form ────────────────────────────────────────────────────
  const [teamEditTarget, setTeamEditTarget] = useState<AdminTeam | null>(null);
  const [teamForm, setTeamForm] = useState({ name: "", track: "business" });
  const [teamFormError, setTeamFormError] = useState<string | null>(null);
  const [teamFormSaving, setTeamFormSaving] = useState(false);

  // ── CSV import ──────────────────────────────────────────────────────────────
  const fileRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ imported: number; skipped: number; errors: string[] } | null>(null);

  // Auth guard
  useEffect(() => {
    if (!isLoading && user && user.role !== "admin") router.replace("/dashboard");
  }, [isLoading, user, router]);

  // Load data
  useEffect(() => {
    if (!user || user.role !== "admin") return;
    Promise.all([
      fetch("/api/admin/users").then((r) => r.json()),
      fetch("/api/admin/teams").then((r) => r.json()),
    ]).then(([usersData, teamsData]) => {
      setUsers((usersData as { users: AdminUser[] }).users ?? []);
      const raw = (teamsData as { teams: Array<{ id: string; name: string; track: string; _count: { users: number } }> }).teams ?? [];
      setTeams(raw.map((t) => ({ id: t.id, name: t.name, track: t.track, userCount: t._count.users })));
    }).finally(() => setFetching(false));
  }, [user]);

  if (isLoading || !user) return null;
  if (user.role !== "admin") return null;

  // ── User helpers ────────────────────────────────────────────────────────────

  function openAdd() {
    setEditTarget(null);
    setForm({ name: "", email: "", role: "learner", teamId: teams[0]?.id ?? "" });
    setFormError(null);
  }

  function openEdit(u: AdminUser) {
    setEditTarget(u);
    setForm({ name: u.name, email: u.email ?? "", role: u.role, teamId: u.teamId });
    setFormError(null);
  }

  function closeForm() {
    setEditTarget(null);
    setForm({ name: "", email: "", role: "learner", teamId: "" });
    setFormError(null);
  }

  async function handleSave() {
    setFormSaving(true);
    setFormError(null);
    try {
      const url    = editTarget ? `/api/admin/users/${editTarget.id}` : "/api/admin/users";
      const method = editTarget ? "PATCH" : "POST";
      const res    = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json() as { user?: AdminUser; error?: string };
      if (!res.ok) { setFormError(data.error ?? "Save failed"); return; }
      if (editTarget) {
        setUsers((prev) => prev.map((u) => u.id === editTarget.id ? data.user! : u));
      } else {
        setUsers((prev) => [...prev, data.user!]);
      }
      closeForm();
    } finally {
      setFormSaving(false);
    }
  }

  async function handleDelete(u: AdminUser) {
    if (!confirm(`Delete ${u.name}? This also removes their sessions and progress.`)) return;
    const res = await fetch(`/api/admin/users/${u.id}`, { method: "DELETE" });
    if (res.ok) setUsers((prev) => prev.filter((x) => x.id !== u.id));
  }

  async function handleImport() {
    const file = fileRef.current?.files?.[0];
    if (!file) return;
    setImporting(true);
    setImportResult(null);
    const fd = new FormData();
    fd.append("file", file);
    const res  = await fetch("/api/admin/import", { method: "POST", body: fd });
    const data = await res.json() as { imported: number; skipped: number; errors: string[] };
    setImportResult(data);
    setImporting(false);
    if (data.imported > 0) {
      fetch("/api/admin/users").then((r) => r.json()).then((d: { users: AdminUser[] }) => setUsers(d.users ?? []));
    }
  }

  // ── Team helpers ────────────────────────────────────────────────────────────

  function openAddTeam() {
    setTeamEditTarget(null);
    setTeamForm({ name: "", track: "business" });
    setTeamFormError(null);
  }

  function openEditTeam(t: AdminTeam) {
    setTeamEditTarget(t);
    setTeamForm({ name: t.name, track: t.track });
    setTeamFormError(null);
  }

  function closeTeamForm() {
    setTeamEditTarget(null);
    setTeamForm({ name: "", track: "business" });
    setTeamFormError(null);
  }

  async function handleTeamSave() {
    setTeamFormSaving(true);
    setTeamFormError(null);
    try {
      const url    = teamEditTarget ? `/api/admin/teams/${teamEditTarget.id}` : "/api/admin/teams";
      const method = teamEditTarget ? "PATCH" : "POST";
      const res    = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(teamForm),
      });
      const data = await res.json() as { team?: { id: string; name: string; track: string; userCount?: number }; error?: string };
      if (!res.ok) { setTeamFormError(data.error ?? "Save failed"); return; }
      const saved: AdminTeam = {
        id:        data.team!.id,
        name:      data.team!.name,
        track:     data.team!.track,
        userCount: data.team!.userCount ?? (teamEditTarget?.userCount ?? 0),
      };
      if (teamEditTarget) {
        setTeams((prev) => prev.map((t) => t.id === teamEditTarget.id ? saved : t));
      } else {
        setTeams((prev) => [...prev, saved]);
      }
      closeTeamForm();
    } finally {
      setTeamFormSaving(false);
    }
  }

  async function handleTeamDelete(t: AdminTeam) {
    if (!confirm(`Delete team "${t.name}"? This cannot be undone.`)) return;
    const res = await fetch(`/api/admin/teams/${t.id}`, { method: "DELETE" });
    if (res.ok) {
      setTeams((prev) => prev.filter((x) => x.id !== t.id));
    } else {
      const data = await res.json() as { error?: string };
      alert(data.error ?? "Delete failed");
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  const isFormOpen     = editTarget !== null || form.name !== "" || form.email !== "";
  const isTeamFormOpen = teamEditTarget !== null || teamForm.name !== "";

  return (
    <div className="mx-auto max-w-6xl px-6 py-10 space-y-8">
      <Breadcrumbs items={[{ label: "Admin" }]} />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-heading font-bold text-ink">Admin Panel</h1>
          <p className="mt-1 text-sm text-slate-500">Manage users, teams, and bulk import from Azure AD</p>
        </div>
        <button className="solid-button" onClick={openAdd}>+ Add user</button>
      </div>

      {/* ── Add / Edit user form ─────────────────────────────────────────── */}
      {isFormOpen && (
        <div className="section-card p-6">
          <h2 className="mb-4 text-sm font-semibold text-ink">
            {editTarget ? `Edit — ${editTarget.name}` : "New user"}
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
              Full name
              <input
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:border-teal-400 focus:outline-none"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Jane Doe"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
              Microsoft email
              <input
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:border-teal-400 focus:outline-none"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="jane.doe@xbo.com"
                type="email"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
              Role
              <select
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:border-teal-400 focus:outline-none"
                value={form.role}
                onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
              >
                {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
              Team
              <select
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:border-teal-400 focus:outline-none"
                value={form.teamId}
                onChange={(e) => setForm((f) => ({ ...f, teamId: e.target.value }))}
              >
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>{t.name} ({t.track})</option>
                ))}
              </select>
            </label>
          </div>
          {formError && (
            <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-700">
              {formError}
            </p>
          )}
          <div className="mt-4 flex gap-3">
            <button className="solid-button" onClick={handleSave} disabled={formSaving}>
              {formSaving ? "Saving…" : editTarget ? "Save changes" : "Create user"}
            </button>
            <button className="ghost-button" onClick={closeForm}>Cancel</button>
          </div>
        </div>
      )}

      {/* ── CSV import ──────────────────────────────────────────────────── */}
      <div className="section-card p-6">
        <h2 className="mb-1 text-sm font-semibold text-ink">Bulk import from Azure AD</h2>
        <p className="mb-4 text-xs text-slate-500">
          Export users from Azure Portal → Azure AD → Users → Download users (CSV).
          Columns used: <code className="rounded bg-slate-100 px-1">displayName</code>,{" "}
          <code className="rounded bg-slate-100 px-1">userPrincipalName</code>,{" "}
          <code className="rounded bg-slate-100 px-1">department</code>,{" "}
          <code className="rounded bg-slate-100 px-1">jobTitle</code>.
          Department must match an existing team name.
        </p>
        <div className="flex items-center gap-3">
          <input ref={fileRef} type="file" accept=".csv" className="text-sm text-slate-600" />
          <button className="solid-button" onClick={handleImport} disabled={importing}>
            {importing ? "Importing…" : "Import CSV"}
          </button>
        </div>
        {importResult && (
          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm space-y-1">
            <p className="font-semibold text-ink">
              Import complete — <span className="text-teal-600">{importResult.imported} added/updated</span>
              {importResult.skipped > 0 && <span className="text-amber-600">, {importResult.skipped} skipped</span>}
            </p>
            {importResult.errors.map((e, i) => (
              <p key={i} className="text-xs text-red-600">{e}</p>
            ))}
          </div>
        )}
      </div>

      {/* ── Teams table ──────────────────────────────────────────────────── */}
      <div className="section-card overflow-hidden p-0">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-sm font-semibold text-ink">Teams ({teams.length})</h2>
          <button className="solid-button py-1.5 px-3 text-xs" onClick={openAddTeam}>+ Add team</button>
        </div>

        {isTeamFormOpen && (
          <div className="border-b border-slate-100 bg-slate-50 px-6 py-5">
            <h3 className="mb-4 text-sm font-semibold text-ink">
              {teamEditTarget ? `Edit — ${teamEditTarget.name}` : "New team"}
            </h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
                Team name
                <input
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:border-teal-400 focus:outline-none"
                  value={teamForm.name}
                  onChange={(e) => setTeamForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Alpha Squad"
                />
              </label>
              <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
                Track
                <select
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:border-teal-400 focus:outline-none"
                  value={teamForm.track}
                  onChange={(e) => setTeamForm((f) => ({ ...f, track: e.target.value }))}
                >
                  {TRACKS.map((tr) => <option key={tr} value={tr}>{tr}</option>)}
                </select>
              </label>
            </div>
            {teamFormError && (
              <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-700">
                {teamFormError}
              </p>
            )}
            <div className="mt-4 flex gap-3">
              <button className="solid-button" onClick={handleTeamSave} disabled={teamFormSaving}>
                {teamFormSaving ? "Saving…" : teamEditTarget ? "Save changes" : "Create team"}
              </button>
              <button className="ghost-button" onClick={closeTeamForm}>Cancel</button>
            </div>
          </div>
        )}

        {fetching ? (
          <p className="px-6 py-8 text-sm text-slate-500">Loading…</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  <th className="px-6 py-3 text-left">Name</th>
                  <th className="px-6 py-3 text-left">Track</th>
                  <th className="px-6 py-3 text-left">Users</th>
                  <th className="px-6 py-3 text-left">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {teams.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50 transition">
                    <td className="px-6 py-3 font-medium text-ink">{t.name}</td>
                    <td className="px-6 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${TRACK_BADGE[t.track] ?? "bg-slate-100 text-slate-600"}`}>
                        {t.track}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-slate-500">{t.userCount}</td>
                    <td className="px-6 py-3">
                      <div className="flex gap-2">
                        <button
                          className="rounded-lg border border-slate-200 px-2 py-1 text-xs font-medium hover:border-teal-300 transition"
                          onClick={() => openEditTeam(t)}
                        >
                          Edit
                        </button>
                        <button
                          className="rounded-lg border border-red-100 px-2 py-1 text-xs font-medium text-red-500 hover:border-red-300 transition"
                          onClick={() => handleTeamDelete(t)}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Users table ─────────────────────────────────────────────────── */}
      <div className="section-card overflow-hidden p-0">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-sm font-semibold text-ink">All users ({users.length})</h2>
        </div>
        {fetching ? (
          <p className="px-6 py-8 text-sm text-slate-500">Loading…</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  <th className="px-6 py-3 text-left">Name</th>
                  <th className="px-6 py-3 text-left">Email</th>
                  <th className="px-6 py-3 text-left">Role</th>
                  <th className="px-6 py-3 text-left">Team</th>
                  <th className="px-6 py-3 text-left">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50 transition">
                    <td className="px-6 py-3 font-medium text-ink">{u.name}</td>
                    <td className="px-6 py-3 text-slate-500">{u.email ?? <span className="italic text-slate-300">none (password login)</span>}</td>
                    <td className="px-6 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${ROLE_BADGE[u.role] ?? "bg-slate-100 text-slate-600"}`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-slate-500">{u.teamName}</td>
                    <td className="px-6 py-3">
                      <div className="flex gap-2">
                        <button
                          className="rounded-lg border border-slate-200 px-2 py-1 text-xs font-medium hover:border-teal-300 transition"
                          onClick={() => openEdit(u)}
                        >
                          Edit
                        </button>
                        <button
                          className="rounded-lg border border-red-100 px-2 py-1 text-xs font-medium text-red-500 hover:border-red-300 transition"
                          onClick={() => handleDelete(u)}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
