/**
 * @jest-environment node
 */
import bcrypt from "bcryptjs";
import { NextRequest } from "next/server";
import { POST } from "./route";

jest.mock("@/lib/db", () => ({
  db: {
    user: { findUnique: jest.fn() },
    session: { create: jest.fn() },
  },
}));

import { db } from "@/lib/db";

const mockFindUnique = db.user.findUnique as jest.Mock;
const mockCreate = db.session.create as jest.Mock;

async function makeRequest(body: unknown) {
  return new NextRequest("http://localhost/api/auth/login", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

const PASSWORD = "claude123";
let PASSWORD_HASH: string;

beforeAll(async () => {
  PASSWORD_HASH = await bcrypt.hash(PASSWORD, 10);
});

afterEach(() => {
  jest.clearAllMocks();
});

const MOCK_USER = {
  id: "cuid-alex",
  externalId: "alex",
  name: "Alex Johnson",
  role: "learner",
  teamId: "alpha",
  passwordHash: "",
  createdAt: new Date(),
};

describe("POST /api/auth/login", () => {
  it("returns 400 when username is missing", async () => {
    const req = await makeRequest({ password: "x" });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/username.*password/i);
  });

  it("returns 400 when password is missing", async () => {
    const req = await makeRequest({ username: "alex" });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 when body is empty", async () => {
    const req = await makeRequest({});
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 401 when user is not found", async () => {
    mockFindUnique.mockResolvedValue(null);
    const req = await makeRequest({ username: "nobody", password: "x" });
    const res = await POST(req);
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error).toMatch(/invalid credentials/i);
  });

  it("returns 401 when password is incorrect", async () => {
    const user = { ...MOCK_USER, passwordHash: PASSWORD_HASH };
    mockFindUnique.mockResolvedValue(user);
    const req = await makeRequest({ username: "alex", password: "wrongpass" });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("returns 200 with user payload and sets session cookie on valid credentials", async () => {
    const user = { ...MOCK_USER, passwordHash: PASSWORD_HASH };
    mockFindUnique.mockResolvedValue(user);
    mockCreate.mockResolvedValue({ id: "session-abc", userId: user.id, expiresAt: new Date() });

    const req = await makeRequest({ username: "alex", password: PASSWORD });
    const res = await POST(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.user.id).toBe("alex"); // externalId used as public id
    expect(data.user.name).toBe("Alex Johnson");
    expect(data.user.role).toBe("learner");

    // Session cookie should be set
    const cookieHeader = res.headers.get("set-cookie");
    expect(cookieHeader).toBeTruthy();
    expect(cookieHeader).toContain("sid=session-abc");
  });

  it("returns 500 on unexpected database error", async () => {
    mockFindUnique.mockRejectedValue(new Error("DB connection lost"));
    const req = await makeRequest({ username: "alex", password: PASSWORD });
    const res = await POST(req);
    expect(res.status).toBe(500);
  });
});
