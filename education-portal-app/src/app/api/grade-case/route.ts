import { NextResponse } from "next/server";

const DEFAULT_MODEL = "claude-sonnet-4-20250514";

type GradeResult = {
  score: number;
  summary: string;
  strengths: string[];
  improvements: string[];
  sample_response?: string;
};

export async function POST(request: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Missing ANTHROPIC_API_KEY. Add it to your environment to enable grading." },
      { status: 400 }
    );
  }

  const body = await request.json();
  const topicTitle = body?.topicTitle ?? "";
  const videoTitle = body?.videoTitle ?? "";
  const caseStudy = body?.caseStudy ?? {};
  const userResponse = body?.userResponse ?? "";

  if (!topicTitle || !videoTitle || !caseStudy?.prompt || !userResponse) {
    return NextResponse.json({ error: "Incomplete case study payload." }, { status: 400 });
  }

  const model = process.env.ANTHROPIC_MODEL ?? DEFAULT_MODEL;

  const system =
    "You are a strict but supportive training coach. Grade the learner's response to the case study. " +
    "Return JSON only with: score (0-100), summary, strengths (array), improvements (array), sample_response (string).";

  const userPayload = {
    topicTitle,
    videoTitle,
    caseStudyTitle: caseStudy.title,
    caseStudyPrompt: caseStudy.prompt,
    expectedOutcome: caseStudy.expected_outcome,
    learnerResponse: userResponse
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
      max_tokens: 700,
      temperature: 0.2,
      system,
      messages: [{ role: "user", content: JSON.stringify(userPayload) }]
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    return NextResponse.json(
      { error: "Teacher agent request failed.", details: errorText },
      { status: 500 }
    );
  }

  const data = await response.json();
  const text =
    data?.content?.find((item: { type: string; text?: string }) => item.type === "text")
      ?.text ?? "";

  const parsed = safeJsonParse(text);
  if (!parsed) {
    return NextResponse.json(
      {
        error: "Unable to parse teacher agent response.",
        raw: text
      },
      { status: 500 }
    );
  }

  const result: GradeResult = {
    score: clampNumber(parsed.score ?? 0, 0, 100),
    summary: String(parsed.summary ?? ""),
    strengths: Array.isArray(parsed.strengths) ? parsed.strengths.map(String) : [],
    improvements: Array.isArray(parsed.improvements)
      ? parsed.improvements.map(String)
      : [],
    sample_response: parsed.sample_response ? String(parsed.sample_response) : undefined
  };

  return NextResponse.json(result);
}

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

const clampNumber = (value: number, min: number, max: number) => {
  if (Number.isNaN(value)) return min;
  return Math.min(Math.max(value, min), max);
};
