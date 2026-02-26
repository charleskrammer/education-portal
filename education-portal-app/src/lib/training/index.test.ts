/**
 * @jest-environment node
 */
import {
  isChannelAllowed,
  validateChannels,
  getStepById,
  getAllVideos,
  getOfficialVideos,
  ALLOWED_CHANNELS,
} from "./index";

describe("ALLOWED_CHANNELS", () => {
  it("contains Anthropic and Claude", () => {
    expect(ALLOWED_CHANNELS).toContain("Anthropic");
    expect(ALLOWED_CHANNELS).toContain("Claude");
    expect(ALLOWED_CHANNELS).toHaveLength(2);
  });
});

describe("isChannelAllowed", () => {
  it("returns true for Anthropic", () => {
    expect(isChannelAllowed("Anthropic")).toBe(true);
  });

  it("returns true for Claude", () => {
    expect(isChannelAllowed("Claude")).toBe(true);
  });

  it("returns false for unknown channels", () => {
    expect(isChannelAllowed("YouTube")).toBe(false);
    expect(isChannelAllowed("")).toBe(false);
    expect(isChannelAllowed("anthropic")).toBe(false); // case-sensitive
    expect(isChannelAllowed("ANTHROPIC")).toBe(false);
  });
});

describe("validateChannels", () => {
  it("returns no errors for the real training data (all channels must be allowed)", () => {
    const errors = validateChannels();
    expect(errors).toEqual([]);
  });
});

describe("getStepById", () => {
  it("returns the step with a matching id", () => {
    const step = getStepById("1");
    expect(step).toBeDefined();
    expect(step!.id).toBe("1");
    expect(step!.title).toBeTruthy();
  });

  it("returns undefined for a non-existent step id", () => {
    expect(getStepById("999")).toBeUndefined();
    expect(getStepById("")).toBeUndefined();
  });

  it("returns all 4 steps from the training data", () => {
    const step1 = getStepById("1");
    const step4 = getStepById("4");
    expect(step1).toBeDefined();
    expect(step4).toBeDefined();
  });
});

describe("getAllVideos", () => {
  it("returns a non-empty array", () => {
    const videos = getAllVideos();
    expect(videos.length).toBeGreaterThan(0);
  });

  it("includes context fields (stepId, stepTitle, topicId, topicTitle) on every entry", () => {
    const videos = getAllVideos();
    for (const v of videos) {
      expect(v.stepId).toBeTruthy();
      expect(v.stepTitle).toBeTruthy();
      expect(v.topicId).toBeTruthy();
      expect(v.topicTitle).toBeTruthy();
    }
  });

  it("every video has an id and a title", () => {
    const videos = getAllVideos();
    for (const v of videos) {
      expect(v.id).toBeTruthy();
      expect(v.title).toBeTruthy();
    }
  });
});

describe("getOfficialVideos", () => {
  it("returns a subset of getAllVideos", () => {
    const all = getAllVideos();
    const official = getOfficialVideos();
    expect(official.length).toBeLessThanOrEqual(all.length);
  });

  it("every returned video has official=true", () => {
    const official = getOfficialVideos();
    for (const v of official) {
      expect(v.official).toBe(true);
    }
  });
});

describe("validateChannels — disallowed channel branch", () => {
  it("returns error messages for videos with disallowed channels (using jest module mock)", () => {
    // We need to exercise the branch at line 114 where isChannelAllowed returns false.
    // That branch is only reachable if training data contains a video with a bad channel.
    // We use jest.spyOn to temporarily replace the training object with one containing a bad video.

    const { training } = require("./index");
    const originalSteps = training.steps;

    // Inject a fake step/topic/video with a disallowed channel
    training.steps = [
      {
        id: "fake-step",
        title: "Fake Step",
        summary: "s",
        time_estimate: "1m",
        objectives: [],
        checklist: [],
        topics: [
          {
            id: "fake-topic",
            title: "Fake Topic",
            description: "d",
            videos: [
              {
                id: "fake-video",
                title: "Bad Video",
                channel: "YouTube",   // disallowed channel — triggers the uncovered branch
                url: "https://yt.com/watch?v=xyz",
                reason: "test",
                level: "Beginner",
                duration: "1m",
                views: "100",
                published_date: "2024",
                top_pick: false,
              },
            ],
          },
        ],
      },
    ];

    const errors = validateChannels();
    expect(errors.length).toBe(1);
    expect(errors[0]).toMatch(/fake-video/);
    expect(errors[0]).toMatch(/YouTube/);

    // Restore original training data
    training.steps = originalSteps;
  });
});
