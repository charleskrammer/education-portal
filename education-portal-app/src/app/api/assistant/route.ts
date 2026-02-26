import { NextResponse } from "next/server";

import { getAllVideos } from "@/lib/training";

const DEFAULT_MODEL = "claude-sonnet-4-20250514";
const FALLBACK_MESSAGE =
  "This assistant focuses on mastering AI. For general questions, please ask Claude directly outside this portal.";

const STOPWORDS = new Set([
  "the",
  "and",
  "for",
  "with",
  "that",
  "this",
  "from",
  "into",
  "your",
  "you",
  "how",
  "what",
  "use",
  "using",
  "about",
  "need",
  "want",
  "help",
  "can",
  "a",
  "an",
  "to",
  "of",
  "in",
  "on",
  "is",
  "are"
]);

type AssistantResponse = {
  is_claude_usage: boolean;
  title: string;
  summary: string;
  steps: string[];
  example_prompt?: string;
  safety_checks?: string[];
  suggested_video_id?: string;
  suggested_video_reason?: string;
};

export async function POST(request: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Missing ANTHROPIC_API_KEY. Add it to your environment to enable the assistant." },
      { status: 400 }
    );
  }

  const body = await request.json();
  const question = String(body?.question ?? "").trim();
  if (!question) {
    return NextResponse.json({ error: "Question is required." }, { status: 400 });
  }

  const model = process.env.ANTHROPIC_MODEL ?? DEFAULT_MODEL;
  const videos = getAllVideos();
  const ranked = rankVideos(question, videos);
  const preferred = await filterEmbeddable(ranked.slice(0, 12));
  const pool = preferred.length ? preferred : ranked.slice(0, 8);

  const candidates = pool.slice(0, 6).map((video) => ({
    id: video.id,
    title: video.title,
    topic: video.topicTitle,
    step: video.stepTitle,
    official: Boolean(video.official),
    top_pick: Boolean(video.top_pick)
  }));

  const system =
    "You are a Claude training expert inside a corporate learning portal. " +
    "Answer ONLY questions about how to use Claude or master Claude features. " +
    "If the question is NOT about using Claude, set is_claude_usage to false and provide a short, polite redirect. " +
    "If it IS about using Claude, respond in a friendly, practical tone and return JSON only with: " +
    "is_claude_usage (boolean), title (short headline), summary (1-2 sentences), steps (3-5 bullets), " +
    "example_prompt (single prompt string), safety_checks (1-3 bullets), suggested_video_id (string), " +
    "suggested_video_reason (short sentence). Use the candidate list to choose the best video.";

  const userPayload = {
    question,
    candidates
  };

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json"
    },
    body: JSON.stringify({
      model,
      max_tokens: 600,
      temperature: 0.2,
      system,
      messages: [{ role: "user", content: JSON.stringify(userPayload) }]
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    return NextResponse.json(
      { error: "Assistant request failed.", details: errorText },
      { status: 500 }
    );
  }

  const data = await response.json();
  const text =
    data?.content?.find((item: { type: string; text?: string }) => item.type === "text")
      ?.text ?? "";

  const parsed = safeJsonParse(text);
  if (!parsed) {
    return NextResponse.json({
      is_claude_usage: true,
      title: "Here is a Claude-focused approach",
      summary: text || "Here are the next best steps to use Claude for your task.",
      steps: ["Clarify your goal", "Provide context", "Request a structured output"],
      example_prompt: "Provide a structured response with clear steps.",
      safety_checks: ["Avoid sharing sensitive data."],
      suggested_video_id: candidates[0]?.id,
      suggested_video_reason: candidates[0]
        ? `Recommended from the ${candidates[0].step} / ${candidates[0].topic} training.`
        : undefined
    } satisfies AssistantResponse);
  }

  const isClaudeUsage = Boolean(parsed.is_claude_usage);
  if (!isClaudeUsage) {
    return NextResponse.json({
      is_claude_usage: false,
      title: "Out of scope",
      summary: FALLBACK_MESSAGE,
      steps: [],
      example_prompt: undefined,
      safety_checks: []
    } satisfies AssistantResponse);
  }

  const suggestedId = String(parsed.suggested_video_id ?? "").trim();
  const validCandidate = candidates.find((candidate) => candidate.id === suggestedId);

  return NextResponse.json({
    is_claude_usage: true,
    title: String(parsed.title ?? "Claude guidance"),
    summary: String(parsed.summary ?? ""),
    steps: Array.isArray(parsed.steps) ? parsed.steps.map(String) : [],
    example_prompt: parsed.example_prompt ? String(parsed.example_prompt) : undefined,
    safety_checks: Array.isArray(parsed.safety_checks) ? parsed.safety_checks.map(String) : [],
    suggested_video_id: validCandidate?.id ?? candidates[0]?.id,
    suggested_video_reason: String(parsed.suggested_video_reason ?? "")
  } satisfies AssistantResponse);
}

const rankVideos = (question: string, videos: ReturnType<typeof getAllVideos>) => {
  const tokens = tokenize(question);

  return [...videos]
    .map((video) => {
      const haystack = `${video.title} ${video.topicTitle} ${video.stepTitle} ${video.channel}`.toLowerCase();
      let score = 0;
      tokens.forEach((token) => {
        if (haystack.includes(token)) score += 2;
      });
      if (video.top_pick) score += 2;
      if (video.official) score += 1;
      return { video, score };
    })
    .sort((a, b) => b.score - a.score)
    .map((item) => item.video);
};

const tokenize = (input: string) => {
  return input
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 2 && !STOPWORDS.has(token));
};

const safeJsonParse = (input: string) => {
  try {
    return JSON.parse(input);
  } catch {
    const start = input.indexOf("{");
    const end = input.lastIndexOf("}");
    if (start === -1 || end === -1 || end <= start) return null;
    try {
      return JSON.parse(input.slice(start, end + 1));
    } catch {
      return null;
    }
  }
};

const filterEmbeddable = async (videos: ReturnType<typeof getAllVideos>) => {
  const checks = await Promise.allSettled(
    videos.map((video) => checkOEmbed(video.url))
  );
  return videos.filter((_, idx) => checks[idx].status === "fulfilled" && (checks[idx] as PromiseFulfilledResult<boolean>).value);
};

const checkOEmbed = async (url: string) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 2500);
  try {
    const response = await fetch(
      `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`,
      { signal: controller.signal }
    );
    return response.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
};
