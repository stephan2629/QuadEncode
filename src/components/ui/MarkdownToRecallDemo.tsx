'use client';

import { useState } from 'react';
import { ArrowRight, RotateCcw } from 'lucide-react';

const TERM = 'Mitochondria';
const DEFINITION = "The organelle that produces most of a cell's ATP through respiration.";

export default function MarkdownToRecallDemo() {
  const [attempt, setAttempt] = useState('');
  const [revealed, setRevealed] = useState(false);
  const hasAttempt = attempt.trim().length > 0;

  const reset = () => {
    setAttempt('');
    setRevealed(false);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-6 md:gap-5 items-stretch">
      {/* Raw note, as typed */}
      <div className="bg-[#0a0908] border border-white/10 rounded-2xl overflow-hidden flex flex-col">
        <div className="h-10 border-b border-white/10 flex items-center px-4 bg-[#14120f] shrink-0">
          <span className="text-xs font-mono text-gray-500">cell-biology.md</span>
        </div>
        <div className="p-6 font-mono text-sm leading-relaxed flex-1">
          <p className="text-gray-500"># Cell Biology</p>
          <p className="mt-4">
            <span className="text-accent">**Vocab:**</span> <span className="text-white">{TERM}</span>
          </p>
          <p className="mt-1">
            <span className="text-blue-400">**Def:**</span> <span className="text-gray-400">{DEFINITION}</span>
          </p>
        </div>
      </div>

      {/* Connector */}
      <div className="flex md:flex-col items-center justify-center gap-2 text-accent py-2 md:py-0">
        <ArrowRight className="w-5 h-5 rotate-90 md:rotate-0" aria-hidden="true" />
        <span className="text-[11px] font-mono uppercase tracking-widest text-gray-400">becomes</span>
      </div>

      {/* Recall card */}
      <div className="bg-[#14120f] border border-white/10 rounded-2xl p-6 flex flex-col">
        <div className="text-xs font-mono text-accent uppercase tracking-widest mb-4">Review</div>
        <p className="font-serif text-2xl text-white mb-5">{TERM}</p>

        {!revealed ? (
          <div className="flex flex-col flex-1">
            <label htmlFor="recall-demo-input" className="sr-only">
              Type what you remember about {TERM}
            </label>
            <textarea
              id="recall-demo-input"
              value={attempt}
              onChange={(e) => setAttempt(e.target.value)}
              placeholder="Type what you remember..."
              rows={3}
              className="w-full bg-[#0a0908] border border-white/10 rounded-xl p-3 text-sm text-gray-200 font-sans placeholder-gray-600 focus:outline-none focus:border-accent/50 resize-none flex-1"
            />
            <button
              type="button"
              onClick={() => hasAttempt && setRevealed(true)}
              disabled={!hasAttempt}
              className="mt-4 w-full py-3 rounded-xl font-bold text-sm bg-accent text-[#0a0908] hover:brightness-110 active:scale-[0.98] disabled:bg-white/5 disabled:text-gray-600 disabled:cursor-not-allowed disabled:active:scale-100 transition-all"
            >
              Reveal the definition
            </button>
          </div>
        ) : (
          <div className="flex flex-col flex-1">
            <div className="bg-white/5 border border-white/10 rounded-xl p-3 mb-3">
              <div className="text-[11px] font-mono uppercase tracking-widest text-gray-400 mb-1">You wrote</div>
              <p className="text-sm text-gray-300">{attempt}</p>
            </div>
            <div className="bg-accent/10 border border-accent/30 rounded-xl p-3">
              <div className="text-[11px] font-mono uppercase tracking-widest text-accent mb-1">Definition</div>
              <p className="text-sm text-white leading-relaxed">{DEFINITION}</p>
            </div>
            <button
              type="button"
              onClick={reset}
              className="mt-4 self-start flex items-center gap-1.5 text-xs text-gray-500 hover:text-accent transition-colors"
            >
              <RotateCcw className="w-3 h-3" aria-hidden="true" /> Try another word
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
