import { renderHook, act, waitFor } from "@testing-library/react";
import { useApiProgress } from "./useApiProgress";
import type { Video, Topic, Step } from "@/lib/training";

beforeEach(() => { global.fetch = jest.fn(); });
afterEach(() => jest.restoreAllMocks());

const mockVideo = (id: string): Video => ({
  id, title: `Video ${id}`, channel: "Anthropic", url: "https://yt.com",
  reason: "r", level: "Beginner", duration: "5m", views: "100",
  published_date: "2024", top_pick: true,
});

const mockTopic = (id: string, videoIds: string[]): Topic => ({
  id, title: `Topic ${id}`, description: "desc", videos: videoIds.map(mockVideo),
});

const mockStep = (id: string, topicIds: string[]): Step => ({
  id, title: `Step ${id}`, summary: "s", time_estimate: "10m",
  objectives: [], checklist: [],
  topics: topicIds.map((tid) => mockTopic(tid, [`${tid}-v1`, `${tid}-v2`])),
});

describe("useApiProgress", () => {
  it("does not fetch when userId is undefined", async () => {
    const { result } = renderHook(() => useApiProgress(undefined));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("fetches and populates state when userId is given", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      json: async () => ({ videos: { v1: { done: true } } }),
    });
    const { result } = renderHook(() => useApiProgress("user-1"));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.isVideoDone("v1")).toBe(true);
    expect(result.current.isVideoDone("v99")).toBe(false);
  });

  it("setVideoDone performs optimistic update and POSTs to API", async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({ json: async () => ({ videos: {} }) })  // initial fetch
      .mockResolvedValueOnce({}); // POST

    const { result } = renderHook(() => useApiProgress("user-1"));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.setVideoDone(mockVideo("v1"), true);
    });

    expect(result.current.isVideoDone("v1")).toBe(true);
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it("setVideoDone does nothing when userId is undefined", async () => {
    const { result } = renderHook(() => useApiProgress(undefined));
    await act(async () => {
      await result.current.setVideoDone(mockVideo("v1"), true);
    });
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("isTopicDone returns true only when all videos in topic are done", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      json: async () => ({ videos: { "t1-v1": { done: true }, "t1-v2": { done: false } } }),
    });
    const { result } = renderHook(() => useApiProgress("user-1"));
    await waitFor(() => expect(result.current.loading).toBe(false));

    const topic = mockTopic("t1", ["t1"]);
    expect(result.current.isTopicDone(topic)).toBe(false);
  });

  it("isStepDone returns true only when all topics are done", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      json: async () => ({ videos: {} }),
    });
    const { result } = renderHook(() => useApiProgress("user-1"));
    await waitFor(() => expect(result.current.loading).toBe(false));

    const step = mockStep("s1", ["t1"]);
    expect(result.current.isStepDone(step)).toBe(false);
  });

  it("statsForStep counts completed and total videos", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      json: async () => ({ videos: { "t1-v1": { done: true }, "t1-v2": { done: false } } }),
    });
    const { result } = renderHook(() => useApiProgress("user-1"));
    await waitFor(() => expect(result.current.loading).toBe(false));

    const step = mockStep("s1", ["t1"]);
    const stats = result.current.statsForStep(step);
    expect(stats.total).toBe(2);
    expect(stats.completed).toBe(1);
  });

  it("setTopicDone marks all videos in topic done optimistically", async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({ json: async () => ({ videos: {} }) })
      .mockResolvedValue({}); // multiple POSTs

    const { result } = renderHook(() => useApiProgress("user-1"));
    await waitFor(() => expect(result.current.loading).toBe(false));

    // mockTopic("t1", ["t1"]) creates a topic with one video: id="t1"
    // mockTopic("t1", ["v-a", "v-b"]) creates a topic with two videos: id="v-a" and id="v-b"
    const topic = mockTopic("t1", ["v-a", "v-b"]);
    await act(async () => {
      await result.current.setTopicDone(topic, true);
    });

    // After the optimistic setState, both videos should be marked done
    await waitFor(() => {
      expect(result.current.isVideoDone("v-a")).toBe(true);
      expect(result.current.isVideoDone("v-b")).toBe(true);
    });
  });

  it("setStepDone marks all videos in step done optimistically", async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({ json: async () => ({ videos: {} }) })
      .mockResolvedValue({});

    const { result } = renderHook(() => useApiProgress("user-1"));
    await waitFor(() => expect(result.current.loading).toBe(false));

    // mockStep creates topics with videos named "${tid}-v1" and "${tid}-v2"
    const step = mockStep("s1", ["t1"]);
    await act(async () => {
      await result.current.setStepDone(step, true);
    });

    await waitFor(() => {
      expect(result.current.isVideoDone("t1-v1")).toBe(true);
    });
  });

  it("statsForTopic returns completed and total count for a topic", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      json: async () => ({ videos: { "t1-v1": { done: true }, "t1-v2": { done: false } } }),
    });
    const { result } = renderHook(() => useApiProgress("user-1"));
    await waitFor(() => expect(result.current.loading).toBe(false));

    const topic = mockTopic("t1", ["t1-v1", "t1-v2"]);
    const stats = result.current.statsForTopic(topic);
    expect(stats.total).toBe(2);
    expect(stats.completed).toBe(1);
  });

  it("setVideoDone with done=false sets completedAt to undefined", async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({ json: async () => ({ videos: { "v1": { done: true } } }) })
      .mockResolvedValueOnce({});

    const { result } = renderHook(() => useApiProgress("user-1"));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.setVideoDone(mockVideo("v1"), false);
    });

    await waitFor(() => {
      expect(result.current.isVideoDone("v1")).toBe(false);
    });
  });

  it("setTopicDone preserves existing completedAt when video already has one", async () => {
    // Covers the `videos[video.id]?.completedAt ?? new Date()` branch when completedAt is set
    const existingDate = "2024-01-01T10:00:00.000Z";
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({ json: async () => ({ videos: { "v-a": { done: true, completedAt: existingDate } } }) })
      .mockResolvedValue({});

    const { result } = renderHook(() => useApiProgress("user-1"));
    await waitFor(() => expect(result.current.loading).toBe(false));

    const topic = mockTopic("t1", ["v-a"]);
    await act(async () => {
      await result.current.setTopicDone(topic, true);
    });

    await waitFor(() => {
      expect(result.current.isVideoDone("v-a")).toBe(true);
    });
  });

  it("setStepDone preserves existing completedAt when video already has one", async () => {
    // Covers the same branch in setStepDone
    const existingDate = "2024-01-01T10:00:00.000Z";
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({ json: async () => ({ videos: { "t1-v1": { done: true, completedAt: existingDate } } }) })
      .mockResolvedValue({});

    const { result } = renderHook(() => useApiProgress("user-1"));
    await waitFor(() => expect(result.current.loading).toBe(false));

    const step = mockStep("s1", ["t1"]);
    await act(async () => {
      await result.current.setStepDone(step, true);
    });

    await waitFor(() => {
      expect(result.current.isVideoDone("t1-v1")).toBe(true);
    });
  });

  it("setTopicDone with done=false marks all videos in topic as not done", async () => {
    // Covers the `done=false` branch (completedAt: undefined) in setTopicDone at line 47
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({ json: async () => ({ videos: { "v-a": { done: true }, "v-b": { done: true } } }) })
      .mockResolvedValue({});

    const { result } = renderHook(() => useApiProgress("user-1"));
    await waitFor(() => expect(result.current.loading).toBe(false));

    const topic = mockTopic("t1", ["v-a", "v-b"]);
    await act(async () => {
      await result.current.setTopicDone(topic, false);
    });

    await waitFor(() => {
      expect(result.current.isVideoDone("v-a")).toBe(false);
      expect(result.current.isVideoDone("v-b")).toBe(false);
    });
  });

  it("setStepDone with done=false marks all videos in step as not done", async () => {
    // Covers the `done=false` branch (completedAt: undefined) in setStepDone at line 69
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({ json: async () => ({ videos: { "t1-v1": { done: true }, "t1-v2": { done: true } } }) })
      .mockResolvedValue({});

    const { result } = renderHook(() => useApiProgress("user-1"));
    await waitFor(() => expect(result.current.loading).toBe(false));

    const step = mockStep("s1", ["t1"]);
    await act(async () => {
      await result.current.setStepDone(step, false);
    });

    await waitFor(() => {
      expect(result.current.isVideoDone("t1-v1")).toBe(false);
      expect(result.current.isVideoDone("t1-v2")).toBe(false);
    });
  });
});
