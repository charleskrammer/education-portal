"use client";

import { createContext, useContext, useEffect, useState } from "react";

export type AuthUser = {
  id: string;
  internalId: string;
  name: string;
  role: "learner" | "manager" | "admin";
  teamId: string;
};

type AuthContextValue = {
  user: AuthUser | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Restore session on mount
  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data: { user: AuthUser | null }) => {
        if (data.user) setUser(data.user);
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  // Auto-logout at 23:59:00 every day
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const scheduleLogout = () => {
      const now = new Date();
      const target = new Date(now);
      target.setHours(23, 59, 0, 0);
      if (target <= now) target.setDate(target.getDate() + 1);
      const ms = target.getTime() - now.getTime();
      timer = setTimeout(async () => {
        await logout();
        scheduleLogout();
      }, ms);
    };
    scheduleLogout();
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = async (username: string, password: string) => {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json() as { user?: AuthUser; error?: string };
    if (!res.ok) return { ok: false, error: data.error ?? "Login failed" };
    setUser(data.user!);
    return { ok: true };
  };

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
};
