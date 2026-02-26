/**
 * @jest-environment node
 */

// Mock next/headers before any import that uses it
jest.mock("next/headers", () => ({
  cookies: jest.fn(),
}));

// Mock the Prisma client
jest.mock("@/lib/db", () => ({
  db: {
    session: {
      findUnique: jest.fn(),
      delete: jest.fn(),
    },
  },
}));

import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { getSessionUser, SESSION_COOKIE, SESSION_MAX_AGE } from "./session";

const mockCookies = cookies as jest.Mock;
const mockFindUnique = db.session.findUnique as jest.Mock;
const mockDelete = db.session.delete as jest.Mock;

const MOCK_USER = {
  id: "cuid-user-1",
  externalId: "alex",
  name: "Alex Johnson",
  role: "learner",
  teamId: "alpha",
  passwordHash: "hash",
  createdAt: new Date(),
};

const MOCK_SESSION = {
  id: "session-id-1",
  userId: "cuid-user-1",
  createdAt: new Date(),
  expiresAt: null, // never expires
  user: MOCK_USER,
};

afterEach(() => {
  jest.clearAllMocks();
});

describe("SESSION_COOKIE", () => {
  it("is the string 'sid'", () => {
    expect(SESSION_COOKIE).toBe("sid");
  });
});

describe("SESSION_MAX_AGE", () => {
  it("is 86400 (24 hours in seconds)", () => {
    expect(SESSION_MAX_AGE).toBe(86400);
  });
});

describe("getSessionUser", () => {
  it("returns null when no session cookie is present", async () => {
    mockCookies.mockReturnValue({ get: jest.fn().mockReturnValue(undefined) });

    const result = await getSessionUser();
    expect(result).toBeNull();
    expect(mockFindUnique).not.toHaveBeenCalled();
  });

  it("returns null when session is not found in the database", async () => {
    mockCookies.mockReturnValue({
      get: jest.fn().mockReturnValue({ value: "missing-session" }),
    });
    mockFindUnique.mockResolvedValue(null);

    const result = await getSessionUser();
    expect(result).toBeNull();
  });

  it("returns the session user when the session is valid", async () => {
    mockCookies.mockReturnValue({
      get: jest.fn().mockReturnValue({ value: MOCK_SESSION.id }),
    });
    mockFindUnique.mockResolvedValue(MOCK_SESSION);

    const result = await getSessionUser();
    expect(result).not.toBeNull();
    expect(result?.id).toBe("cuid-user-1");
    expect(result?.externalId).toBe("alex");
    expect(result?.name).toBe("Alex Johnson");
    expect(result?.role).toBe("learner");
    expect(result?.teamId).toBe("alpha");
  });

  it("returns null and deletes session when expiresAt is in the past", async () => {
    const expiredSession = {
      ...MOCK_SESSION,
      expiresAt: new Date(Date.now() - 1000), // 1 second ago
    };
    mockCookies.mockReturnValue({
      get: jest.fn().mockReturnValue({ value: "expired-session" }),
    });
    mockFindUnique.mockResolvedValue(expiredSession);
    mockDelete.mockResolvedValue({});

    const result = await getSessionUser();
    expect(result).toBeNull();
    expect(mockDelete).toHaveBeenCalledWith({ where: { id: "expired-session" } });
  });

  it("returns user when expiresAt is in the future", async () => {
    const futureSession = {
      ...MOCK_SESSION,
      expiresAt: new Date(Date.now() + 1_000_000), // far in the future
    };
    mockCookies.mockReturnValue({
      get: jest.fn().mockReturnValue({ value: "future-session" }),
    });
    mockFindUnique.mockResolvedValue(futureSession);

    const result = await getSessionUser();
    expect(result).not.toBeNull();
    expect(mockDelete).not.toHaveBeenCalled();
  });

  it("handles delete failure gracefully (does not throw)", async () => {
    const expiredSession = {
      ...MOCK_SESSION,
      expiresAt: new Date(Date.now() - 1000),
    };
    mockCookies.mockReturnValue({
      get: jest.fn().mockReturnValue({ value: "bad-session" }),
    });
    mockFindUnique.mockResolvedValue(expiredSession);
    mockDelete.mockRejectedValue(new Error("DB error"));

    // Should not throw even if delete fails
    await expect(getSessionUser()).resolves.toBeNull();
  });
});
