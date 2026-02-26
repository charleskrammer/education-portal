"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { useAuth } from "@/components/AuthProvider";

const NavLink = ({ href, label }: { href: string; label: string }) => {
  const pathname = usePathname();
  const isActive = pathname === href || pathname.startsWith(href + "/");
  return (
    <Link
      className={`transition hover:text-moss ${isActive ? "text-moss" : "text-ink"}`}
      href={href}
    >
      {label}
    </Link>
  );
};

export default function NavBar() {
  const { user, logout } = useAuth();

  return (
    <nav className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6">
      <Link href={user ? "/dashboard" : "/"} className="text-lg font-heading font-semibold tracking-tight text-ink">
        AI Training Portal
      </Link>
      <div className="flex items-center gap-4 text-sm font-semibold">
        {user && (
          <>
            <NavLink href="/dashboard" label="My Dashboard" />
            <NavLink href="/path" label="Learning path" />
            <NavLink href="/assistant" label="AI Assistant" />
            {user.role === "manager" && (
              <Link href="/manager" className="font-bold text-red-600 hover:text-red-700 transition">
                Manager's Dashboard
              </Link>
            )}
          </>
        )}
      </div>
      <div className="flex items-center gap-3 text-xs font-semibold text-slate-600">
        {user ? (
          <>
            <span className="rounded-full bg-slate-100 px-3 py-1">
              {user.name} · {user.role}
            </span>
            <button type="button" className="ghost-button" onClick={logout}>
              Log out
            </button>
          </>
        ) : (
          <Link href="/login" className="ghost-button">
            Log in
          </Link>
        )}
      </div>
    </nav>
  );
}
