"use client";

import Breadcrumbs from "@/components/Breadcrumbs";
import TopicSection from "@/components/TopicSection";
import type { Step, Video } from "@/lib/training";
import { useApiProgress } from "@/hooks/useApiProgress";
import { useState } from "react";
import { useAuth } from "@/components/AuthProvider";

export default function StepClient({ step }: { step: Step }) {
  const { user } = useAuth();
  const {
    isVideoDone,
    isTopicDone,
    isStepDone,
    setVideoDone,
    setTopicDone,
    setStepDone,
    statsForStep,
    statsForTopic,
  } = useApiProgress(user?.internalId);

  const stepStats = statsForStep(step);
  const stepDone = isStepDone(step);
  const [activeVideoId, setActiveVideoId] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-8">
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Learning path", href: "/path" },
          { label: `Step ${step.id}` }
        ]}
      />

      <section className="section-card p-6">
        <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          <div>
            <span className="pill">Step {step.id}</span>
            <h1 className="mt-3 text-3xl font-heading font-semibold text-ink">
              {step.title}
            </h1>
            <p className="mt-3 max-w-2xl text-sm text-slate-600">{step.summary}</p>
          </div>
          <div className="flex flex-col items-start gap-3 md:items-end">
            <span className="text-xs font-semibold text-slate-500">{step.time_estimate}</span>
            <span className="text-xs font-semibold text-slate-500">
              {stepStats.completed}/{stepStats.total} videos completed
            </span>
            <button
              type="button"
              className={stepDone ? "solid-button" : "ghost-button"}
              onClick={() => setStepDone(step, !stepDone)}
            >
              {stepDone ? "Step completed" : "Mark step as completed"}
            </button>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="section-card p-6">
          <h2 className="section-title">Learning objectives</h2>
          <ul className="mt-4 list-disc pl-5 text-sm text-slate-600">
            {step.objectives.map((objective) => (
              <li key={objective}>{objective}</li>
            ))}
          </ul>
        </div>
        <div className="section-card p-6">
          <h2 className="section-title">Practice checklist</h2>
          <ul className="mt-4 list-disc pl-5 text-sm text-slate-600">
            {step.checklist.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </section>

      <div className="flex flex-col gap-6">
        {step.topics.map((topic) => (
          <TopicSection
            key={topic.id}
            topic={topic}
            isDone={isTopicDone(topic)}
            stats={statsForTopic(topic)}
            isVideoDone={(video: Video) => isVideoDone(video.id)}
            activeVideoId={activeVideoId}
            onToggleTopic={(next) => setTopicDone(topic, next)}
            onToggleVideo={(video, next) => setVideoDone(video, next)}
            onLaunchAssessment={(videoId) => {
              setActiveVideoId(videoId);
              if (typeof window !== "undefined") {
                window.requestAnimationFrame(() => {
                  document
                    .getElementById(`video-${videoId}`)
                    ?.scrollIntoView({ behavior: "smooth", block: "start" });
                });
              }
            }}
          />
        ))}
      </div>
    </div>
  );
}
