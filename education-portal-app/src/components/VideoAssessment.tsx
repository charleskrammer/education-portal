"use client";

import Quiz from "@/components/Quiz";
import type { QuizResult } from "@/components/Quiz";
import type { VideoQuiz } from "@/lib/training";
import { useApiQuizAttempts } from "@/hooks/useApiQuizAttempts";
import { useAuth } from "@/components/AuthProvider";
import { maxPoints } from "@/lib/scoring";

export default function VideoAssessment({
  quiz,
  videoId,
  topicTitle,
  videoTitle,
}: {
  quiz?: VideoQuiz;
  videoId: string;
  topicTitle: string;
  videoTitle: string;
}) {
  const { user } = useAuth();
  const { attempts, best, submitAttempt, submitting } = useApiQuizAttempts(videoId, user?.internalId);

  if (!quiz || quiz.questions.length === 0) return null;

  const handleComplete = async (result: QuizResult) => {
    if (!user) return;
    await submitAttempt(result.answers);
  };

  return (
    <div className="section-card mt-5 border border-amber-100 bg-amber-50/60 p-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">
            Practice zone
          </p>
          <h4 className="mt-2 text-xl font-heading font-semibold text-ink">Quick quiz</h4>
          <p className="mt-1 text-xs text-slate-500">
            {topicTitle} · {videoTitle}
          </p>
        </div>
        {best && (
          <div className="rounded-2xl border border-teal-200 bg-teal-50 px-4 py-2 text-right text-xs">
            <p className="font-semibold text-teal-800">
              Best score: {best.scoreEarned} / {maxPoints(best.totalQuestions)} pts
            </p>
            <p className="text-teal-600">
              {best.correctAnswers}/{best.totalQuestions} correct ·{" "}
              {best.completedAt ? new Date(best.completedAt).toLocaleDateString() : ""}
            </p>
          </div>
        )}
      </div>
      {submitting && <p className="text-xs text-slate-500 mb-2">Saving…</p>}
      <Quiz questions={quiz.questions} onComplete={handleComplete} isFirstAttempt={attempts.length === 0} />
    </div>
  );
}
