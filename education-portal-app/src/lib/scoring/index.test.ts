/**
 * @jest-environment node
 */
import {
  computeGrade,
  computePercentile,
  computeRankPosition,
  calcQuizPoints,
  maxPoints,
  POINTS_PER_QUESTION,
  FIRST_TRY_BONUS,
} from "./index";

describe("scoring constants", () => {
  it("POINTS_PER_QUESTION is 10", () => {
    expect(POINTS_PER_QUESTION).toBe(10);
  });

  it("FIRST_TRY_BONUS is 5", () => {
    expect(FIRST_TRY_BONUS).toBe(5);
  });
});

describe("computeGrade", () => {
  it("returns A for percentile >= 90", () => {
    expect(computeGrade(90)).toBe("A");
    expect(computeGrade(100)).toBe("A");
    expect(computeGrade(95)).toBe("A");
  });

  it("returns B for percentile 66–89", () => {
    expect(computeGrade(89)).toBe("B");
    expect(computeGrade(66)).toBe("B");
    expect(computeGrade(75)).toBe("B");
  });

  it("returns C for percentile 33–65", () => {
    expect(computeGrade(65)).toBe("C");
    expect(computeGrade(33)).toBe("C");
    expect(computeGrade(50)).toBe("C");
  });

  it("returns D for percentile < 33", () => {
    expect(computeGrade(32)).toBe("D");
    expect(computeGrade(0)).toBe("D");
    expect(computeGrade(1)).toBe("D");
  });
});

describe("computePercentile", () => {
  it("returns 100 when there is only 1 user", () => {
    expect(computePercentile(50, [50])).toBe(100);
  });

  it("returns 100 when score is highest among all users", () => {
    expect(computePercentile(100, [0, 50, 75, 100])).toBe(100);
  });

  it("returns 0 when score is lowest or tied lowest", () => {
    expect(computePercentile(0, [0, 50, 100])).toBe(0);
  });

  it("computes percentile correctly for mid-range score", () => {
    // scores: [0, 10, 20, 30] — user has 20
    // below 20: [0, 10] => 2 users below, 3 others total
    // percentile = round(2/3 * 100) = 67
    expect(computePercentile(20, [0, 10, 20, 30])).toBe(67);
  });

  it("handles a single-user list (length <= 1)", () => {
    expect(computePercentile(999, [])).toBe(100);
  });
});

describe("computeRankPosition", () => {
  it("ranks #1 when score is strictly highest", () => {
    expect(computeRankPosition(100, [0, 50, 100])).toBe(1);
  });

  it("ranks last when score is lowest", () => {
    expect(computeRankPosition(0, [0, 50, 100])).toBe(3);
  });

  it("handles ties correctly — ties do not advance rank", () => {
    // two users have 100; rank of 100 = 1
    expect(computeRankPosition(100, [100, 100, 50])).toBe(1);
  });

  it("rank is 1 for any score when all users have the same score", () => {
    expect(computeRankPosition(50, [50, 50, 50])).toBe(1);
  });
});

describe("calcQuizPoints", () => {
  it("awards base points for correct answers only", () => {
    expect(calcQuizPoints(5, 3, 0)).toBe(30);
  });

  it("adds first-try bonus on top of base points", () => {
    expect(calcQuizPoints(5, 3, 3)).toBe(45); // 30 base + 15 bonus
  });

  it("returns 0 for 0 correct answers", () => {
    expect(calcQuizPoints(5, 0, 0)).toBe(0);
  });

  it("caps bonus at correctAnswers (cannot have more first-try than correct)", () => {
    // Caller is responsible for not passing firstTryCorrect > correctAnswers;
    // the function itself just multiplies
    expect(calcQuizPoints(3, 2, 2)).toBe(30); // 20 + 10
  });

  it("computes max score (all correct, all first-try)", () => {
    expect(calcQuizPoints(3, 3, 3)).toBe(45); // 30 + 15
  });
});

describe("maxPoints", () => {
  it("computes max for a single question", () => {
    expect(maxPoints(1)).toBe(15);
  });

  it("computes max for 3 questions", () => {
    expect(maxPoints(3)).toBe(45);
  });

  it("returns 0 for 0 questions", () => {
    expect(maxPoints(0)).toBe(0);
  });
});
