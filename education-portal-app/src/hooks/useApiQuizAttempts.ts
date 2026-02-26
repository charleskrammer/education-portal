"use client";

import { useCallback, useEffect, useState } from "react";
import type { AnswerPayload } from "@/lib/scoring/server";

export type AttemptSummary = {
  id: string;
  attemptNumber: number;
  correctAnswers: number;
  totalQuestions: number;
  firstTryCorrect: number;
  scoreEarned: number;
  completedAt: string | null;
};

export function useApiQuizAttempts(videoId: string, userId?: string) {
  const [attempts, setAttempts] = useState<AttemptSummary[]>([]);
  const [best, setBest] = useState<AttemptSummary | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const reload = useCallback(() => {
    if (!userId || !videoId) return;
    fetch(`/api/quiz/${videoId}`)
      .then((r) => r.json())
      .then((data: { attempts: AttemptSummary[]; best: AttemptSummary | null }) => {
        setAttempts(data.attempts ?? []);
        setBest(data.best ?? null);
      })
      .catch(() => {});
  }, [userId, videoId]);

  useEffect(() => { reload(); }, [reload]);

  const submitAttempt = useCallback(
    async (answers: AnswerPayload) => {
      setSubmitting(true);
      try {
        const res = await fetch("/api/quiz/submit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ videoId, answers }),
        });
        if (!res.ok) throw new Error("Submit failed");
        const data = await res.json();
        reload();
        return data.attempt as {
          id: string;
          attemptNumber: number;
          totalQuestions: number;
          correctAnswers: number;
          firstTryCorrect: number;
          scoreEarned: number;
          isFirstAttempt: boolean;
        };
      } finally {
        setSubmitting(false);
      }
    },
    [videoId, reload]
  );

  return { attempts, best, submitting, submitAttempt };
}
