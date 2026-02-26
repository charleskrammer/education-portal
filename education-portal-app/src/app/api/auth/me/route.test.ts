/**
 * @jest-environment node
 */
jest.mock("@/lib/session", () => ({
  getSessionUser: jest.fn(),
}));

import { GET } from "./route";
import { getSessionUser } from "@/lib/session";

const mockGetSessionUser = getSessionUser as jest.Mock;

afterEach(() => {
  jest.clearAllMocks();
});

describe("GET /api/auth/me", () => {
  it("returns { user: null } when there is no active session", async () => {
    mockGetSessionUser.mockResolvedValue(null);
    const res = await GET();
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.user).toBeNull();
  });

  it("returns the current user when session is valid", async () => {
    mockGetSessionUser.mockResolvedValue({
      id: "cuid-alex",
      externalId: "alex",
      name: "Alex Johnson",
      role: "learner",
      teamId: "alpha",
    });

    const res = await GET();
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.user.id).toBe("alex");        // externalId exposed as public id
    expect(data.user.internalId).toBe("cuid-alex");
    expect(data.user.name).toBe("Alex Johnson");
    expect(data.user.role).toBe("learner");
    expect(data.user.teamId).toBe("alpha");
  });
});
