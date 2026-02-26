"use client";

import { useMemo, useState } from "react";

import Breadcrumbs from "@/components/layout/Breadcrumbs";
import VideoCard from "@/components/training/VideoCard";
import { useAuth } from "@/components/auth/AuthProvider";
import { getAllVideos } from "@/lib/training";
import { useApiProgress } from "@/hooks/useApiProgress";

const DEFAULT_MESSAGE =
  "This assistant focuses on mastering AI. For general questions, please ask Claude directly outside this portal.";

import type { AssistantResponse } from "@/types/api";

export default function AssistantPage() {
  const { user } = useAuth();
  const { isVideoDone, setVideoDone } = useApiProgress(user?.internalId);
  const allVideos = useMemo(() => getAllVideos(), []);

  const [question, setQuestion] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<AssistantResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeVideoId, setActiveVideoId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const suggestedVideo = useMemo(() => {
    if (!result?.suggested_video_id) return null;
    return allVideos.find((video) => video.id === result.suggested_video_id) ?? null;
  }, [allVideos, result?.suggested_video_id]);

  const handleAsk = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!question.trim()) return;
    setIsLoading(true);
    setError(null);
    setResult(null);
    setActiveVideoId(null);
    setCopied(false);

    try {
      const response = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: question.trim() })
      });
      const payload = await response.json();
      if (!response.ok) {
        setError(payload?.error ?? "Unable to reach the assistant.");
      } else {
        setResult(payload as AssistantResponse);
      }
    } catch {
      setError("Unable to reach the assistant. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!result?.example_prompt) return;
    try {
      await navigator.clipboard.writeText(result.example_prompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="flex flex-col gap-8">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "AI assistant" }]} />

      <section className="section-card p-6">
        <h1 className="text-3xl font-heading font-semibold text-ink">AI assistant</h1>
        <p className="mt-2 text-sm text-slate-600">
          Describe what you want to do with Claude. The assistant will answer and suggest the best
          training video.
        </p>
        <form className="mt-5 grid gap-3" onSubmit={handleAsk}>
          <textarea
            className="min-h-[140px] rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm focus:border-teal-400 focus:outline-none"
            placeholder="Example: I need to summarize a contract and flag risks. How should I prompt Claude?"
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
          />
          <div className="flex flex-wrap items-center gap-3">
            <button type="submit" className="solid-button" disabled={isLoading}>
              {isLoading ? "Thinking..." : "Ask the assistant"}
            </button>
            <button
              type="button"
              className="ghost-button"
              onClick={() => {
                setQuestion("");
                setResult(null);
                setError(null);
                setCopied(false);
              }}
            >
              Reset
            </button>
          </div>
        </form>
      </section>

      {error && (
        <section className="section-card p-6">
          <p className="text-sm text-amber-700">{error}</p>
        </section>
      )}

      {result && (
        <section className="section-card p-6">
          <h2 className="section-title">Assistant response</h2>
          {result.is_claude_usage ? (
            <div className="mt-4 grid gap-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {result.title || "Quick answer"}
                </p>
                <p className="mt-2 text-sm text-slate-700">{result.summary}</p>
              </div>

              {result.steps?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Recommended steps
                  </p>
                  <ul className="mt-2 list-disc pl-5 text-sm text-slate-600">
                    {result.steps.map((step, idx) => (
                      <li key={`${step}-${idx}`}>{step}</li>
                    ))}
                  </ul>
                </div>
              )}

              {result.example_prompt && (
                <div>
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Example prompt
                    </p>
                    <button type="button" className="ghost-button" onClick={handleCopy}>
                      {copied ? "Copied" : "Copy"}
                    </button>
                  </div>
                  <pre className="mt-2 whitespace-pre-wrap rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                    {result.example_prompt}
                  </pre>
                </div>
              )}

              {result.safety_checks && result.safety_checks.length > 0 && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Safety check
                  </p>
                  <ul className="mt-2 list-disc pl-5 text-sm text-slate-600">
                    {result.safety_checks.map((item, idx) => (
                      <li key={`${item}-${idx}`}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}

              {result.suggested_video_reason && (
                <p className="text-xs text-slate-500">{result.suggested_video_reason}</p>
              )}
            </div>
          ) : (
            <p className="mt-3 text-sm text-slate-600">
              {result.summary || DEFAULT_MESSAGE}
            </p>
          )}
        </section>
      )}

      {result?.is_claude_usage && suggestedVideo && (
        <section className="section-card p-6">
          <div className="flex items-center justify-between">
            <h2 className="section-title">Suggested video</h2>
            <span className="text-xs font-semibold text-slate-500">
              {suggestedVideo.stepTitle} · {suggestedVideo.topicTitle}
            </span>
          </div>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <VideoCard
              video={suggestedVideo}
              isDone={isVideoDone(suggestedVideo.id)}
              onToggle={(next) => setVideoDone(suggestedVideo, next)}
              onLaunchAssessment={() => setActiveVideoId(suggestedVideo.id)}
              assessment={suggestedVideo.quiz}
              isAssessmentOpen={activeVideoId === suggestedVideo.id}
              topicTitle={suggestedVideo.topicTitle}
            />
          </div>
        </section>
      )}
    </div>
  );
}
