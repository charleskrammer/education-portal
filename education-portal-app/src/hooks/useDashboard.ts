"use client";

import { useEffect, useState } from "react";
import type { GradeLabel } from "@/lib/scoring";

type Top10Entry = { id: string; name: string; score: number; position: number };

type DashboardKpis = {
  totalScore: number;
  quizzesCompleted: number;
  accuracy: number;
  streak: number;
  rank: number;
  total: number;
  percentile: number;
  grade: GradeLabel;
  top10: Top10Entry[];
};

const defaultKpis: DashboardKpis = {
  totalScore: 0,
  quizzesCompleted: 0,
  accuracy: 0,
  streak: 0,
  rank: 0,
  total: 0,
  percentile: 0,
  grade: "D",
  top10: [],
};

export function useDashboard(userId?: string) {
  const [kpis, setKpis] = useState<DashboardKpis>(defaultKpis);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) { setLoading(false); return; }
    fetch("/api/dashboard/kpis")
      .then((r) => r.json())
      .then((data: DashboardKpis) => setKpis(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [userId]);

  return { kpis, loading };
}
