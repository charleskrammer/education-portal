import { renderHook, waitFor } from "@testing-library/react";
import { useDashboard } from "./useDashboard";

const DEFAULT_KPIS = {
  totalScore: 0, quizzesCompleted: 0, accuracy: 0, streak: 0,
  rank: 0, total: 0, percentile: 0, grade: "D", top10: [],
};

beforeEach(() => { global.fetch = jest.fn(); });
afterEach(() => jest.restoreAllMocks());

describe("useDashboard", () => {
  it("does not fetch and returns defaults when userId is undefined", async () => {
    const { result } = renderHook(() => useDashboard(undefined));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(global.fetch).not.toHaveBeenCalled();
    expect(result.current.kpis.totalScore).toBe(0);
  });

  it("fetches and returns KPI data when userId is provided", async () => {
    const kpis = { ...DEFAULT_KPIS, totalScore: 150, rank: 2, grade: "B" };
    (global.fetch as jest.Mock).mockResolvedValueOnce({ json: async () => kpis });

    const { result } = renderHook(() => useDashboard("user-1"));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.kpis.totalScore).toBe(150);
    expect(result.current.kpis.grade).toBe("B");
  });

  it("handles fetch errors gracefully and keeps defaults", async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error("Network error"));
    const { result } = renderHook(() => useDashboard("user-1"));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.kpis.totalScore).toBe(0);
  });

  it("starts in loading=true state", () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({ json: async () => DEFAULT_KPIS });
    const { result } = renderHook(() => useDashboard("user-1"));
    expect(result.current.loading).toBe(true);
  });
});
