import Link from "next/link";
import type { Step } from "@/lib/training";

export default function StepCard({ step }: { step: Step }) {
  const videoCount = step.topics.reduce(
    (total, topic) => total + topic.videos.length,
    0
  );

  return (
    <Link
      href={`/step/${step.id}`}
      className="group flex h-full flex-col gap-4 rounded-3xl border border-white/80 bg-white/70 p-6 shadow-card transition hover:-translate-y-1 hover:border-white"
    >
      <div className="flex items-center justify-between">
        <span className="pill">Step {step.id}</span>
        <span className="text-xs font-semibold text-slate-500">
          {step.time_estimate}
        </span>
      </div>
      <div>
        <h3 className="text-xl font-heading font-semibold text-ink transition group-hover:text-moss">
          {step.title}
        </h3>
        <p className="mt-2 text-sm text-slate-600">{step.summary}</p>
      </div>
      <div className="mt-auto flex flex-wrap gap-3 text-xs font-semibold text-slate-500">
        <span>{step.topics.length} topics</span>
        <span>{videoCount} videos</span>
      </div>
    </Link>
  );
}
