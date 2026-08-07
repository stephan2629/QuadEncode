'use client';

import { useEffect, useState } from 'react';
import { Loader2, Wand2 } from 'lucide-react';
import { generateAIQuizAction, getQuizQuota, type QuizQuotaInfo } from '@/app/actions/quiz-actions';

// Lives on the Notes tab, where material gets written, rather than inside
// the Quiz tab where it used to sit. The Practice and Quiz tabs only appear
// once a note already holds 10+ vocab or quiz pairs (see
// hasEnoughForPracticeAndQuiz), and this button is the main way a note
// reaches that count - leaving it inside the Quiz tab would have hidden the
// only control that creates the content required to reveal it.
//
// Not a template-insertion button: CLAUDE.md section 23 forbids "+ Vocab" /
// "+ Quiz" buttons that paste empty syntax into the editor. This one runs a
// real AI generation pass against what the user already wrote, and is
// placed on its own row apart from the formatting toolbar so it doesn't
// read as one.
export default function GenerateCardsButton({
  noteId,
  content,
  onGenerated,
}: {
  noteId: string;
  content: string;
  onGenerated?: (newContent: string) => void;
}) {
  const [quota, setQuota] = useState<QuizQuotaInfo | null>(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getQuizQuota().then(setQuota).catch(() => {});
  }, []);

  const handleGenerate = async () => {
    setError(null);
    setGenerating(true);
    const res = await generateAIQuizAction(noteId, content);
    setGenerating(false);

    if (!res.success) {
      setError(res.error ?? 'Failed to generate.');
      getQuizQuota().then(setQuota).catch(() => {});
      return;
    }

    onGenerated?.(content + '\n\n' + res.appendedText + '\n');
    getQuizQuota().then(setQuota).catch(() => {});
  };

  if (!quota) return null;

  return (
    <div className="px-8 md:px-12 mt-3">
      <button
        onClick={handleGenerate}
        disabled={generating || quota.remaining <= 0}
        className="inline-flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 text-white text-sm font-medium px-4 py-2.5 rounded-xl active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 min-h-[44px]"
      >
        {generating ? (
          <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
        ) : (
          <Wand2 className="w-4 h-4" aria-hidden="true" />
        )}
        {generating
          ? 'Reading your notes...'
          : quota.remaining <= 0
            ? `Daily limit reached (${quota.limit}/${quota.limit} used)`
            : `Generate 10 Quizzes & 10 Cards (${quota.remaining}/${quota.limit} left today)`}
      </button>
      {quota.remaining <= 0 && (
        <p className="text-xs text-gray-500 mt-1.5">
          More in about {quota.hoursUntilReset} {quota.hoursUntilReset === 1 ? 'hour' : 'hours'}.
        </p>
      )}
      {error && (
        <p className="text-xs text-red-400 mt-1.5">{error}</p>
      )}
    </div>
  );
}
