/**
 * @jest-environment node
 */
import { POST } from "./route";

describe("POST /api/auth/logout", () => {
  it("returns 200 with ok=true", async () => {
    const res = await POST(undefined as never);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);
  });

  it("clears the session cookie (sets it to empty with maxAge=0)", async () => {
    const res = await POST(undefined as never);
    const cookie = res.headers.get("set-cookie");
    expect(cookie).toContain("sid=");
    expect(cookie).toContain("Max-Age=0");
  });
});
