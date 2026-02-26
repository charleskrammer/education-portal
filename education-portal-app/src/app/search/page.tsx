"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

import Breadcrumbs from "@/components/layout/Breadcrumbs";
import { getAllVideos } from "@/lib/training";

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const videos = useMemo(() => getAllVideos(), []);

  const results = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return videos;
    return videos.filter((video) => {
      return (
        video.title.toLowerCase().includes(term) ||
        video.channel.toLowerCase().includes(term) ||
        video.topicTitle.toLowerCase().includes(term) ||
        video.stepTitle.toLowerCase().includes(term)
      );
    });
  }, [query, videos]);

  return (
    <div className="flex flex-col gap-8">
      <Breadcrumbs items={[{ label: "Dashboard", href: "/dashboard" }, { label: "Search" }]} />

      <section className="section-card p-6">
        <h1 className="text-3xl font-heading font-semibold text-ink">Search</h1>
        <p className="mt-2 text-sm text-slate-600">
          Searches only the curated videos in this portal — no external sources.
          Results include all {videos.length} videos across all learning path steps.
        </p>
        <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-teal-200 bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-700">
          <span>Portal videos only</span>
          <span className="opacity-50">·</span>
          <span>Anthropic official channel</span>
        </div>
        <div className="mt-4 flex flex-col gap-3 md:flex-row">
          <input
            type="search"
            placeholder="e.g. artifacts, Claude Code, AI agents…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm focus:border-teal-400 focus:outline-none"
          />
          <div className="text-xs font-semibold text-slate-500 md:self-center">
            {results.length} result{results.length !== 1 ? "s" : ""}
          </div>
        </div>
      </section>

      <section className="grid gap-4">
        {results.map((video) => (
          <article
            key={video.id}
            className="section-card flex flex-col gap-3 p-5 md:flex-row md:items-center md:justify-between"
          >
            <div>
              <h2 className="text-base font-semibold text-ink">
                <Link
                  href={`/step/${video.stepId}`}
                  className="transition hover:text-moss"
                >
                  {video.title}
                </Link>
              </h2>
              <p className="text-xs font-semibold text-slate-500">{video.channel}</p>
              <p className="mt-2 text-sm text-slate-600">{video.reason}</p>
            </div>
            <div className="flex flex-col gap-2 text-xs text-slate-500 md:text-right">
              <span>{video.stepTitle}</span>
              <span>{video.topicTitle}</span>
              {video.duration !== "unknown" && <span>Duration: {video.duration}</span>}
              {video.views !== "unknown" && <span>Views: {video.views}</span>}
            </div>
          </article>
        ))}
        {results.length === 0 && query && (
          <div className="section-card p-8 text-center text-sm text-slate-500">
            No portal videos match &ldquo;{query}&rdquo;. Try a different keyword.
          </div>
        )}
      </section>
    </div>
  );
}
