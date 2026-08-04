'use client';

// Multiple-choice practice. Recognition, not recall, so nothing here
// touches the Leitner schedule — no reviews rows, no box changes.
// The graded path for mastery stays in /review.

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Dumbbell } from 'lucide-react';
import { m } from "framer-motion";
import type { PracticeQuestion } from '@/lib/practice';

interface PracticeResult {
  question: PracticeQuestion;
  pickedAnswer: string;
  correct: boolean;
}

export default function PracticeSession({ questions }: { questions: PracticeQuestion[] }) {
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [results, setResults] = useState<PracticeResult[]>([]);

  const finished = index >= questions.length;
  const question = questions[index];

  const handlePick = (option: string) => {
    if (picked !== null) return; // one answer per question
    setPicked(option);
    setResults((prev) => [
      ...prev,
      { question, pickedAnswer: option, correct: option === question.card.answer },
    ]);
  };

  const handleNext = () => {
    setPicked(null);
    setIndex((i) => i + 1);
  };

  if (finished) {
    const correct = results.filter((r) => r.correct).length;
    const missed = results.filter((r) => !r.correct);
    return (
      <div className="min-h-screen bg-[#0a0908] text-white flex flex-col items-center justify-center p-6">
        <div className="text-center max-w-md w-full">
          <m.div
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 20 }}
            className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-accent/10 mb-8 border border-accent/20"
          >
            <Dumbbell className="w-12 h-12 text-accent" aria-hidden="true" />
          </m.div>
          <h1 className="text-3xl md:text-4xl font-serif font-bold mb-4">Practice complete</h1>
          <p className="text-gray-400 mb-2 text-lg">
            {correct} of {results.length} correct
          </p>
          <p className="text-gray-600 mb-8 text-sm">Practice doesn&apos;t change your review schedule.</p>

          {missed.length > 0 && (
            <div className="text-left bg-[#14120f] border border-white/10 rounded-2xl p-5 mb-10">
              <h2 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3">Worth another look</h2>
              <ul className="space-y-2">
                {missed.map((r, i) => (
                  <li key={i}>
                    <Link
                      href={`/notes/${r.question.card.note_id}?line=${r.question.card.line}`}
                      className="block text-sm text-gray-300 hover:text-accent transition-colors truncate"
                    >
                      {r.question.card.prompt}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <Link
            href="/dashboard"
            className="inline-block w-full sm:w-auto bg-white/10 hover:bg-white/20 text-white px-6 py-3 rounded-full font-medium transition-all"
          >
            Return to dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0908] text-white flex flex-col">
      <header className="flex justify-between items-center p-6 md:p-10">
        <Link href="/dashboard" className="text-gray-500 hover:text-white transition-colors flex items-center gap-2">
          <ArrowLeft className="w-5 h-5" aria-hidden="true" /> Dashboard
        </Link>
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-bold tracking-wider text-gray-600 uppercase border border-white/10 rounded-full px-2.5 py-1">
            Practice
          </span>
          <div className="text-sm text-gray-500 font-medium font-mono">
            {index + 1} / {questions.length}
          </div>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-2xl">
          <m.div
            key={question.card.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.12, ease: 'easeOut' }}
            className="bg-[#14120f] border border-white/10 p-8 md:p-12 rounded-3xl shadow-2xl mb-8"
          >
            <h2 className="text-3xl md:text-4xl font-serif leading-relaxed text-center">{question.card.prompt}</h2>
          </m.div>

          <div className="grid grid-cols-1 gap-3" role="group" aria-label="Answer options">
            {question.options.map((option) => {
              const isPicked = picked === option;
              const isCorrectOption = option === question.card.answer;
              const revealed = picked !== null;

              let style = 'bg-white/5 hover:bg-white/10 border-white/10 text-gray-300';
              if (revealed && isCorrectOption) style = 'bg-green-500/15 border-green-500/40 text-green-300';
              else if (revealed && isPicked) style = 'bg-red-500/15 border-red-500/40 text-red-300';
              else if (revealed) style = 'bg-white/5 border-white/10 text-gray-500';

              return (
                <button
                  key={option}
                  onClick={() => handlePick(option)}
                  disabled={revealed}
                  className={`px-6 py-4 border rounded-xl text-left font-medium transition-colors disabled:cursor-default ${style}`}
                >
                  {option}
                  {revealed && isCorrectOption && <span className="sr-only"> (correct answer)</span>}
                  {revealed && isPicked && !isCorrectOption && <span className="sr-only"> (your pick, incorrect)</span>}
                </button>
              );
            })}
          </div>

          <div className="mt-8 flex justify-center min-h-14">
            {picked !== null && (
              <button
                onClick={handleNext}
                className="w-full sm:w-auto px-8 py-3.5 sm:px-12 sm:py-4 bg-white/10 hover:bg-white/20 rounded-xl font-bold tracking-wide transition-all"
              >
                {index + 1 < questions.length ? 'Next' : 'See results'}
              </button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
