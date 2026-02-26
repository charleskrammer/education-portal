"use client";

import { useCallback, useEffect, useState } from "react";
import type { Step, Topic, Video } from "@/lib/training";

type VideoProgress = { done: boolean; completedAt?: string };
type ProgressState = { videos: Record<string, VideoProgress> };

const empty: ProgressState = { videos: {} };

export function useApiProgress(userId?: string) {
  const [state, setState] = useState<ProgressState>(empty);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) { setLoading(false); return; }
    fetch("/api/progress")
      .then((r) => r.json())
      .then((data: ProgressState) => setState(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [userId]);

  const setVideoDone = useCallback(async (video: Video, done: boolean) => {
    if (!userId) return;
    // Optimistic update
    setState((prev) => ({
      videos: {
        ...prev.videos,
        [video.id]: { done, completedAt: done ? new Date().toISOString() : undefined },
      },
    }));
    await fetch("/api/progress", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ videoId: video.id, done }),
    });
  }, [userId]);

  const setTopicDone = useCallback(async (topic: Topic, done: boolean) => {
    if (!userId) return;
    setState((prev) => {
      const videos = { ...prev.videos };
      for (const video of topic.videos) {
        videos[video.id] = {
          done,
          completedAt: done ? (videos[video.id]?.completedAt ?? new Date().toISOString()) : undefined,
        };
      }
      return { videos };
    });
    for (const video of topic.videos) {
      await fetch("/api/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videoId: video.id, done }),
      });
    }
  }, [userId]);

  const setStepDone = useCallback(async (step: Step, done: boolean) => {
    if (!userId) return;
    const allVideos = step.topics.flatMap((t) => t.videos);
    setState((prev) => {
      const videos = { ...prev.videos };
      for (const video of allVideos) {
        videos[video.id] = {
          done,
          completedAt: done ? (videos[video.id]?.completedAt ?? new Date().toISOString()) : undefined,
        };
      }
      return { videos };
    });
    for (const video of allVideos) {
      await fetch("/api/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videoId: video.id, done }),
      });
    }
  }, [userId]);

  const isVideoDone = (id: string) => Boolean(state.videos[id]?.done);
  const isTopicDone = (topic: Topic) =>
    topic.videos.length > 0 && topic.videos.every((v) => isVideoDone(v.id));
  const isStepDone = (step: Step) =>
    step.topics.length > 0 && step.topics.every((t) => isTopicDone(t));
  const statsForStep = (step: Step) => {
    const all = step.topics.flatMap((t) => t.videos);
    return { completed: all.filter((v) => isVideoDone(v.id)).length, total: all.length };
  };
  const statsForTopic = (topic: Topic) => ({
    completed: topic.videos.filter((v) => isVideoDone(v.id)).length,
    total: topic.videos.length,
  });

  return {
    state,
    loading,
    isVideoDone,
    isTopicDone,
    isStepDone,
    setVideoDone,
    setTopicDone,
    setStepDone,
    statsForStep,
    statsForTopic,
  };
}
