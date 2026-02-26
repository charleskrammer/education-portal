/**
 * @jest-environment node
 */
jest.mock("@/lib/session", () => ({
  getSessionUser: jest.fn(),
}));

jest.mock("@/lib/db", () => ({
  db: {
    videoProgress: {
      findMany: jest.fn(),
      upsert: jest.fn(),
    },
  },
}));

import { NextRequest } from "next/server";
import { GET, POST } from "./route";
import { getSessionUser } from "@/lib/session";
import { db } from "@/lib/db";

const mockGetSessionUser = getSessionUser as jest.Mock;
const mockFindMany = db.videoProgress.findMany as jest.Mock;
const mockUpsert = db.videoProgress.upsert as jest.Mock;

const SESSION_USER = {
  id: "cuid-alex",
  externalId: "alex",
  name: "Alex Johnson",
  role: "learner",
  teamId: "alpha",
};

afterEach(() => {
  jest.clearAllMocks();
});

describe("GET /api/progress", () => {
  it("returns 401 when not authenticated", async () => {
    mockGetSessionUser.mockResolvedValue(null);
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("returns empty videos object when no progress exists", async () => {
    mockGetSessionUser.mockResolvedValue(SESSION_USER);
    mockFindMany.mockResolvedValue([]);

    const res = await GET();
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.videos).toEqual({});
  });

  it("returns video progress keyed by videoId", async () => {
    mockGetSessionUser.mockResolvedValue(SESSION_USER);
    mockFindMany.mockResolvedValue([
      { videoId: "v1", done: true, completedAt: new Date("2024-01-01") },
      { videoId: "v2", done: false, completedAt: null },
    ]);

    const res = await GET();
    const data = await res.json();
    expect(data.videos.v1.done).toBe(true);
    expect(data.videos.v1.completedAt).toBeTruthy();
    expect(data.videos.v2.done).toBe(false);
    expect(data.videos.v2.completedAt).toBeUndefined();
  });
});

describe("POST /api/progress", () => {
  it("returns 401 when not authenticated", async () => {
    mockGetSessionUser.mockResolvedValue(null);
    const req = new NextRequest("http://localhost/api/progress", {
      method: "POST",
      body: JSON.stringify({ videoId: "v1", done: true }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("returns 400 when videoId is missing", async () => {
    mockGetSessionUser.mockResolvedValue(SESSION_USER);
    const req = new NextRequest("http://localhost/api/progress", {
      method: "POST",
      body: JSON.stringify({ done: true }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 when done is not a boolean", async () => {
    mockGetSessionUser.mockResolvedValue(SESSION_USER);
    const req = new NextRequest("http://localhost/api/progress", {
      method: "POST",
      body: JSON.stringify({ videoId: "v1", done: "yes" }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("upserts progress and returns the updated record", async () => {
    mockGetSessionUser.mockResolvedValue(SESSION_USER);
    mockUpsert.mockResolvedValue({ videoId: "v1", done: true });

    const req = new NextRequest("http://localhost/api/progress", {
      method: "POST",
      body: JSON.stringify({ videoId: "v1", done: true }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.videoId).toBe("v1");
    expect(data.done).toBe(true);
  });

  it("upserts with done=false and null completedAt", async () => {
    mockGetSessionUser.mockResolvedValue(SESSION_USER);
    mockUpsert.mockResolvedValue({ videoId: "v1", done: false });

    const req = new NextRequest("http://localhost/api/progress", {
      method: "POST",
      body: JSON.stringify({ videoId: "v1", done: false }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({ done: false, completedAt: null }),
      })
    );
  });
});
