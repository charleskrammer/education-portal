/**
 * @jest-environment node
 */
import {
  sanitizeUser,
  authenticate,
  getTeamById,
  getUsersByTeam,
  users,
  teams,
} from "./auth";

describe("users and teams data", () => {
  it("has at least one user", () => {
    expect(users.length).toBeGreaterThan(0);
  });

  it("has at least one team", () => {
    expect(teams.length).toBeGreaterThan(0);
  });

  it("includes demo user alex", () => {
    const alex = users.find((u) => u.id === "alex");
    expect(alex).toBeDefined();
  });
});

describe("sanitizeUser", () => {
  it("strips the password field", () => {
    const raw = { id: "alex", name: "Alex", role: "learner" as const, teamId: "alpha", password: "secret" };
    const clean = sanitizeUser(raw);
    expect("password" in clean).toBe(false);
  });

  it("preserves id, name, role, teamId", () => {
    const raw = { id: "alex", name: "Alex Johnson", role: "learner" as const, teamId: "alpha", password: "x" };
    const clean = sanitizeUser(raw);
    expect(clean).toEqual({ id: "alex", name: "Alex Johnson", role: "learner", teamId: "alpha" });
  });
});

describe("authenticate", () => {
  it("returns user when credentials are correct", () => {
    const user = authenticate("alex", "claude123");
    expect(user).not.toBeNull();
    expect(user?.id).toBe("alex");
  });

  it("is case-insensitive for username", () => {
    const user = authenticate("ALEX", "claude123");
    expect(user).not.toBeNull();
    expect(user?.id).toBe("alex");
  });

  it("returns null for wrong password", () => {
    const user = authenticate("alex", "wrongpassword");
    expect(user).toBeNull();
  });

  it("returns null for unknown username", () => {
    const user = authenticate("nobody", "claude123");
    expect(user).toBeNull();
  });

  it("does not return the password field", () => {
    const user = authenticate("alex", "claude123");
    expect("password" in (user ?? {})).toBe(false);
  });

  it("returns manager role correctly", () => {
    const user = authenticate("sara", "manage123");
    expect(user?.role).toBe("manager");
  });
});

describe("getTeamById", () => {
  it("returns the team for a valid id", () => {
    const team = getTeamById("alpha");
    expect(team).toBeDefined();
    expect(team?.id).toBe("alpha");
    expect(team?.name).toBeTruthy();
  });

  it("returns undefined for an unknown team id", () => {
    expect(getTeamById("unknown-team")).toBeUndefined();
  });
});

describe("getUsersByTeam", () => {
  it("returns only users belonging to the given team", () => {
    const alphausers = getUsersByTeam("alpha");
    expect(alphausers.every((u) => u.teamId === "alpha")).toBe(true);
  });

  it("returns at least one user for the alpha team", () => {
    expect(getUsersByTeam("alpha").length).toBeGreaterThan(0);
  });

  it("returns empty array for a non-existent team", () => {
    expect(getUsersByTeam("ghost-team")).toEqual([]);
  });

  it("strips passwords from returned users", () => {
    const users = getUsersByTeam("alpha");
    for (const u of users) {
      expect("password" in u).toBe(false);
    }
  });
});
