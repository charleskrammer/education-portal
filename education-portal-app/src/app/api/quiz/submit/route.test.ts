/**
 * @jest-environment node
 */
jest.mock("@/lib/session", () => ({
  getSessionUser: jest.fn(),
  SESSION_COOKIE: "sid",
}));

jest.mock("@/lib/db", () => ({
  db: {
    quizAttempt: {
      count: jest.fn(),
      create: jest.fn(),
    },
  },
}));

import { NextRequest } from "next/server";
import { POST } from "./route";
import { getSessionUser } from "@/lib/session";
import { db } from "@/lib/db";
import { getAllVideos } from "@/lib/training";

const mockGetSessionUser = getSessionUser as jest.Mock;
const mockCount = db.quizAttempt.count as jest.Mock;
const mockCreate = db.quizAttempt.create as jest.Mock;

// Pick a real video that has a quiz from the training data
const realVideo = getAllVideos().find((v) => v.quiz && v.quiz.questions.length > 0)!;
const VIDEO_ID = realVideo.id;
const QUESTIONS = realVideo.quiz!.questions;

const SESSION_USER = {
  id: "cuid-alex",
  externalId: "alex",
  name: "Alex Johnson",
  role: "learner",
  teamId: "alpha",
};

function makeRequest(body: unknown, cookie = "session-cookie-1") {
  return new NextRequest("http://localhost/api/quiz/submit", {
    method: "POST",
    body: JSON.stringify(body),
    headers: {
      "Content-Type": "application/json",
      Cookie: `sid=${cookie}`,
    },
  });
}

/** Build an answers array where every question is answered correctly on first try */
function perfectAnswers() {
  return QUESTIONS.map((q) => ({
    questionId: q.id,
    firstSelectedIndex: q.answerIndex,
    finalSelectedIndex: q.answerIndex,
  }));
}

afterEach(() => {
  jest.clearAllMocks();
});

describe("POST /api/quiz/submit", () => {
  it("returns 401 when not authenticated", async () => {
    mockGetSessionUser.mockResolvedValue(null);
    const req = makeRequest({ videoId: VIDEO_ID, answers: [] });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("returns 401 when no session cookie present", async () => {
    mockGetSessionUser.mockResolvedValue(SESSION_USER);
    // Make a request without a cookie header so sessionId cookie is missing
    const req = new NextRequest("http://localhost/api/quiz/submit", {
      method: "POST",
      body: JSON.stringify({ videoId: VIDEO_ID, answers: [] }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("returns 400 when videoId is missing", async () => {
    mockGetSessionUser.mockResolvedValue(SESSION_USER);
    const req = makeRequest({ answers: [] });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 when answers is not an array", async () => {
    mockGetSessionUser.mockResolvedValue(SESSION_USER);
    const req = makeRequest({ videoId: VIDEO_ID, answers: "not-array" });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 404 when videoId does not exist in training data", async () => {
    mockGetSessionUser.mockResolvedValue(SESSION_USER);
    const req = makeRequest({ videoId: "nonexistent-video", answers: [] });
    const res = await POST(req);
    expect(res.status).toBe(404);
  });

  it("returns 200 with first-attempt bonus on first submission", async () => {
    mockGetSessionUser.mockResolvedValue(SESSION_USER);
    mockCount.mockResolvedValue(0); // no previous attempts
    mockCreate.mockResolvedValue({
      id: "attempt-1",
      userId: SESSION_USER.id,
      quizId: VIDEO_ID,
      attemptNumber: 1,
      completedAt: new Date(),
      totalQuestions: QUESTIONS.length,
      correctAnswers: QUESTIONS.length,
      firstTryCorrect: QUESTIONS.length,
      scoreEarned: QUESTIONS.length * 15,
    });

    const req = makeRequest({ videoId: VIDEO_ID, answers: perfectAnswers() });
    const res = await POST(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.attempt.isFirstAttempt).toBe(true);
    expect(data.attempt.attemptNumber).toBe(1);
    expect(data.attempt.scoreEarned).toBeGreaterThan(0);
  });

  it("returns 200 without first-attempt bonus on subsequent submissions", async () => {
    mockGetSessionUser.mockResolvedValue(SESSION_USER);
    mockCount.mockResolvedValue(1); // 1 previous attempt
    mockCreate.mockResolvedValue({
      id: "attempt-2",
      userId: SESSION_USER.id,
      quizId: VIDEO_ID,
      attemptNumber: 2,
      completedAt: new Date(),
      totalQuestions: QUESTIONS.length,
      correctAnswers: QUESTIONS.length,
      firstTryCorrect: 0,
      scoreEarned: QUESTIONS.length * 10,
    });

    const req = makeRequest({ videoId: VIDEO_ID, answers: perfectAnswers() });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.attempt.isFirstAttempt).toBe(false);
  });

  it("returns 409 on double-submit (unique constraint violation)", async () => {
    mockGetSessionUser.mockResolvedValue(SESSION_USER);
    mockCount.mockResolvedValue(0);
    const prismaError = Object.assign(new Error("Unique constraint failed"), { code: "P2002" });
    mockCreate.mockRejectedValue(prismaError);

    const req = makeRequest({ videoId: VIDEO_ID, answers: perfectAnswers() });
    const res = await POST(req);
    expect(res.status).toBe(409);
    const data = await res.json();
    expect(data.error).toMatch(/already recorded/i);
  });

  it("returns 500 on unexpected database error", async () => {
    mockGetSessionUser.mockResolvedValue(SESSION_USER);
    mockCount.mockResolvedValue(0);
    mockCreate.mockRejectedValue(new Error("DB crash"));

    const req = makeRequest({ videoId: VIDEO_ID, answers: perfectAnswers() });
    const res = await POST(req);
    expect(res.status).toBe(500);
  });
});
