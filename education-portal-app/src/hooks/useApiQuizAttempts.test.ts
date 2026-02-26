import { renderHook, act, waitFor } from "@testing-library/react";
import { useApiQuizAttempts } from "./useApiQuizAttempts";

beforeEach(() => { global.fetch = jest.fn(); });
afterEach(() => jest.restoreAllMocks());

const ATTEMPT = { id: "a1", attemptNumber: 1, correctAnswers: 2, totalQuestions: 3, firstTryCorrect: 2, scoreEarned: 30, completedAt: "2024-01-01" };

describe("useApiQuizAttempts", () => {
  it("does not fetch when userId is undefined", () => {
    renderHook(() => useApiQuizAttempts("v1", undefined));
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("fetches attempts and best on mount when userId is provided", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      json: async () => ({ attempts: [ATTEMPT], best: ATTEMPT }),
    });
    const { result } = renderHook(() => useApiQuizAttempts("v1", "user-1"));
    await waitFor(() => expect(result.current.attempts).toHaveLength(1));
    expect(result.current.best?.scoreEarned).toBe(30);
  });

  it("handles empty attempts response", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      json: async () => ({ attempts: [], best: null }),
    });
    const { result } = renderHook(() => useApiQuizAttempts("v1", "user-1"));
    await waitFor(() => expect(result.current.attempts).toEqual([]));
    expect(result.current.best).toBeNull();
  });

  it("submitAttempt POSTs answers and reloads attempts", async () => {
    const submitted = { id: "a2", attemptNumber: 1, totalQuestions: 3, correctAnswers: 3, firstTryCorrect: 3, scoreEarned: 45, isFirstAttempt: true };
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({ json: async () => ({ attempts: [], best: null }) })  // initial
      .mockResolvedValueOnce({ ok: true, json: async () => ({ attempt: submitted }) }) // submit
      .mockResolvedValueOnce({ json: async () => ({ attempts: [ATTEMPT], best: ATTEMPT }) }); // reload

    const { result } = renderHook(() => useApiQuizAttempts("v1", "user-1"));
    await waitFor(() => expect(result.current.submitting).toBe(false));

    let attemptResult: typeof submitted | undefined;
    await act(async () => {
      attemptResult = await result.current.submitAttempt([]);
    });

    expect(attemptResult?.scoreEarned).toBe(45);
    await waitFor(() => expect(result.current.attempts).toHaveLength(1));
  });

  it("submitAttempt throws when response is not ok", async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({ json: async () => ({ attempts: [], best: null }) })
      .mockResolvedValueOnce({ ok: false });

    const { result } = renderHook(() => useApiQuizAttempts("v1", "user-1"));
    await waitFor(() => expect(result.current.submitting).toBe(false));

    await expect(act(async () => { await result.current.submitAttempt([]); })).rejects.toThrow();
    expect(result.current.submitting).toBe(false);
  });

  it("handles response where data.attempts is undefined (falls back to empty array)", async () => {
    // Triggers the `?? []` branch at line 26 in useApiQuizAttempts.ts
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      json: async () => ({ best: null }), // attempts field is missing
    });
    const { result } = renderHook(() => useApiQuizAttempts("v1", "user-1"));
    await waitFor(() => expect(result.current.attempts).toEqual([]));
    expect(result.current.best).toBeNull();
  });

  it("handles response where data.best is undefined (falls back to null)", async () => {
    // Triggers the `?? null` branch for best at line 27
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      json: async () => ({ attempts: [{ id: "a1", attemptNumber: 1, correctAnswers: 1, totalQuestions: 1, firstTryCorrect: 1, scoreEarned: 10, completedAt: null }] }),
      // best field is missing
    });
    const { result } = renderHook(() => useApiQuizAttempts("v1", "user-1"));
    await waitFor(() => expect(result.current.attempts).toHaveLength(1));
    expect(result.current.best).toBeNull();
  });
});
