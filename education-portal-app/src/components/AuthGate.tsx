"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

import { useAuth } from "@/components/AuthProvider";

const PUBLIC_ROUTES = new Set(["/", "/login"]);

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    if (!user && !PUBLIC_ROUTES.has(pathname)) {
      router.replace("/");
    }
  }, [isLoading, pathname, router, user]);

  if (PUBLIC_ROUTES.has(pathname)) {
    return <>{children}</>;
  }

  if (isLoading || !user) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="section-card p-6 text-center">
          <p className="text-sm text-slate-600">Checking your session…</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
