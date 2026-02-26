/**
 * @jest-environment node
 */
jest.mock("@/lib/session", () => ({
  getSessionUser: jest.fn(),
}));

jest.mock("@/lib/db", () => ({
  db: {
    quizAttempt: {
      findMany: jest.fn(),
    },
  },
}));

import { NextRequest } from "next/server";
import { GET } from "./route";
import { getSessionUser } from "@/lib/session";
import { db } from "@/lib/db";

const mockGetSessionUser = getSessionUser as jest.Mock;
const mockFindMany = db.quizAttempt.findMany as jest.Mock;

const SESSION_USER = {
  id: "cuid-alex",
  externalId: "alex",
  name: "Alex Johnson",
  role: "learner",
  teamId: "alpha",
};

function makeRequest(videoId: string) {
  return new NextRequest(`http://localhost/api/quiz/${videoId}`);
}

afterEach(() => {
  jest.clearAllMocks();
});

describe("GET /api/quiz/[videoId]", () => {
  it("returns 401 when not authenticated", async () => {
    mockGetSessionUser.mockResolvedValue(null);
    const req = makeRequest("v1");
    const res = await GET(req, { params: { videoId: "v1" } });
    expect(res.status).toBe(401);
  });

  it("returns empty attempts and null best when no attempts exist", async () => {
    mockGetSessionUser.mockResolvedValue(SESSION_USER);
    mockFindMany.mockResolvedValue([]);

    const req = makeRequest("v1");
    const res = await GET(req, { params: { videoId: "v1" } });
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.attempts).toEqual([]);
    expect(data.best).toBeNull();
  });

  it("returns attempts and the best attempt by score", async () => {
    mockGetSessionUser.mockResolvedValue(SESSION_USER);

    const attempt1 = { id: "a1", attemptNumber: 1, correctAnswers: 1, totalQuestions: 3, firstTryCorrect: 1, scoreEarned: 10, completedAt: new Date() };
    const attempt2 = { id: "a2", attemptNumber: 2, correctAnswers: 3, totalQuestions: 3, firstTryCorrect: 0, scoreEarned: 30, completedAt: new Date() };
    mockFindMany.mockResolvedValue([attempt1, attempt2]);

    const req = makeRequest("v1");
    const res = await GET(req, { params: { videoId: "v1" } });
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.attempts).toHaveLength(2);
    // best is the attempt with highest scoreEarned
    expect(data.best.scoreEarned).toBe(30);
  });

  it("returns single attempt as both the list and the best", async () => {
    mockGetSessionUser.mockResolvedValue(SESSION_USER);

    const attempt = { id: "a1", attemptNumber: 1, correctAnswers: 2, totalQuestions: 3, firstTryCorrect: 2, scoreEarned: 30, completedAt: new Date() };
    mockFindMany.mockResolvedValue([attempt]);

    const req = makeRequest("s1v1");
    const res = await GET(req, { params: { videoId: "s1v1" } });
    const data = await res.json();
    expect(data.attempts).toHaveLength(1);
    expect(data.best.id).toBe("a1");
  });

  it("returns first attempt when scores are equal (reduce keep-first branch)", async () => {
    mockGetSessionUser.mockResolvedValue(SESSION_USER);

    // Two attempts with the identical scoreEarned — reduce should retain the first one visited
    const attempt1 = { id: "a1", attemptNumber: 1, correctAnswers: 2, totalQuestions: 3, firstTryCorrect: 0, scoreEarned: 20, completedAt: new Date("2024-01-01") };
    const attempt2 = { id: "a2", attemptNumber: 2, correctAnswers: 2, totalQuestions: 3, firstTryCorrect: 0, scoreEarned: 20, completedAt: new Date("2024-01-02") };
    mockFindMany.mockResolvedValue([attempt1, attempt2]);

    const req = makeRequest("v-tie");
    const res = await GET(req, { params: { videoId: "v-tie" } });
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.attempts).toHaveLength(2);
    // When scores are equal the reduce accumulator is kept (not replaced), so best is a1
    expect(data.best.id).toBe("a1");
  });
});
