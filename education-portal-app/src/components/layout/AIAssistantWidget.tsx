"use client";

import { useMemo, useRef, useEffect, useState } from "react";

import { useAuth } from "@/components/auth/AuthProvider";
import { getAllVideos, type VideoWithContext } from "@/lib/training";
import { getYouTubeId } from "@/lib/youtube";
import type { AssistantResponse } from "@/types/api";

function getEmbedSrc(video: VideoWithContext): string | null {
  const provider = video.provider ?? "youtube";
  if (provider === "vimeo") {
    try {
      const parsed = new URL(video.url);
      const parts = parsed.pathname.split("/").filter(Boolean);
      const id = parts[0];
      const hash = parts[1] ?? null;
      if (!id) return null;
      return hash
        ? `https://player.vimeo.com/video/${id}?h=${hash}&title=0&byline=0&portrait=0`
        : `https://player.vimeo.com/video/${id}?title=0&byline=0&portrait=0`;
    } catch {
      return null;
    }
  }
  const id = getYouTubeId(video.url);
  return id ? `https://www.youtube.com/embed/${id}?rel=0&autoplay=1` : null;
}

const DEFAULT_MESSAGE =
  "This assistant focuses on mastering AI. For general questions, please ask Claude directly outside this portal.";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  response?: AssistantResponse;
  error?: string;
};

function RobotIcon({ size = 24 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Head */}
      <rect x="8" y="10" width="16" height="13" rx="3" fill="currentColor" opacity="0.95" />
      {/* Eyes */}
      <rect x="11" y="14" width="3" height="3" rx="1.5" fill="white" />
      <rect x="18" y="14" width="3" height="3" rx="1.5" fill="white" />
      {/* Mouth */}
      <rect x="12" y="19" width="8" height="1.5" rx="0.75" fill="white" opacity="0.8" />
      {/* Antenna */}
      <rect x="15" y="4" width="2" height="6" rx="1" fill="currentColor" opacity="0.95" />
      <circle cx="16" cy="3.5" r="2" fill="currentColor" opacity="0.95" />
      {/* Ears */}
      <rect x="4" y="13" width="4" height="5" rx="2" fill="currentColor" opacity="0.95" />
      <rect x="24" y="13" width="4" height="5" rx="2" fill="currentColor" opacity="0.95" />
      {/* Legs */}
      <rect x="11" y="23" width="3" height="4" rx="1.5" fill="currentColor" opacity="0.95" />
      <rect x="18" y="23" width="3" height="4" rx="1.5" fill="currentColor" opacity="0.95" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
      <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path
        d="M12.5 1.5L1 6.5l4.5 1.5 1.5 4.5 5.5-11z"
        fill="currentColor"
      />
    </svg>
  );
}

function AssistantMessageContent({
  response,
  msgId,
  allVideos,
  copiedId,
  expandedVideoId,
  onCopy,
  onToggleVideo,
}: {
  response: AssistantResponse;
  msgId: string;
  allVideos: VideoWithContext[];
  copiedId: string | null;
  expandedVideoId: string | null;
  onCopy: (text: string, id: string) => void;
  onToggleVideo: (videoId: string) => void;
}) {
  const suggestedVideo = useMemo(() => {
    if (!response.suggested_video_id) return null;
    return allVideos.find((v) => v.id === response.suggested_video_id) ?? null;
  }, [allVideos, response.suggested_video_id]);

  const embedSrc = suggestedVideo ? getEmbedSrc(suggestedVideo) : null;
  const isVideoOpen = suggestedVideo ? expandedVideoId === `${msgId}-${suggestedVideo.id}` : false;

  if (!response.is_claude_usage) {
    return <p className="text-slate-600 text-xs leading-relaxed">{response.summary || DEFAULT_MESSAGE}</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      {response.title && (
        <p className="text-[10px] font-semibold uppercase tracking-wider text-teal-700">
          {response.title}
        </p>
      )}
      <p className="text-xs text-slate-700 leading-relaxed">{response.summary}</p>

      {response.steps && response.steps.length > 0 && (
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
            Steps
          </p>
          <ul className="list-disc pl-4 text-xs text-slate-600 space-y-1">
            {response.steps.map((step, idx) => (
              <li key={`${step}-${idx}`}>{step}</li>
            ))}
          </ul>
        </div>
      )}

      {response.example_prompt && (
        <div>
          <div className="flex items-center justify-between mb-1">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              Example prompt
            </p>
            <button
              type="button"
              onClick={() => onCopy(response.example_prompt!, msgId)}
              className="text-[10px] font-semibold text-teal-600 hover:text-teal-700 transition"
            >
              {copiedId === msgId ? "Copied!" : "Copy"}
            </button>
          </div>
          <pre className="whitespace-pre-wrap rounded-lg border border-slate-200 bg-white p-2.5 text-[11px] text-slate-700 leading-relaxed overflow-x-auto">
            {response.example_prompt}
          </pre>
        </div>
      )}

      {response.safety_checks && response.safety_checks.length > 0 && (
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
            Safety checks
          </p>
          <ul className="list-disc pl-4 text-xs text-slate-600 space-y-1">
            {response.safety_checks.map((item, idx) => (
              <li key={`${item}-${idx}`}>{item}</li>
            ))}
          </ul>
        </div>
      )}

      {suggestedVideo && (
        <div className="rounded-xl border border-teal-100 bg-teal-50 overflow-hidden">
          <div className="p-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-teal-700 mb-1">
              Suggested video
            </p>
            {response.suggested_video_reason && (
              <p className="text-[11px] text-slate-500 mb-2 leading-relaxed">
                {response.suggested_video_reason}
              </p>
            )}
            <p className="text-xs font-semibold text-slate-700 leading-snug">
              {suggestedVideo.title}
            </p>
            <p className="text-[10px] text-slate-500 mt-0.5 mb-2">
              {suggestedVideo.stepTitle} · {suggestedVideo.topicTitle}
            </p>
            {embedSrc && (
              <button
                type="button"
                onClick={() => onToggleVideo(`${msgId}-${suggestedVideo.id}`)}
                className="flex items-center gap-1.5 rounded-lg bg-teal-600 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-teal-700 transition"
              >
                {isVideoOpen ? (
                  <>
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                      <rect x="2" y="1" width="2" height="8" rx="1" fill="currentColor" />
                      <rect x="6" y="1" width="2" height="8" rx="1" fill="currentColor" />
                    </svg>
                    Hide video
                  </>
                ) : (
                  <>
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                      <path d="M2 1.5l6 3.5-6 3.5V1.5z" fill="currentColor" />
                    </svg>
                    Watch in portal
                  </>
                )}
              </button>
            )}
          </div>

          {/* Inline video player */}
          {isVideoOpen && embedSrc && (
            <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
              <iframe
                className="absolute inset-0 h-full w-full"
                src={embedSrc}
                title={suggestedVideo.title}
                loading="lazy"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                {...(suggestedVideo.provider === "vimeo"
                  ? { referrerPolicy: "no-referrer" as const }
                  : {})}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function AIAssistantWidget() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedVideoId, setExpandedVideoId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const allVideos = useMemo(() => getAllVideos(), []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  if (!user) return null;

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;

    const userMsg: Message = {
      id: `u-${Date.now()}`,
      role: "user",
      content: trimmed,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: trimmed }),
      });
      const payload = await response.json();

      if (!response.ok) {
        setMessages((prev) => [
          ...prev,
          {
            id: `a-${Date.now()}`,
            role: "assistant",
            content: "",
            error: payload?.error ?? "Unable to reach the assistant.",
          },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            id: `a-${Date.now()}`,
            role: "assistant",
            content: "",
            response: payload as AssistantResponse,
          },
        ]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          role: "assistant",
          content: "",
          error: "Unable to reach the assistant. Please try again.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleCopy = async (promptText: string, msgId: string) => {
    try {
      await navigator.clipboard.writeText(promptText);
      setCopiedId(msgId);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // ignore clipboard errors
    }
  };

  const handleToggleVideo = (videoKey: string) => {
    setExpandedVideoId((prev) => (prev === videoKey ? null : videoKey));
  };

  return (
    <>
      {/* Chat panel */}
      <div
        className={`fixed bottom-24 right-6 z-50 flex flex-col rounded-2xl border border-slate-200 bg-white shadow-2xl transition-all duration-300 ${
          isOpen
            ? "pointer-events-auto h-[540px] w-[380px] opacity-100 translate-y-0"
            : "pointer-events-none h-[540px] w-[380px] opacity-0 translate-y-4"
        }`}
      >
        {/* Header */}
        <div className="flex shrink-0 items-center gap-3 rounded-t-2xl border-b border-slate-100 bg-gradient-to-r from-teal-50 to-white px-4 py-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-teal-600 text-white shadow-sm">
            <RobotIcon size={20} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-ink">AI Assistant</p>
            <p className="text-[11px] text-slate-500">Ask anything about AI usage</p>
          </div>
          <div className="flex items-center gap-1.5">
            {messages.length > 0 && (
              <button
                type="button"
                onClick={() => setMessages([])}
                className="flex h-7 w-7 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition text-[10px] font-semibold"
                title="Clear chat"
                aria-label="Clear chat"
              >
                ↺
              </button>
            )}
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="flex h-7 w-7 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
              aria-label="Close assistant"
            >
              <CloseIcon />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-4 py-4">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-teal-100 to-teal-50 text-teal-600 shadow-sm">
                <RobotIcon size={32} />
              </div>
              <p className="text-sm font-semibold text-ink">How can I help you?</p>
              <p className="text-xs text-slate-500 leading-relaxed max-w-[240px]">
                Describe what you want to do with AI. I&apos;ll guide you and suggest the best training video.
              </p>
              <div className="mt-1 flex flex-col gap-2 w-full">
                {[
                  "How do I write a better prompt?",
                  "I need to summarize a long document",
                  "How should I handle sensitive data?",
                ].map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => setInput(suggestion)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-left text-xs text-slate-600 hover:border-teal-300 hover:bg-teal-50 hover:text-teal-700 transition"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              {msg.role === "user" ? (
                <div className="max-w-[80%] rounded-2xl rounded-tr-sm bg-teal-600 px-4 py-2.5 text-xs text-white leading-relaxed shadow-sm">
                  {msg.content}
                </div>
              ) : (
                <div className="max-w-[92%] rounded-2xl rounded-tl-sm border border-slate-100 bg-slate-50 px-4 py-3">
                  {msg.error ? (
                    <p className="text-xs text-amber-700 leading-relaxed">{msg.error}</p>
                  ) : msg.response ? (
                    <AssistantMessageContent
                      response={msg.response}
                      msgId={msg.id}
                      allVideos={allVideos}
                      copiedId={copiedId}
                      expandedVideoId={expandedVideoId}
                      onCopy={handleCopy}
                      onToggleVideo={handleToggleVideo}
                    />
                  ) : null}
                </div>
              )}
            </div>
          ))}

          {isLoading && (
            <div className="flex justify-start">
              <div className="flex items-center gap-1.5 rounded-2xl rounded-tl-sm border border-slate-100 bg-slate-50 px-4 py-3">
                <span
                  className="h-2 w-2 rounded-full bg-teal-400 animate-bounce"
                  style={{ animationDelay: "0ms" }}
                />
                <span
                  className="h-2 w-2 rounded-full bg-teal-400 animate-bounce"
                  style={{ animationDelay: "150ms" }}
                />
                <span
                  className="h-2 w-2 rounded-full bg-teal-400 animate-bounce"
                  style={{ animationDelay: "300ms" }}
                />
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="shrink-0 border-t border-slate-100 px-3 py-3">
          <div className="flex items-end gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 focus-within:border-teal-400 transition shadow-sm">
            <textarea
              ref={inputRef}
              className="flex-1 resize-none bg-transparent text-xs text-slate-700 placeholder-slate-400 focus:outline-none leading-relaxed"
              placeholder="Ask something… (Enter to send)"
              rows={1}
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                e.target.style.height = "auto";
                e.target.style.height = `${Math.min(e.target.scrollHeight, 80)}px`;
              }}
              onKeyDown={handleKeyDown}
            />
            <button
              type="button"
              onClick={handleSend}
              disabled={isLoading || !input.trim()}
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-teal-600 text-white transition hover:bg-teal-700 disabled:opacity-40 disabled:cursor-not-allowed"
              aria-label="Send message"
            >
              <SendIcon />
            </button>
          </div>
          <p className="mt-1.5 text-center text-[9px] text-slate-400">
            Shift+Enter for new line
          </p>
        </div>
      </div>

      {/* Speech bubble label */}
      {!isOpen && (
        <div className="fixed bottom-8 right-24 z-50 flex items-center">
          <div className="relative rounded-2xl bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-lg ring-1 ring-slate-200 whitespace-nowrap">
            Ask your personal assistant
            {/* Arrow pointing right toward the FAB */}
            <span className="absolute right-[-8px] top-1/2 -translate-y-1/2 border-4 border-transparent border-l-white" />
          </div>
        </div>
      )}

      {/* FAB button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-teal-600 text-white shadow-xl transition-all hover:bg-teal-700 hover:scale-105 active:scale-95"
        aria-label={isOpen ? "Close AI assistant" : "Open AI assistant"}
      >
        {isOpen ? (
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path
              d="M2 2l14 14M16 2L2 16"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
          </svg>
        ) : (
          <RobotIcon size={26} />
        )}
      </button>
    </>
  );
}
