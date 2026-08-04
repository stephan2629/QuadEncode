'use client';

import Link from 'next/link';
import { CheckCircle2, Trophy, ArrowRight } from 'lucide-react';
import { m } from "framer-motion";

interface ResultCard {
  note_id: string;
  line: number;
  prompt: string;
}

interface SessionResult {
  card: ResultCard;
  correct: boolean;
}

export default function CompletionScreen({ results = [] }: { results?: SessionResult[] }) {
  const correct = results.filter((r) => r.correct).length;
  const missed = results.filter((r) => !r.correct);
  const graded = results.length > 0;
  const accuracy = graded ? Math.round((correct / results.length) * 100) : 0;

  return (
    <div className="min-h-screen bg-[#0a0908] text-white flex flex-col items-center justify-center p-6 selection:bg-accent/30 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-accent/5 to-transparent pointer-events-none"></div>

      <m.div 
        initial={{ scale: 0.92, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="text-center max-w-xl w-full bg-[#14120f]/90 backdrop-blur-2xl border border-white/10 rounded-3xl p-8 md:p-12 shadow-[0_20px_60px_rgba(0,0,0,0.8)] relative z-10 overflow-hidden"
      >
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 bg-accent/15 blur-3xl pointer-events-none" />

        <m.div
          initial={{ scale: 0.5, opacity: 0, rotate: -10 }}
          animate={{ scale: 1, opacity: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 220, damping: 18, delay: 0.15 }}
          className="inline-flex items-center justify-center w-24 h-24 rounded-3xl bg-accent/15 mb-8 border border-accent/30 relative shadow-[0_0_35px_rgba(245,158,11,0.25)]"
        >
          {graded && accuracy >= 80 ? (
             <Trophy className="w-12 h-12 text-accent animate-bounce" aria-hidden="true" />
          ) : (
             <CheckCircle2 className="w-12 h-12 text-accent" aria-hidden="true" />
          )}
        </m.div>

        {graded ? (
          <>
            <h1 className="text-3xl md:text-4xl font-serif font-bold mb-4 text-white">Review Complete!</h1>
            
            <div className="flex justify-center gap-4 sm:gap-6 mb-8 mt-6">
              <div className="flex flex-col items-center bg-white/[0.04] p-4 rounded-2xl border border-white/10 w-32 backdrop-blur-md shadow-lg">
                <span className="text-3xl font-serif font-bold text-accent mb-1">{accuracy}%</span>
                <span className="text-xs uppercase tracking-wider text-gray-400 font-bold font-mono">Accuracy</span>
              </div>
              <div className="flex flex-col items-center bg-white/[0.04] p-4 rounded-2xl border border-white/10 w-32 backdrop-blur-md shadow-lg">
                <span className="text-3xl font-serif font-bold text-white mb-1">{correct}/{results.length}</span>
                <span className="text-xs uppercase tracking-wider text-gray-400 font-bold font-mono">Score</span>
              </div>
            </div>

            {missed.length > 0 && (
              <div className="text-left bg-[#1a1815] border border-white/5 rounded-2xl p-6 mb-10 shadow-inner">
                <h2 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-4 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-red-500/50"></span>
                  Needs more review
                </h2>
                <ul className="space-y-3">
                  {missed.map((r, i) => (
                    <m.li 
                      key={i}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3 + (i * 0.1) }}
                    >
                      <Link
                        href={`/notes/${r.card.note_id}?line=${r.card.line}`}
                        className="group flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
                      >
                        <span className="text-sm text-gray-300 group-hover:text-white transition-colors truncate pr-4">
                          {r.card.prompt}
                        </span>
                        <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-accent transition-colors flex-shrink-0" />
                      </Link>
                    </m.li>
                  ))}
                </ul>
              </div>
            )}
          </>
        ) : (
          <>
            <h1 className="text-3xl md:text-4xl font-serif font-bold mb-4 text-white">You&apos;re all caught up!</h1>
            <p className="text-gray-400 mb-10 text-lg">No more cards are due for review.</p>
          </>
        )}

        <Link
          href="/dashboard"
          className="inline-block w-full py-4 bg-accent hover:bg-accent/90 text-[#0a0908] rounded-xl font-bold tracking-wide transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
        >
          Return to Dashboard
        </Link>
      </m.div>
    </div>
  );
}
