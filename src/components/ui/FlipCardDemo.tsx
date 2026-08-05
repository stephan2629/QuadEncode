'use client';

import { useState } from 'react';
import { RotateCw, Check } from 'lucide-react';
import { m } from 'framer-motion';

interface FlipCardDemoProps {
  kind: string;
  prompt: string;
  answer: string;
  options?: string[];
}

export default function FlipCardDemo({ kind, prompt, answer, options }: FlipCardDemoProps) {
  const [flipped, setFlipped] = useState(false);

  return (
    <div className="w-full max-w-[320px]" style={{ perspective: '1200px' }}>
      <m.button
        type="button"
        onClick={() => setFlipped((f) => !f)}
        aria-pressed={flipped}
        aria-label={flipped ? 'Showing the answer. Click to see the prompt again.' : 'Showing a prompt. Click to see the answer.'}
        className="relative w-full h-[180px] text-left cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-2xl block"
        style={{ transformStyle: 'preserve-3d' }}
        animate={{ rotateY: flipped ? 180 : 0 }}
        transition={{ rotateY: { duration: 0 } }}
      >
        <div 
          className="absolute inset-0 bg-[#14120f] border border-white/10 rounded-2xl p-6 flex flex-col justify-between"
          style={{ backfaceVisibility: 'hidden' }}
        >
          <span className="font-mono text-[10px] uppercase tracking-widest text-gray-500">{kind}</span>
          <p className="font-serif text-lg text-white leading-snug">{prompt}</p>
          <span className="flex items-center gap-1.5 text-xs text-gray-500">
            <RotateCw className="w-3 h-3" aria-hidden="true" /> Click to flip
          </span>
        </div>
        
        <div 
          className="absolute inset-0 bg-accent/10 border border-accent/25 rounded-2xl p-6 flex flex-col justify-between"
          style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
        >
          <span className="font-mono text-[10px] uppercase tracking-widest text-accent">Answer</span>
          {options ? (
            <ul className="space-y-1.5">
              {options.map((opt) => (
                <li
                  key={opt}
                  className={`flex items-center gap-1.5 text-sm rounded-md px-2 py-1 ${opt === answer ? 'text-accent font-semibold' : 'text-gray-400'}`}
                >
                  {opt === answer && <Check className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" />}
                  {opt}
                </li>
              ))}
            </ul>
          ) : (
            <p className="font-serif text-lg text-white leading-snug">{answer}</p>
          )}
          <span className="flex items-center gap-1.5 text-xs text-gray-500">
            <RotateCw className="w-3 h-3" aria-hidden="true" /> Click to flip back
          </span>
        </div>
      </m.button>
    </div>
  );
}
