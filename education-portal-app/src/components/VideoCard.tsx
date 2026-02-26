"use client";

import { useState } from "react";

import type { Video } from "@/lib/training";
import { getYouTubeId } from "@/lib/youtube";
import VideoAssessment from "@/components/VideoAssessment";
import type { VideoQuiz } from "@/lib/training";

function getVimeoId(url: string): string {
  try {
    const parsed = new URL(url);
    const parts = parsed.pathname.split("/").filter(Boolean);
    return parts[0] ?? "";
  } catch {
    return "";
  }
}

function getVimeoHash(url: string): string | null {
  try {
    const parsed = new URL(url);
    const parts = parsed.pathname.split("/").filter(Boolean);
    return parts[1] ?? null;
  } catch {
    return null;
  }
}

function getEmbedSrc(video: Video): string | null {
  const provider = video.provider ?? "youtube";
  if (provider === "vimeo") {
    const id = getVimeoId(video.url);
    if (!id) return null;
    const hash = getVimeoHash(video.url);
    return hash
      ? `https://player.vimeo.com/video/${id}?h=${hash}&title=0&byline=0&portrait=0`
      : `https://player.vimeo.com/video/${id}?title=0&byline=0&portrait=0`;
  }
  const id = getYouTubeId(video.url);
  return id ? `https://www.youtube.com/embed/${id}?rel=0` : null;
}

export default function VideoCard({
  video,
  isDone,
  onToggle,
  onLaunchAssessment,
  assessment,
  isAssessmentOpen,
  topicTitle
}: {
  video: Video;
  isDone: boolean;
  onToggle: (next: boolean) => void;
  onLaunchAssessment?: () => void;
  assessment?: VideoQuiz;
  isAssessmentOpen?: boolean;
  topicTitle: string;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const embedSrc = getEmbedSrc(video);
  const provider = video.provider ?? "youtube";

  return (
    <article
      id={`video-${video.id}`}
      className="flex h-full flex-col gap-4 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-slate-500">{video.level}</span>
          {video.duration !== "unknown" && (
            <span className="text-xs text-slate-500">Duration: {video.duration}</span>
          )}
          {video.views !== "unknown" && (
            <span className="text-xs text-slate-500">Views: {video.views}</span>
          )}
        </div>
        {embedSrc && (
          <button
            type="button"
            className="ghost-button"
            onClick={() => setIsExpanded((prev) => !prev)}
          >
            {isExpanded ? "Hide video" : "Watch in portal"}
          </button>
        )}
      </div>
      {isExpanded && embedSrc && (
        <div className="video-shell">
          <iframe
            className="video-frame"
            src={embedSrc}
            title={video.title}
            loading="lazy"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            {...(provider === "vimeo" ? { referrerPolicy: "no-referrer" as const } : {})}
          />
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold text-slate-500">Channel: {video.channel}</span>
      </div>
      <div className="flex-1">
        <h4 className="text-base font-semibold text-ink">{video.title}</h4>
        <p className="mt-3 text-sm text-slate-600">{video.reason}</p>
      </div>
      <div className="flex items-center justify-between gap-3">
        {video.published_date !== "unknown" && (
          <span className="text-xs text-slate-500">Published: {video.published_date}</span>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className={isDone ? "solid-button" : "ghost-button"}
            onClick={() => onToggle(!isDone)}
          >
            {isDone ? "Completed" : "Mark as completed"}
          </button>
          {isDone && onLaunchAssessment && (
            <button
              type="button"
              className="ghost-button"
              onClick={onLaunchAssessment}
            >
              Take the quiz
            </button>
          )}
        </div>
      </div>
      {isAssessmentOpen && assessment && (
        <VideoAssessment
          quiz={assessment}
          videoId={video.id}
          topicTitle={topicTitle}
          videoTitle={video.title}
        />
      )}
    </article>
  );
}
