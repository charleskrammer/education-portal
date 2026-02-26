"use client";

import type { Topic, Video } from "@/lib/training";
import VideoCard from "@/components/VideoCard";

export default function TopicSection({
  topic,
  isDone,
  stats,
  isVideoDone,
  activeVideoId,
  onToggleTopic,
  onToggleVideo,
  onLaunchAssessment
}: {
  topic: Topic;
  isDone: boolean;
  stats: { completed: number; total: number };
  isVideoDone: (video: Video) => boolean;
  activeVideoId: string | null;
  onToggleTopic: (next: boolean) => void;
  onToggleVideo: (video: Video, next: boolean) => void;
  onLaunchAssessment: (videoId: string) => void;
}) {
  return (
    <section id={`topic-${topic.id}`} className="section-card animate-rise p-6 scroll-mt-28">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h3 className="text-xl font-heading font-semibold text-ink">{topic.title}</h3>
          <p className="mt-2 text-sm text-slate-600">{topic.description}</p>
        </div>
        <div className="flex flex-col items-end gap-2 text-sm">
          <span className="text-xs font-semibold text-slate-500">
            {stats.completed}/{stats.total} videos completed
          </span>
          <button
            type="button"
            className={isDone ? "solid-button" : "ghost-button"}
            onClick={() => onToggleTopic(!isDone)}
          >
            {isDone ? "Topic completed" : "Mark topic as completed"}
          </button>
        </div>
      </div>
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {topic.videos.map((video) => (
          <VideoCard
            key={video.id}
            video={video}
            isDone={isVideoDone(video)}
            onToggle={(next) => onToggleVideo(video, next)}
            onLaunchAssessment={() => onLaunchAssessment(video.id)}
            assessment={video.quiz}
            isAssessmentOpen={activeVideoId === video.id}
            topicTitle={topic.title}
          />
        ))}
      </div>
    </section>
  );
}
