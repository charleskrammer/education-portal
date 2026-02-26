"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "claude-training-quiz.v1";

export type VideoAttempt = {
  videoId: string;
  totalQuestions: number;
  correctAnswers: number;
  firstTryCorrect: number; // questions answered correctly on the very first click
  pointsEarned: number;
  completedAt: string; // ISO timestamp of last attempt
};

type QuizStore = {
  users: Record<string, Record<string, VideoAttempt>>;
};

const loadStore = (): QuizStore => {
  if (typeof window === "undefined") return { users: {} };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { users: {} };
    const parsed = JSON.parse(raw) as QuizStore;
    if (!parsed?.users || typeof parsed.users !== "object") return { users: {} };
    return parsed;
  } catch {
    return { users: {} };
  }
};

const saveStore = (store: QuizStore) => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
};

/** Read all attempts for all users — used by dashboard and manager views. */
export const loadAllQuizAttempts = (): Record<string, Record<string, VideoAttempt>> => {
  return loadStore().users;
};

/** Compute total score for a given user from stored attempts. */
export const getUserTotalScore = (userId: string): number => {
  const store = loadStore();
  const attempts = store.users[userId] ?? {};
  return Object.values(attempts).reduce((sum, a) => sum + a.pointsEarned, 0);
};

/** Compute total score for a given user considering only attempts BEFORE a cutoff date. */
export const getUserScoreBefore = (userId: string, before: Date): number => {
  const store = loadStore();
  const attempts = store.users[userId] ?? {};
  return Object.values(attempts)
    .filter((a) => new Date(a.completedAt) < before)
    .reduce((sum, a) => sum + a.pointsEarned, 0);
};

/** Returns Record<userId, totalScore> for all users who have attempts. */
export const getAllUserScores = (): Record<string, number> => {
  const store = loadStore();
  const result: Record<string, number> = {};
  for (const [userId, attempts] of Object.entries(store.users)) {
    result[userId] = Object.values(attempts).reduce((sum, a) => sum + a.pointsEarned, 0);
  }
  return result;
};

export const useQuizAttempts = (userId?: string) => {
  const [userAttempts, setUserAttempts] = useState<Record<string, VideoAttempt>>({});

  useEffect(() => {
    if (!userId) return;
    const store = loadStore();
    setUserAttempts(store.users[userId] ?? {});
  }, [userId]);

  const saveAttempt = useCallback(
    (attempt: VideoAttempt) => {
      if (!userId) return;
      const store = loadStore();
      if (!store.users[userId]) store.users[userId] = {};
      store.users[userId][attempt.videoId] = attempt;
      saveStore(store);
      setUserAttempts({ ...store.users[userId] });
    },
    [userId]
  );

  const totalScore = Object.values(userAttempts).reduce((sum, a) => sum + a.pointsEarned, 0);
  const totalCorrect = Object.values(userAttempts).reduce((sum, a) => sum + a.correctAnswers, 0);
  const totalQuestions = Object.values(userAttempts).reduce((sum, a) => sum + a.totalQuestions, 0);
  const quizzesCompleted = Object.keys(userAttempts).length;
  const accuracy = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0;

  return {
    userAttempts,
    saveAttempt,
    totalScore,
    quizzesCompleted,
    accuracy,
    totalQuestions,
    totalCorrect
  };
};
