"use client";

import { useState } from "react";
import { calcQuizPoints, maxPoints, POINTS_PER_QUESTION, FIRST_TRY_BONUS } from "@/lib/scoring";
import type { AnswerPayload } from "@/lib/scoring/server";

export type QuizQuestion = {
  id: string;
  question: string;
  choices: string[];
  answerIndex: number;
  explanation: string;
};

export type QuizResult = {
  totalQuestions: number;
  correctAnswers: number;
  firstTryCorrect: number;
  pointsEarned: number;
  answers: AnswerPayload;
};

export default function Quiz({
  questions,
  onComplete,
  isFirstAttempt = true,
}: {
  questions: QuizQuestion[];
  onComplete?: (result: QuizResult) => void;
  isFirstAttempt?: boolean;
}) {
  // Track the first selection per question (immutable after first pick)
  const [firstAnswers, setFirstAnswers] = useState<Record<string, number>>({});
  // Current displayed selection (can be changed for review, but score uses firstAnswers)
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [submitted, setSubmitted] = useState(false);

  const allAnswered = questions.every((q) => answers[q.id] !== undefined);

  const handleSelect = (id: string, index: number) => {
    if (submitted) return;
    setAnswers((prev) => ({ ...prev, [id]: index }));
    // Only record first selection
    if (firstAnswers[id] === undefined) {
      setFirstAnswers((prev) => ({ ...prev, [id]: index }));
    }
  };

  const handleSubmit = () => {
    if (!allAnswered) return;
    setSubmitted(true);

    const correctAnswers = questions.filter(
      (q) => firstAnswers[q.id] === q.answerIndex
    ).length;
    const firstTryCorrect = questions.filter(
      (q) => firstAnswers[q.id] === q.answerIndex
    ).length;
    const pointsEarned = calcQuizPoints(questions.length, correctAnswers, firstTryCorrect);

    // Build the answers payload for server-side scoring
    const answersPayload: AnswerPayload = questions.map((q) => ({
      questionId: q.id,
      firstSelectedIndex: firstAnswers[q.id] ?? -1,
      finalSelectedIndex: answers[q.id] ?? -1,
    }));

    onComplete?.({
      totalQuestions: questions.length,
      correctAnswers,
      firstTryCorrect,
      pointsEarned,
      answers: answersPayload,
    });
  };

  const handleRetry = () => {
    setFirstAnswers({});
    setAnswers({});
    setSubmitted(false);
  };

  const correctCount = questions.filter((q) => firstAnswers[q.id] === q.answerIndex).length;
  const totalScore = submitted
    ? calcQuizPoints(questions.length, correctCount, isFirstAttempt ? correctCount : 0)
    : null;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-slate-500">
          {questions.length} questions · {POINTS_PER_QUESTION} pts each · +{FIRST_TRY_BONUS} first-try bonus
        </p>
        {submitted && totalScore !== null && (
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-teal-700">
              Score: {totalScore} / {maxPoints(questions.length)} pts
            </span>
            <button type="button" className="ghost-button" onClick={handleRetry}>
              Retry
            </button>
          </div>
        )}
      </div>

      {questions.map((question, idx) => {
        const selected = answers[question.id];
        const firstSelected = firstAnswers[question.id];
        const isCorrect = submitted && firstSelected === question.answerIndex;
        const wasFirstTryCorrect = submitted && firstSelected === question.answerIndex;
        const showFeedback = submitted && selected !== undefined;

        return (
          <div key={question.id} className="section-card p-5">
            <div className="flex items-start justify-between gap-3">
              <h3 className="text-base font-heading font-semibold text-ink">
                {idx + 1}. {question.question}
              </h3>
              {showFeedback && (
                <span
                  className={`shrink-0 text-xs font-semibold ${
                    isCorrect ? "text-teal-700" : "text-amber-700"
                  }`}
                >
                  {isCorrect
                    ? (wasFirstTryCorrect && isFirstAttempt)
                      ? `+${POINTS_PER_QUESTION + FIRST_TRY_BONUS} pts`
                      : `+${POINTS_PER_QUESTION} pts`
                    : "0 pts"}
                </span>
              )}
            </div>

            <div className="mt-3 grid gap-2">
              {question.choices.map((choice, choiceIdx) => {
                const isSelected = selected === choiceIdx;
                const isAnswer = choiceIdx === question.answerIndex;
                let borderClass = "border-slate-200 bg-white hover:border-slate-300";
                if (submitted) {
                  if (isAnswer) borderClass = "border-teal-400 bg-teal-50 text-teal-900";
                  else if (isSelected && !isAnswer) borderClass = "border-amber-300 bg-amber-50 text-amber-900";
                  else borderClass = "border-slate-200 bg-white opacity-60";
                } else if (isSelected) {
                  borderClass = "border-teal-400 bg-teal-50 text-teal-900";
                }

                return (
                  <button
                    key={choice}
                    type="button"
                    onClick={() => handleSelect(question.id, choiceIdx)}
                    disabled={submitted}
                    className={`rounded-2xl border px-4 py-3 text-left text-sm transition ${borderClass}`}
                  >
                    {choice}
                    {submitted && isAnswer && (
                      <span className="ml-2 text-xs font-semibold text-teal-700">✓ Correct</span>
                    )}
                  </button>
                );
              })}
            </div>

            {showFeedback && (
              <p className="mt-3 rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-600">
                {question.explanation}
              </p>
            )}
          </div>
        );
      })}

      {!submitted && (
        <button
          type="button"
          className={allAnswered ? "solid-button self-start" : "ghost-button self-start opacity-50 cursor-not-allowed"}
          onClick={handleSubmit}
          disabled={!allAnswered}
        >
          {allAnswered ? "Submit quiz" : `Answer all ${questions.length} questions to submit`}
        </button>
      )}
    </div>
  );
}
