import { POINTS_PER_QUESTION, FIRST_TRY_BONUS } from "./index";
import type { QuizQuestion } from "@/lib/training";

/**
 * From a list of completed attempts (any user), return only the LATEST attempt
 * per quizId. This ensures each quiz contributes exactly one score to any total —
 * retrying a quiz replaces, not accumulates, the previous contribution.
 */
export type AttemptForScoring = {
  quizId: string;
  completedAt: Date | null;
  scoreEarned: number;
  correctAnswers: number;
  totalQuestions: number;
};

export function latestAttemptsPerQuiz<T extends AttemptForScoring>(attempts: T[]): T[] {
  const map = new Map<string, T>();
  for (const a of attempts) {
    if (!a.completedAt) continue;
    const existing = map.get(a.quizId);
    if (!existing || !existing.completedAt || a.completedAt > existing.completedAt) {
      map.set(a.quizId, a);
    }
  }
  return Array.from(map.values());
}

export function sumScore(attempts: AttemptForScoring[]): number {
  return attempts.reduce((s, a) => s + a.scoreEarned, 0);
}

export type AnswerPayload = {
  questionId: string;
  firstSelectedIndex: number;
  finalSelectedIndex: number;
}[];

export type ScoredResult = {
  totalQuestions: number;
  correctAnswers: number;
  firstTryCorrect: number;
  scoreEarned: number;
};

/**
 * Score a quiz attempt server-side.
 * @param questions  The authoritative questions from training.json
 * @param answers    What the user submitted (first + final clicks)
 * @param isFirstAttempt  Whether this is the user's first ever attempt for this quiz
 */
export function scoreQuizAttempt(
  questions: QuizQuestion[],
  answers: AnswerPayload,
  isFirstAttempt: boolean
): ScoredResult {
  const answerMap = new Map(answers.map((a) => [a.questionId, a]));

  let correctAnswers = 0;
  let firstTryCorrect = 0;

  for (const q of questions) {
    const answer = answerMap.get(q.id);
    if (!answer) continue;

    const isFinalCorrect = answer.finalSelectedIndex === q.answerIndex;
    const isFirstCorrect = answer.firstSelectedIndex === q.answerIndex;

    if (isFinalCorrect) correctAnswers++;
    if (isFinalCorrect && isFirstCorrect && isFirstAttempt) firstTryCorrect++;
  }

  const scoreEarned =
    correctAnswers * POINTS_PER_QUESTION + firstTryCorrect * FIRST_TRY_BONUS;

  return {
    totalQuestions: questions.length,
    correctAnswers,
    firstTryCorrect,
    scoreEarned,
  };
}
