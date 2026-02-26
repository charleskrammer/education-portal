/**
 * @jest-environment node
 */
import {
  latestAttemptsPerQuiz,
  sumScore,
  scoreQuizAttempt,
  type AttemptForScoring,
} from "./server";
import type { QuizQuestion } from "@/lib/training";

// ── latestAttemptsPerQuiz ─────────────────────────────────────────────────────

describe("latestAttemptsPerQuiz", () => {
  const base: Omit<AttemptForScoring, "quizId" | "completedAt"> = {
    scoreEarned: 10,
    correctAnswers: 1,
    totalQuestions: 2,
  };

  it("returns empty array for empty input", () => {
    expect(latestAttemptsPerQuiz([])).toEqual([]);
  });

  it("skips attempts with null completedAt", () => {
    const attempts: AttemptForScoring[] = [
      { ...base, quizId: "q1", completedAt: null },
    ];
    expect(latestAttemptsPerQuiz(attempts)).toEqual([]);
  });

  it("returns single completed attempt", () => {
    const date = new Date("2024-01-01");
    const attempts: AttemptForScoring[] = [
      { ...base, quizId: "q1", completedAt: date },
    ];
    expect(latestAttemptsPerQuiz(attempts)).toHaveLength(1);
    expect(latestAttemptsPerQuiz(attempts)[0].quizId).toBe("q1");
  });

  it("picks the latest attempt among multiple for the same quiz", () => {
    const early = new Date("2024-01-01");
    const late = new Date("2024-06-01");
    const attempts: AttemptForScoring[] = [
      { ...base, quizId: "q1", completedAt: early, scoreEarned: 5 },
      { ...base, quizId: "q1", completedAt: late, scoreEarned: 15 },
    ];
    const result = latestAttemptsPerQuiz(attempts);
    expect(result).toHaveLength(1);
    expect(result[0].scoreEarned).toBe(15);
  });

  it("returns one entry per distinct quiz", () => {
    const d1 = new Date("2024-01-01");
    const d2 = new Date("2024-01-02");
    const attempts: AttemptForScoring[] = [
      { ...base, quizId: "q1", completedAt: d1, scoreEarned: 10 },
      { ...base, quizId: "q2", completedAt: d2, scoreEarned: 20 },
    ];
    const result = latestAttemptsPerQuiz(attempts);
    expect(result).toHaveLength(2);
  });

  it("ignores null-completedAt entries even when mixed with valid ones", () => {
    const d = new Date("2024-01-01");
    const attempts: AttemptForScoring[] = [
      { ...base, quizId: "q1", completedAt: null },
      { ...base, quizId: "q1", completedAt: d, scoreEarned: 10 },
    ];
    const result = latestAttemptsPerQuiz(attempts);
    expect(result).toHaveLength(1);
    expect(result[0].scoreEarned).toBe(10);
  });
});

// ── sumScore ──────────────────────────────────────────────────────────────────

describe("sumScore", () => {
  it("returns 0 for empty array", () => {
    expect(sumScore([])).toBe(0);
  });

  it("sums scoreEarned across all attempts", () => {
    const attempts: AttemptForScoring[] = [
      { quizId: "q1", completedAt: new Date(), scoreEarned: 10, correctAnswers: 1, totalQuestions: 2 },
      { quizId: "q2", completedAt: new Date(), scoreEarned: 25, correctAnswers: 2, totalQuestions: 2 },
    ];
    expect(sumScore(attempts)).toBe(35);
  });
});

// ── scoreQuizAttempt ──────────────────────────────────────────────────────────

const QUESTIONS: QuizQuestion[] = [
  { id: "q1", question: "Q1?", choices: ["A", "B", "C"], answerIndex: 0, explanation: "A is correct" },
  { id: "q2", question: "Q2?", choices: ["X", "Y", "Z"], answerIndex: 1, explanation: "Y is correct" },
  { id: "q3", question: "Q3?", choices: ["P", "Q"],     answerIndex: 0, explanation: "P is correct" },
];

describe("scoreQuizAttempt", () => {
  it("returns correct total question count", () => {
    const result = scoreQuizAttempt(QUESTIONS, [], false);
    expect(result.totalQuestions).toBe(3);
  });

  it("scores 0 when no answers submitted", () => {
    const result = scoreQuizAttempt(QUESTIONS, [], false);
    expect(result.correctAnswers).toBe(0);
    expect(result.scoreEarned).toBe(0);
  });

  it("awards base points for correct answers (non-first attempt)", () => {
    const answers = [
      { questionId: "q1", firstSelectedIndex: 0, finalSelectedIndex: 0 }, // correct
      { questionId: "q2", firstSelectedIndex: 0, finalSelectedIndex: 1 }, // wrong first, correct final
    ];
    const result = scoreQuizAttempt(QUESTIONS, answers, false);
    expect(result.correctAnswers).toBe(2);
    expect(result.firstTryCorrect).toBe(0); // no bonus on non-first attempt
    expect(result.scoreEarned).toBe(20); // 2 × 10
  });

  it("awards first-try bonus on first attempt when first == final and both correct", () => {
    const answers = [
      { questionId: "q1", firstSelectedIndex: 0, finalSelectedIndex: 0 }, // correct first try
      { questionId: "q2", firstSelectedIndex: 0, finalSelectedIndex: 1 }, // wrong first try, correct final
    ];
    const result = scoreQuizAttempt(QUESTIONS, answers, true);
    expect(result.correctAnswers).toBe(2);
    expect(result.firstTryCorrect).toBe(1); // only q1
    expect(result.scoreEarned).toBe(25); // 20 base + 5 bonus
  });

  it("awards max score when all correct on first try (first attempt)", () => {
    const answers = [
      { questionId: "q1", firstSelectedIndex: 0, finalSelectedIndex: 0 },
      { questionId: "q2", firstSelectedIndex: 1, finalSelectedIndex: 1 },
      { questionId: "q3", firstSelectedIndex: 0, finalSelectedIndex: 0 },
    ];
    const result = scoreQuizAttempt(QUESTIONS, answers, true);
    expect(result.correctAnswers).toBe(3);
    expect(result.firstTryCorrect).toBe(3);
    expect(result.scoreEarned).toBe(45); // 3 × 15
  });

  it("does NOT award first-try bonus on subsequent attempts even if first click was correct", () => {
    const answers = [
      { questionId: "q1", firstSelectedIndex: 0, finalSelectedIndex: 0 },
    ];
    const result = scoreQuizAttempt(QUESTIONS, answers, false);
    expect(result.firstTryCorrect).toBe(0);
    expect(result.scoreEarned).toBe(10);
  });

  it("skips questions without a matching answer payload entry", () => {
    const answers = [
      { questionId: "q1", firstSelectedIndex: 0, finalSelectedIndex: 0 },
      // q2 and q3 not in payload
    ];
    const result = scoreQuizAttempt(QUESTIONS, answers, true);
    expect(result.correctAnswers).toBe(1);
  });

  it("does not count wrong final answer as correct even if first was correct", () => {
    const answers = [
      // User changed correct first pick to wrong final pick
      { questionId: "q1", firstSelectedIndex: 0, finalSelectedIndex: 2 },
    ];
    const result = scoreQuizAttempt(QUESTIONS, answers, true);
    expect(result.correctAnswers).toBe(0);
    expect(result.firstTryCorrect).toBe(0);
    expect(result.scoreEarned).toBe(0);
  });
});
