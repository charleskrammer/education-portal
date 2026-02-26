"use client";

import { useEffect, useMemo, useState } from "react";
import type { Step, Topic, Video } from "@/lib/training";

const STORAGE_KEY = "claude-training-progress.v3";
const LEGACY_KEY = "claude-training-progress.v2";

type VideoProgress = {
  done: boolean;
  completedAt?: string;
};

type ProgressState = {
  videos: Record<string, VideoProgress>;
};

type ProgressStore = {
  users: Record<string, ProgressState>;
};

const emptyState: ProgressState = { videos: {} };

const normalizeState = (state: unknown): ProgressState => {
  if (!state || typeof state !== "object") return emptyState;
  const rawVideos = (state as ProgressState).videos;
  if (!rawVideos || typeof rawVideos !== "object") return emptyState;

  const normalized: Record<string, VideoProgress> = {};
  Object.entries(rawVideos).forEach(([id, value]) => {
    if (typeof value === "boolean") {
      normalized[id] = { done: value };
      return;
    }
    if (value && typeof value === "object" && "done" in value) {
      const videoValue = value as VideoProgress;
      normalized[id] = { done: Boolean(videoValue.done), completedAt: videoValue.completedAt };
    }
  });
  return { videos: normalized };
};

const loadStore = (): ProgressStore => {
  if (typeof window === "undefined") {
    return { users: {} };
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { users: {} };
    const parsed = JSON.parse(raw) as ProgressStore;
    if (!parsed || typeof parsed !== "object" || !parsed.users) {
      return { users: {} };
    }
    return parsed;
  } catch {
    return { users: {} };
  }
};

const saveStore = (store: ProgressStore) => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
};

const loadState = (userId?: string): ProgressState => {
  if (!userId || typeof window === "undefined") {
    return emptyState;
  }

  const store = loadStore();
  const existing = store.users[userId];
  if (existing) {
    return normalizeState(existing);
  }

  try {
    const legacyRaw = window.localStorage.getItem(LEGACY_KEY);
    if (!legacyRaw) return emptyState;
    const legacyParsed = JSON.parse(legacyRaw) as ProgressState;
    const normalized = normalizeState(legacyParsed);
    store.users[userId] = normalized;
    saveStore(store);
    return normalized;
  } catch {
    return emptyState;
  }
};

const saveState = (userId: string, state: ProgressState) => {
  if (typeof window === "undefined") return;
  const store = loadStore();
  store.users[userId] = state;
  saveStore(store);
};

const updateVideoMap = (
  current: ProgressState,
  videoId: string,
  value: boolean
): ProgressState => {
  const currentEntry = current.videos[videoId];
  const completedAt =
    value && !currentEntry?.completedAt ? new Date().toISOString() : currentEntry?.completedAt;
  const videos = {
    ...current.videos,
    [videoId]: { done: value, completedAt: value ? completedAt : undefined }
  };
  return { videos };
};

export const loadAllUserProgress = (): Record<string, ProgressState> => {
  const store = loadStore();
  const normalized: Record<string, ProgressState> = {};
  Object.entries(store.users).forEach(([userId, state]) => {
    normalized[userId] = normalizeState(state);
  });
  return normalized;
};

export const useProgress = (userId?: string) => {
  const [state, setState] = useState<ProgressState>(emptyState);

  useEffect(() => {
    setState(loadState(userId));
  }, [userId]);

  const getVideoProgress = (id: string): VideoProgress => {
    return state.videos[id] ?? { done: false };
  };

  const isVideoDone = (id: string) => Boolean(state.videos[id]?.done);

  const isTopicDone = (topic: Topic) =>
    topic.videos.length > 0 && topic.videos.every((video) => isVideoDone(video.id));

  const isStepDone = (step: Step) =>
    step.topics.length > 0 && step.topics.every((topic) => isTopicDone(topic));

  const setVideoDone = (video: Video, value: boolean) => {
    if (!userId) return;
    const next = updateVideoMap(state, video.id, value);
    setState(next);
    saveState(userId, next);
  };

  const setTopicDone = (topic: Topic, value: boolean) => {
    if (!userId) return;
    const nextVideos: Record<string, VideoProgress> = { ...state.videos };
    topic.videos.forEach((video) => {
      const currentEntry = nextVideos[video.id];
      const completedAt =
        value && !currentEntry?.completedAt ? new Date().toISOString() : currentEntry?.completedAt;
      nextVideos[video.id] = { done: value, completedAt: value ? completedAt : undefined };
    });
    const next = { videos: nextVideos };
    setState(next);
    saveState(userId, next);
  };

  const setStepDone = (step: Step, value: boolean) => {
    if (!userId) return;
    const nextVideos: Record<string, VideoProgress> = { ...state.videos };
    step.topics.forEach((topic) => {
      topic.videos.forEach((video) => {
        const currentEntry = nextVideos[video.id];
        const completedAt =
          value && !currentEntry?.completedAt
            ? new Date().toISOString()
            : currentEntry?.completedAt;
        nextVideos[video.id] = { done: value, completedAt: value ? completedAt : undefined };
      });
    });
    const next = { videos: nextVideos };
    setState(next);
    saveState(userId, next);
  };

  const statsForStep = (step: Step) => {
    const allVideos = step.topics.flatMap((topic) => topic.videos);
    const completed = allVideos.filter((video) => isVideoDone(video.id)).length;
    return {
      completed,
      total: allVideos.length
    };
  };

  const statsForTopic = (topic: Topic) => {
    const completed = topic.videos.filter((video) => isVideoDone(video.id)).length;
    return {
      completed,
      total: topic.videos.length
    };
  };

  return {
    state,
    getVideoProgress,
    isVideoDone,
    isTopicDone,
    isStepDone,
    setVideoDone,
    setTopicDone,
    setStepDone,
    statsForStep,
    statsForTopic
  };
};
