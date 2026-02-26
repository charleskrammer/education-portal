/**
 * Scoring rules for the AI Training Portal.
 *
 * POINTS SYSTEM:
 * - Base points per correct question: 10
 * - First-attempt bonus per correct question: 5
 * - Maximum per question: 15 (10 base + 5 bonus)
 *
 * Total score = sum of all points earned across all video quizzes.
 * Score is deterministic and reproducible from stored quiz attempts.
 *
 * RANKING:
 * - Users ranked by total score (highest = rank #1).
 * - Percentile = percentage of other users scored below you.
 *
 * GRADE LABELS:
 * - A: percentile ≥ 90
 * - B: percentile 66–89
 * - C: percentile 33–65
 * - D: percentile < 33
 */

export const POINTS_PER_QUESTION = 10;
export const FIRST_TRY_BONUS = 5;

export type GradeLabel = "A" | "B" | "C" | "D";

/** Derive grade label from percentile (0–100). */
export function computeGrade(percentile: number): GradeLabel {
  if (percentile >= 90) return "A";
  if (percentile >= 66) return "B";
  if (percentile >= 33) return "C";
  return "D";
}

/**
 * Compute percentile rank of a score within an array of all scores.
 * Returns 0–100. A score higher than all others returns 100.
 */
export function computePercentile(score: number, allScores: number[]): number {
  if (allScores.length <= 1) return 100;
  const below = allScores.filter((s) => s < score).length;
  return Math.round((below / (allScores.length - 1)) * 100);
}

/**
 * Compute 1-based rank position within an array of all scores.
 * Rank 1 = highest score.
 */
export function computeRankPosition(score: number, allScores: number[]): number {
  return allScores.filter((s) => s > score).length + 1;
}

/**
 * Calculate points earned for a quiz attempt.
 * @param totalQuestions total number of questions in the quiz
 * @param correctAnswers number of questions answered correctly
 * @param firstTryCorrect number of questions answered correctly on the first try
 */
export function calcQuizPoints(
  totalQuestions: number,
  correctAnswers: number,
  firstTryCorrect: number
): number {
  const base = correctAnswers * POINTS_PER_QUESTION;
  const bonus = firstTryCorrect * FIRST_TRY_BONUS;
  return base + bonus;
}

/** Maximum achievable points for a given number of questions. */
export function maxPoints(totalQuestions: number): number {
  return totalQuestions * (POINTS_PER_QUESTION + FIRST_TRY_BONUS);
}
